"""
Main ShinEmonitor API client with async and sync support.
"""

import asyncio
import time
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, TypeVar, Callable
from functools import wraps
from contextlib import asynccontextmanager

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

from .const import (
    API_BASE_URL,
    API_FILE_URL,
    DEFAULT_LANG,
    DEFAULT_TIMEOUT,
    DEFAULT_RETRIES,
    DEFAULT_RETRY_DELAY,
    TOKEN_REFRESH_THRESHOLD,
    ACTION_LOGIN,
    ACTION_LOGOUT,
    ACTION_QUERY_PLANT_INFO,
    ACTION_QUERY_COLLECTOR_ADDRESS,
    ACTION_QUERY_COLLECTOR_DEVICES_STATUS,
    ACTION_QUERY_DEVICE_LAST_DATA,
    ACTION_QUERY_DEVICE_KEY_PARAMETERS,
    ACTION_QUERY_DEVICE_KEY_PARAMETER_ONE_DAY,
    ACTION_QUERY_DEVICE_CHART_FIELD,
    ACTION_QUERY_DEVICE_CHART_FIELDS_ES,
    ACTION_QUERY_DEVICE_DATA_ONE_DAY_PAGING,
    ACTION_QUERY_DEVICE_CTRL_VALUE,
    ACTION_CTRL_DEVICE,
    ACTION_WEB_QUERY_DEVICE_CTRL_FIELD,
    ACTION_SEND_CMD_TO_DEVICE,
    ACTION_EDIT_DEVICE_INFO,
    ACTION_DEL_DEVICE_FROM_PLANT,
    ACTION_QUERY_ACCOUNT_INFO,
    ACTION_QUERY_PLANT_CURRENCIES_ALL,
    ACTION_QUERY_DOMAIN_LIST_NOT_LOGIN,
    ACTION_GET_BIND_USER_BY_COLLECTOR_PN,
    ACTION_ADD_COLLECTOR_ES,
    ACTION_EDIT_COLLECTOR_ES,
    ACTION_QUERY_COLLECTOR_PROTOCOL,
    DEFAULT_PAGE_SIZE,
)
from .exceptions import (
    ShinemonitorException,
    AuthenticationError,
    LoginError,
    TokenExpiredError,
    APIError,
    NetworkError,
    TimeoutError as ShinemonitorTimeoutError,
    ConnectionError as ShinemonitorConnectionError,
    ValidationError,
    DataFormatError,
)
from .auth import RequestBuilder, validate_token_response
from .models import (
    APIResponse,
    LoginResponse,
    PlantInfo,
    DeviceData,
    ChartField,
    DeviceParameter,
    ControlField,
    HistoricalData,
    DeviceDataPage,
    AccountInfo,
    Currency,
    Domain,
    CollectorProtocol,
    SessionState,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")


def _ensure_httpx():
    """Ensure httpx is available."""
    if httpx is None:
        raise ImportError(
            "httpx is required for ShinemonitorClient. "
            "Install it with: pip install httpx"
        )


def _sync_wrapper(async_func: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator to run async functions synchronously."""

    @wraps(async_func)
    def wrapper(self: "ShinemonitorClient", *args: Any, **kwargs: Any) -> Any:
        """Run async function in event loop."""
        if not self._sync_loop:
            self._sync_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._sync_loop)
        try:
            return self._sync_loop.run_until_complete(async_func(self, *args, **kwargs))
        except Exception:
            raise

    return wrapper


class ShinemonitorClient:
    """
    Async HTTP client for ShinEmonitor solar inverter monitoring API.

    Supports both async/await and synchronous operations. Handles authentication,
    request signing, token management, and error handling.

    Example:
        >>> client = ShinemonitorClient()
        >>> await client.login("user@email.com", "password")
        >>> plants = await client.get_plants()
        >>> await client.close()
    """

    def __init__(
        self,
        base_url: str = API_BASE_URL,
        lang: str = DEFAULT_LANG,
        timeout: float = DEFAULT_TIMEOUT,
        retries: int = DEFAULT_RETRIES,
        retry_delay: float = DEFAULT_RETRY_DELAY,
    ):
        """
        Initialize the ShinEmonitor client.

        Args:
            base_url: API base URL (default: official ShinEmonitor API).
            lang: Language code for API responses (default: 'en').
            timeout: Request timeout in seconds (default: 30).
            retries: Number of retry attempts for failed requests (default: 3).
            retry_delay: Delay between retries in seconds (default: 1).
        """
        _ensure_httpx()

        self.base_url = base_url
        self.lang = lang
        self.timeout = timeout
        self.retries = retries
        self.retry_delay = retry_delay

        self._client: Optional[httpx.AsyncClient] = None
        self._request_builder = RequestBuilder(lang=lang)
        self._session_state: Optional[SessionState] = None
        self._sync_loop: Optional[asyncio.AbstractEventLoop] = None
        self._lock = asyncio.Lock()

    async def __aenter__(self) -> "ShinemonitorClient":
        """Async context manager entry."""
        await self.ensure_client()
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit."""
        await self.close()

    @asynccontextmanager
    async def _get_client(self) -> Any:
        """Get or create httpx async client."""
        await self.ensure_client()
        yield self._client

    async def ensure_client(self) -> None:
        """Ensure the HTTP client is initialized."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)

    async def close(self) -> None:
        """Close the HTTP client and logout if authenticated."""
        if self._session_state and self._session_state.is_authenticated:
            try:
                await self.logout()
            except Exception as e:
                logger.warning(f"Error during logout: {e}")

        if self._client:
            await self._client.aclose()
            self._client = None

    async def _make_request(
        self,
        action: str,
        method: str = "GET",
        **params: Any,
    ) -> dict[str, Any]:
        """
        Make an HTTP request to the API with retry logic.

        Args:
            action: The API action name.
            method: HTTP method (GET or POST).
            **params: Request parameters.

        Returns:
            Parsed JSON response data.

        Raises:
            Various exceptions based on error type.
        """
        await self.ensure_client()

        # Check if token needs refresh
        if self._session_state and self._session_state.is_authenticated:
            await self._check_and_refresh_token()

        # Build request parameters
        try:
            if action in [
                ACTION_LOGIN,
                ACTION_QUERY_DOMAIN_LIST_NOT_LOGIN,
                ACTION_QUERY_COLLECTOR_PROTOCOL,
            ]:
                # These actions don't need authentication
                if action == ACTION_LOGIN:
                    request_params = self._request_builder.build_login_params(
                        params.pop("usr", "")
                    )
                elif action == ACTION_QUERY_DOMAIN_LIST_NOT_LOGIN:
                    request_params = self._request_builder.build_domain_list_params()
                elif action == ACTION_QUERY_COLLECTOR_PROTOCOL:
                    request_params = self._request_builder.build_collector_protocol_params(
                        params.pop("pn", "")
                    )
                request_params.update(params)
            else:
                # All other actions require authentication
                request_params = self._request_builder.build_params(action, **params)
        except ValidationError as e:
            raise AuthenticationError(str(e))

        # Perform request with retries
        last_exception = None
        for attempt in range(self.retries):
            try:
                async with self._get_client() as client:
                    if method.upper() == "POST":
                        response = await client.post(
                            self.base_url,
                            data=request_params,
                        )
                    else:
                        response = await client.get(
                            self.base_url,
                            params=request_params,
                        )

                    response.raise_for_status()
                    data = response.json()
                    return self._parse_response(data)

            except httpx.TimeoutException as e:
                last_exception = e
                if attempt < self.retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
                    continue
                raise ShinemonitorTimeoutError(f"Request timeout after {self.retries} attempts") from e

            except httpx.ConnectError as e:
                last_exception = e
                if attempt < self.retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
                    continue
                raise ShinemonitorConnectionError(f"Connection error: {str(e)}") from e

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    raise TokenExpiredError("Authentication failed - token may have expired")
                raise APIError(f"HTTP {e.response.status_code}: {e.response.text}")

            except Exception as e:
                logger.error(f"Request failed on attempt {attempt + 1}: {str(e)}")
                last_exception = e
                if attempt < self.retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
                    continue
                raise NetworkError(f"Request failed: {str(e)}") from e

        # Should not reach here
        if last_exception:
            raise last_exception

    def _parse_response(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        Parse API response and handle errors.

        Args:
            data: Raw JSON response data.

        Returns:
            Response data if successful.

        Raises:
            APIError: If the API returned an error.
            DataFormatError: If response format is invalid.
        """
        try:
            response = APIResponse(**data)
        except Exception as e:
            raise DataFormatError(f"Invalid response format: {str(e)}")

        if response.err != 0:
            error_msg = response.desc or "Unknown error"
            raise APIError(error_msg, response.err)

        return response.dat or {}

    async def _check_and_refresh_token(self) -> None:
        """Check if token needs refresh and refresh if necessary."""
        if not self._session_state:
            return

        elapsed = (datetime.now() - self._session_state.last_request_time).total_seconds()
        if elapsed > TOKEN_REFRESH_THRESHOLD:
            logger.debug("Token refresh threshold reached, attempting to refresh...")
            # In a real scenario, you'd implement token refresh
            # For now, we just update the last request time
            self._session_state.last_request_time = datetime.now()

    async def login(self, email: str, password: str) -> LoginResponse:
        """
        Authenticate with the API using email and password.

        Args:
            email: User email address.
            password: User password.

        Returns:
            LoginResponse with token, secret, and user information.

        Raises:
            LoginError: If authentication fails.
            ValidationError: If email or password is empty.
        """
        if not email or not password:
            raise ValidationError("Email and password are required")

        try:
            # Build login parameters
            params = self._request_builder.build_login_params(email)
            params["pwd"] = password

            # Make login request
            async with self._get_client() as client:
                response = await client.post(self.base_url, data=params)
                response.raise_for_status()
                data = response.json()

            # Parse response
            response_data = self._parse_response(data)

            # Validate and extract token information
            token, secret, uid = validate_token_response(response_data)

            # Update request builder with credentials
            self._request_builder.update_credentials(token, secret)
            self._request_builder.uid = uid

            # Create session state
            login_response = LoginResponse(**response_data)
            self._session_state = SessionState(
                uid=uid,
                token=token,
                secret=secret,
                role=login_response.role,
                username=login_response.username,
                login_time=datetime.now(),
                last_request_time=datetime.now(),
                is_authenticated=True,
            )

            logger.info(f"Successfully logged in as {email}")
            return login_response

        except APIError as e:
            raise LoginError(f"Login failed: {e.message}", e.error_code)
        except Exception as e:
            raise LoginError(f"Login error: {str(e)}")

    async def logout(self) -> None:
        """
        Logout from the API.

        Raises:
            AuthenticationError: If not currently authenticated.
        """
        if not self._session_state or not self._session_state.is_authenticated:
            raise AuthenticationError("Not authenticated")

        try:
            await self._make_request(ACTION_LOGOUT)
            if self._session_state:
                self._session_state.is_authenticated = False
            logger.info("Successfully logged out")
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            if self._session_state:
                self._session_state.is_authenticated = False

    def is_authenticated(self) -> bool:
        """
        Check if currently authenticated.

        Returns:
            True if authenticated, False otherwise.
        """
        return (
            self._session_state is not None
            and self._session_state.is_authenticated
        )

    async def get_plants(self) -> list[PlantInfo]:
        """
        Get all plants accessible to the current user.

        Returns:
            List of plant information objects.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        try:
            # Get account info to get plant IDs
            account_data = await self._make_request(ACTION_QUERY_ACCOUNT_INFO)
            # This is a simplified version - in practice, you might get plants differently
            # For now, return empty list as the API response structure needs to be clarified
            logger.debug(f"Account data: {account_data}")
            return []
        except Exception as e:
            logger.error(f"Error getting plants: {str(e)}")
            raise

    async def get_plant_info(self, plantid: int) -> PlantInfo:
        """
        Get detailed information for a specific plant.

        Args:
            plantid: Plant ID.

        Returns:
            Plant information object.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
            ValidationError: If plantid is invalid.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        if not plantid or plantid <= 0:
            raise ValidationError("Plant ID must be a positive integer")

        try:
            data = await self._make_request(
                ACTION_QUERY_PLANT_INFO,
                plantid=plantid,
            )
            return PlantInfo(**data)
        except Exception as e:
            logger.error(f"Error getting plant info: {str(e)}")
            raise

    async def get_device_last_data(
        self,
        pn: str,
        devcode: str,
        devaddr: str,
        sn: str,
    ) -> DeviceData:
        """
        Get the latest data for a device.

        Args:
            pn: Plant number.
            devcode: Device code (e.g., 'SP', 'SP3').
            devaddr: Device address.
            sn: Device serial number.

        Returns:
            Latest device data.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
            ValidationError: If any required parameter is missing.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        if not all([pn, devcode, devaddr, sn]):
            raise ValidationError(
                "pn, devcode, devaddr, and sn are required"
            )

        try:
            data = await self._make_request(
                ACTION_QUERY_DEVICE_LAST_DATA,
                pn=pn,
                devcode=devcode,
                devaddr=devaddr,
                sn=sn,
            )
            return DeviceData(**data)
        except Exception as e:
            logger.error(f"Error getting device data: {str(e)}")
            raise

    async def get_device_key_parameters(
        self,
        devcode: str,
    ) -> list[DeviceParameter]:
        """
        Get key parameters for a device type.

        Args:
            devcode: Device code (e.g., 'SP', 'SP3').

        Returns:
            List of device parameters.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
            ValidationError: If devcode is empty.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        if not devcode:
            raise ValidationError("Device code is required")

        try:
            data = await self._make_request(
                ACTION_QUERY_DEVICE_KEY_PARAMETERS,
                devcode=devcode,
            )
            # Response is typically a list
            if isinstance(data, list):
                return [DeviceParameter(**item) for item in data]
            return []
        except Exception as e:
            logger.error(f"Error getting device parameters: {str(e)}")
            raise

    async def get_device_parameter_one_day(
        self,
        pn: str,
        devcode: str,
        devaddr: str,
        sn: str,
        parameter: str,
        date: str,
    ) -> HistoricalData:
        """
        Get historical data for a specific parameter for one day.

        Args:
            pn: Plant number.
            devcode: Device code.
            devaddr: Device address.
            sn: Device serial number.
            parameter: Parameter name.
            date: Date in YYYY-MM-DD format.

        Returns:
            Historical data for the parameter.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
            ValidationError: If any required parameter is missing.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        if not all([pn, devcode, devaddr, sn, parameter, date]):
            raise ValidationError(
                "pn, devcode, devaddr, sn, parameter, and date are required"
            )

        try:
            data = await self._make_request(
                ACTION_QUERY_DEVICE_KEY_PARAMETER_ONE_DAY,
                pn=pn,
                devcode=devcode,
                devaddr=devaddr,
                sn=sn,
                parameter=parameter,
                date=date,
            )
            return HistoricalData(
                pn=pn,
                devcode=devcode,
                devaddr=devaddr,
                sn=sn,
                parameter=parameter,
                date=date,
                data_points=data.get("data_points", []) or data.get("data", []),
            )
        except Exception as e:
            logger.error(f"Error getting historical data: {str(e)}")
            raise

    async def get_device_chart_fields(
        self,
        devcode: str,
    ) -> list[ChartField]:
        """
        Get chart fields for a device type.

        Args:
            devcode: Device code.

        Returns:
            List of chart fields.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
            ValidationError: If devcode is empty.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        if not devcode:
            raise ValidationError("Device code is required")

        try:
            data = await self._make_request(
                ACTION_QUERY_DEVICE_CHART_FIELD,
                devcode=devcode,
            )
            if isinstance(data, list):
                return [ChartField(**item) for item in data]
            return []
        except Exception as e:
            logger.error(f"Error getting chart fields: {str(e)}")
            raise

    async def get_device_data_paginated(
        self,
        pn: str,
        devcode: str,
        sn: str,
        devaddr: str,
        page: int = 1,
        pagesize: int = DEFAULT_PAGE_SIZE,
    ) -> DeviceDataPage:
        """
        Get paginated device data.

        Args:
            pn: Plant number.
            devcode: Device code.
            sn: Device serial number.
            devaddr: Device address.
            page: Page number (default: 1).
            pagesize: Page size (default: 100).

        Returns:
            Paginated device data.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
            ValidationError: If any required parameter is missing.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        if not all([pn, devcode, sn, devaddr]):
            raise ValidationError(
                "pn, devcode, sn, and devaddr are required"
            )

        if page < 1:
            raise ValidationError("Page must be >= 1")

        if pagesize < 1 or pagesize > 1000:
            raise ValidationError("Page size must be between 1 and 1000")

        try:
            data = await self._make_request(
                ACTION_QUERY_DEVICE_DATA_ONE_DAY_PAGING,
                pn=pn,
                devcode=devcode,
                sn=sn,
                devaddr=devaddr,
                page=page,
                pagesize=pagesize,
            )
            return DeviceDataPage(**data)
        except Exception as e:
            logger.error(f"Error getting paginated device data: {str(e)}")
            raise

    async def get_web_control_fields(
        self,
        pn: str,
        devcode: str,
        devaddr: str,
        sn: str,
    ) -> list[ControlField]:
        """
        Get web control fields for a device.

        Args:
            pn: Plant number.
            devcode: Device code.
            devaddr: Device address.
            sn: Device serial number.

        Returns:
            List of control fields.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
            ValidationError: If any required parameter is missing.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        if not all([pn, devcode, devaddr, sn]):
            raise ValidationError(
                "pn, devcode, devaddr, and sn are required"
            )

        try:
            data = await self._make_request(
                ACTION_WEB_QUERY_DEVICE_CTRL_FIELD,
                pn=pn,
                devcode=devcode,
                devaddr=devaddr,
                sn=sn,
            )
            if isinstance(data, list):
                return [ControlField(**item) for item in data]
            return []
        except Exception as e:
            logger.error(f"Error getting control fields: {str(e)}")
            raise

    async def get_control_value(
        self,
        pn: str,
        sn: str,
        devcode: str,
        devaddr: str,
        field_id: str,
    ) -> Any:
        """
        Get the current value of a control field.

        Args:
            pn: Plant number.
            sn: Device serial number.
            devcode: Device code.
            devaddr: Device address.
            field_id: Control field ID.

        Returns:
            Current control field value.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
            ValidationError: If any required parameter is missing.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        if not all([pn, sn, devcode, devaddr, field_id]):
            raise ValidationError(
                "pn, sn, devcode, devaddr, and field_id are required"
            )

        try:
            data = await self._make_request(
                ACTION_QUERY_DEVICE_CTRL_VALUE,
                pn=pn,
                sn=sn,
                devcode=devcode,
                devaddr=devaddr,
                id=field_id,
            )
            return data.get("value")
        except Exception as e:
            logger.error(f"Error getting control value: {str(e)}")
            raise

    async def control_device(
        self,
        pn: str,
        devcode: str,
        devaddr: str,
        sn: str,
        field_id: str,
        value: Any,
    ) -> bool:
        """
        Control a device by setting a control field value.

        Args:
            pn: Plant number.
            devcode: Device code.
            devaddr: Device address.
            sn: Device serial number.
            field_id: Control field ID.
            value: Value to set.

        Returns:
            True if successful.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
            ValidationError: If any required parameter is missing.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        if not all([pn, devcode, devaddr, sn, field_id]):
            raise ValidationError(
                "pn, devcode, devaddr, sn, and field_id are required"
            )

        try:
            await self._make_request(
                ACTION_CTRL_DEVICE,
                pn=pn,
                devcode=devcode,
                devaddr=devaddr,
                sn=sn,
                id=field_id,
                val=value,
            )
            logger.info(
                f"Device control successful: {devcode}/{sn} field {field_id} = {value}"
            )
            return True
        except Exception as e:
            logger.error(f"Error controlling device: {str(e)}")
            raise

    async def edit_device_alias(
        self,
        pn: str,
        devcode: str,
        devaddr: str,
        sn: str,
        alias: str,
    ) -> bool:
        """
        Edit the alias/name of a device.

        Args:
            pn: Plant number.
            devcode: Device code.
            devaddr: Device address.
            sn: Device serial number.
            alias: New device alias.

        Returns:
            True if successful.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
            ValidationError: If any required parameter is missing.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        if not all([pn, devcode, devaddr, sn, alias]):
            raise ValidationError(
                "pn, devcode, devaddr, sn, and alias are required"
            )

        try:
            await self._make_request(
                ACTION_EDIT_DEVICE_INFO,
                pn=pn,
                devcode=devcode,
                devaddr=devaddr,
                sn=sn,
                alias=alias,
            )
            logger.info(f"Device alias updated: {sn} -> {alias}")
            return True
        except Exception as e:
            logger.error(f"Error editing device alias: {str(e)}")
            raise

    async def get_account_info(self) -> AccountInfo:
        """
        Get current user account information.

        Returns:
            Account information.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        try:
            data = await self._make_request(ACTION_QUERY_ACCOUNT_INFO)
            return AccountInfo(**data)
        except Exception as e:
            logger.error(f"Error getting account info: {str(e)}")
            raise

    async def get_currencies(self) -> list[Currency]:
        """
        Get all supported currencies.

        Returns:
            List of currency information.

        Raises:
            AuthenticationError: If not authenticated.
            APIError: If the API request fails.
        """
        if not self.is_authenticated():
            raise AuthenticationError("Not authenticated. Please login first.")

        try:
            data = await self._make_request(ACTION_QUERY_PLANT_CURRENCIES_ALL)
            if isinstance(data, list):
                return [Currency(**item) for item in data]
            return []
        except Exception as e:
            logger.error(f"Error getting currencies: {str(e)}")
            raise

    async def get_domains(self) -> list[Domain]:
        """
        Get list of available domains (no authentication required).

        Returns:
            List of domain information.

        Raises:
            APIError: If the API request fails.
        """
        try:
            async with self._get_client() as client:
                params = self._request_builder.build_domain_list_params()
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()

            response_data = self._parse_response(data)
            if isinstance(response_data, list):
                return [Domain(**item) for item in response_data]
            return []
        except Exception as e:
            logger.error(f"Error getting domains: {str(e)}")
            raise

    async def get_collector_protocol(self, pn: str) -> CollectorProtocol:
        """
        Get collector protocol information.

        Args:
            pn: Collector part number.

        Returns:
            Collector protocol information.

        Raises:
            APIError: If the API request fails.
            ValidationError: If pn is empty.
        """
        if not pn:
            raise ValidationError("Part number (pn) is required")

        try:
            data = await self._make_request(
                ACTION_QUERY_COLLECTOR_PROTOCOL,
                pn=pn,
            )
            return CollectorProtocol(**data)
        except Exception as e:
            logger.error(f"Error getting collector protocol: {str(e)}")
            raise

    # Synchronous wrappers for async methods

    def login_sync(self, email: str, password: str) -> LoginResponse:
        """Synchronous version of login."""
        return _sync_wrapper(self.login)(self, email, password)

    def logout_sync(self) -> None:
        """Synchronous version of logout."""
        return _sync_wrapper(self.logout)(self)

    def get_plants_sync(self) -> list[PlantInfo]:
        """Synchronous version of get_plants."""
        return _sync_wrapper(self.get_plants)(self)

    def get_plant_info_sync(self, plantid: int) -> PlantInfo:
        """Synchronous version of get_plant_info."""
        return _sync_wrapper(self.get_plant_info)(self, plantid)

    def get_device_last_data_sync(
        self,
        pn: str,
        devcode: str,
        devaddr: str,
        sn: str,
    ) -> DeviceData:
        """Synchronous version of get_device_last_data."""
        return _sync_wrapper(self.get_device_last_data)(self, pn, devcode, devaddr, sn)

    def get_device_key_parameters_sync(self, devcode: str) -> list[DeviceParameter]:
        """Synchronous version of get_device_key_parameters."""
        return _sync_wrapper(self.get_device_key_parameters)(self, devcode)

    def get_device_parameter_one_day_sync(
        self,
        pn: str,
        devcode: str,
        devaddr: str,
        sn: str,
        parameter: str,
        date: str,
    ) -> HistoricalData:
        """Synchronous version of get_device_parameter_one_day."""
        return _sync_wrapper(self.get_device_parameter_one_day)(
            self, pn, devcode, devaddr, sn, parameter, date
        )

    def get_device_data_paginated_sync(
        self,
        pn: str,
        devcode: str,
        sn: str,
        devaddr: str,
        page: int = 1,
        pagesize: int = DEFAULT_PAGE_SIZE,
    ) -> DeviceDataPage:
        """Synchronous version of get_device_data_paginated."""
        return _sync_wrapper(self.get_device_data_paginated)(
            self, pn, devcode, sn, devaddr, page, pagesize
        )

    def control_device_sync(
        self,
        pn: str,
        devcode: str,
        devaddr: str,
        sn: str,
        field_id: str,
        value: Any,
    ) -> bool:
        """Synchronous version of control_device."""
        return _sync_wrapper(self.control_device)(
            self, pn, devcode, devaddr, sn, field_id, value
        )

    def get_account_info_sync(self) -> AccountInfo:
        """Synchronous version of get_account_info."""
        return _sync_wrapper(self.get_account_info)(self)

    def get_currencies_sync(self) -> list[Currency]:
        """Synchronous version of get_currencies."""
        return _sync_wrapper(self.get_currencies)(self)
