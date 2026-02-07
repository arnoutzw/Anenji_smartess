"""
Authentication and signing logic for the ShinEmonitor API.
"""

import hashlib
import time
from typing import Optional
from datetime import datetime

from .const import (
    DEFAULT_LANG,
    DEFAULT_SOURCE,
    APP_CLIENT,
    APP_ID,
    APP_VERSION,
    COMPANY_KEY,
)
from .exceptions import ValidationError


class AuthSignature:
    """Handles request signing for API authentication."""

    def __init__(self, token: str, secret: str):
        """
        Initialize the signature handler.

        Args:
            token: The authentication token from login response.
            secret: The signing secret from login response.
        """
        self.token = token
        self.secret = secret

    def generate_salt(self) -> str:
        """
        Generate a salt (current timestamp in milliseconds).

        Returns:
            Salt as a string representation of current time in milliseconds.
        """
        return str(int(time.time() * 1000))

    def calculate_sign(self, salt: str) -> str:
        """
        Calculate the SHA1 signature for a request.

        Args:
            salt: The salt (timestamp in milliseconds).

        Returns:
            The SHA1 signature as a lowercase hex string.
        """
        # sign = SHA1(salt + token + secret).hexdigest().lower()
        message = salt + self.token + self.secret
        return hashlib.sha1(message.encode()).hexdigest().lower()

    def get_auth_params(self) -> dict[str, str]:
        """
        Get authentication parameters for a request.

        Returns:
            Dictionary containing sign, salt, and token parameters.
        """
        salt = self.generate_salt()
        sign = self.calculate_sign(salt)
        return {
            "sign": sign,
            "salt": salt,
            "token": self.token,
        }


class RequestBuilder:
    """Builds and validates API requests with authentication."""

    def __init__(
        self,
        token: Optional[str] = None,
        secret: Optional[str] = None,
        lang: str = DEFAULT_LANG,
        uid: Optional[int] = None,
    ):
        """
        Initialize the request builder.

        Args:
            token: Authentication token.
            secret: Signing secret.
            lang: Language code (default: 'en').
            uid: User ID.
        """
        self.lang = lang
        self.uid = uid
        self.signature = AuthSignature(token or "", secret or "") if token and secret else None

    def update_credentials(self, token: str, secret: str) -> None:
        """
        Update authentication credentials.

        Args:
            token: New authentication token.
            secret: New signing secret.

        Raises:
            ValidationError: If token or secret is empty.
        """
        if not token or not secret:
            raise ValidationError("Token and secret cannot be empty")
        self.signature = AuthSignature(token, secret)

    def build_params(self, action: str, **kwargs) -> dict[str, str]:
        """
        Build complete request parameters with authentication.

        Args:
            action: The API action name.
            **kwargs: Additional parameters for the action.

        Returns:
            Dictionary of all request parameters.

        Raises:
            ValidationError: If not authenticated or invalid parameters.
        """
        if not self.signature:
            raise ValidationError("Not authenticated. Please login first.")

        if not action:
            raise ValidationError("Action is required")

        # Get authentication parameters
        auth_params = self.signature.get_auth_params()

        # Build base parameters
        params = {
            "action": action,
            "sign": auth_params["sign"],
            "salt": auth_params["salt"],
            "token": auth_params["token"],
            "i18n": self.lang,
            "lang": self.lang,
            "source": DEFAULT_SOURCE,
            "_app_client_": APP_CLIENT,
            "_app_id_": APP_ID,
            "_app_version_": APP_VERSION,
        }

        # Add action-specific parameters
        for key, value in kwargs.items():
            if value is not None:
                # Convert values to strings
                if isinstance(value, bool):
                    params[key] = "true" if value else "false"
                elif isinstance(value, (list, tuple)):
                    params[key] = ",".join(str(v) for v in value)
                else:
                    params[key] = str(value)

        return params

    def build_login_params(self, email: str, company_key: str = COMPANY_KEY) -> dict[str, str]:
        """
        Build login request parameters (no authentication needed).

        Args:
            email: User email address.
            company_key: Company key (default: hardcoded value).

        Returns:
            Dictionary of login request parameters.

        Raises:
            ValidationError: If email is empty.
        """
        if not email:
            raise ValidationError("Email is required for login")

        return {
            "action": "authSource",
            "usr": email,
            "company-key": company_key,
            "source": DEFAULT_SOURCE,
            "i18n": self.lang,
            "lang": self.lang,
            "_app_client_": APP_CLIENT,
            "_app_id_": APP_ID,
            "_app_version_": APP_VERSION,
        }

    def build_domain_list_params(self) -> dict[str, str]:
        """
        Build domain list request parameters (no authentication needed).

        Returns:
            Dictionary of domain list request parameters.
        """
        return {
            "action": "queryDomainListNotLogin",
            "source": DEFAULT_SOURCE,
            "i18n": self.lang,
            "lang": self.lang,
            "_app_client_": APP_CLIENT,
            "_app_id_": APP_ID,
            "_app_version_": APP_VERSION,
        }

    def build_collector_protocol_params(
        self, pn: str, company_key: str = COMPANY_KEY
    ) -> dict[str, str]:
        """
        Build collector protocol request parameters (no authentication needed).

        Args:
            pn: Collector part number.
            company_key: Company key (default: hardcoded value).

        Returns:
            Dictionary of request parameters.

        Raises:
            ValidationError: If pn is empty.
        """
        if not pn:
            raise ValidationError("Part number (pn) is required")

        return {
            "action": "queryCollectorProtocol",
            "company-key": company_key,
            "source": DEFAULT_SOURCE,
            "pn": pn,
            "i18n": self.lang,
            "lang": self.lang,
            "_app_client_": APP_CLIENT,
            "_app_id_": APP_ID,
            "_app_version_": APP_VERSION,
        }


def validate_token_response(data: dict) -> tuple[str, str, int]:
    """
    Validate and extract token information from login response.

    Args:
        data: The response data dictionary.

    Returns:
        Tuple of (token, secret, uid).

    Raises:
        ValidationError: If required fields are missing.
    """
    required_fields = ["token", "secret", "uid"]
    missing_fields = [f for f in required_fields if f not in data]

    if missing_fields:
        raise ValidationError(f"Missing required fields in login response: {missing_fields}")

    token = str(data.get("token", ""))
    secret = str(data.get("secret", ""))
    uid = int(data.get("uid", 0))

    if not token or not secret or not uid:
        raise ValidationError("Invalid token, secret, or uid in login response")

    return token, secret, uid
