"""
ShinEmonitor Python Client Library.

A complete Python library for interacting with the ShinEmonitor/Eybond
solar inverter monitoring API. Supports both async and sync operations.

Example:
    >>> from shinemonitor import ShinemonitorClient
    >>> client = ShinemonitorClient()
    >>> await client.login("user@email.com", "password")
    >>> plants = await client.get_plants()
    >>> await client.close()
"""

from .client import ShinemonitorClient
from .models import (
    APIResponse,
    LoginResponse,
    PlantInfo,
    DeviceInfo,
    CollectorInfo,
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
from .exceptions import (
    ShinemonitorException,
    AuthenticationError,
    LoginError,
    TokenExpiredError,
    InvalidCredentialsError,
    APIError,
    NetworkError,
    TimeoutError,
    ConnectionError,
    ValidationError,
    DeviceNotFoundError,
    PlantNotFoundError,
    ControlError,
    DataFormatError,
    NotImplementedError,
)
from .const import (
    API_BASE_URL,
    API_FILE_URL,
    DEFAULT_LANG,
    DEFAULT_TIMEOUT,
    UserRole,
    DEVICE_CODE_INVERTER,
    DEVICE_CODE_INVERTER_3PHASE,
    DEVICE_CODE_METER,
    DEVICE_CODE_BATTERY,
    DEVICE_CODE_EMS,
)

__version__ = "1.0.0"
__author__ = "ShinEmonitor Python Library"
__all__ = [
    "ShinemonitorClient",
    # Models
    "APIResponse",
    "LoginResponse",
    "PlantInfo",
    "DeviceInfo",
    "CollectorInfo",
    "DeviceData",
    "ChartField",
    "DeviceParameter",
    "ControlField",
    "HistoricalData",
    "DeviceDataPage",
    "AccountInfo",
    "Currency",
    "Domain",
    "CollectorProtocol",
    "SessionState",
    # Exceptions
    "ShinemonitorException",
    "AuthenticationError",
    "LoginError",
    "TokenExpiredError",
    "InvalidCredentialsError",
    "APIError",
    "NetworkError",
    "TimeoutError",
    "ConnectionError",
    "ValidationError",
    "DeviceNotFoundError",
    "PlantNotFoundError",
    "ControlError",
    "DataFormatError",
    "NotImplementedError",
    # Constants
    "API_BASE_URL",
    "API_FILE_URL",
    "DEFAULT_LANG",
    "DEFAULT_TIMEOUT",
    "UserRole",
    "DEVICE_CODE_INVERTER",
    "DEVICE_CODE_INVERTER_3PHASE",
    "DEVICE_CODE_METER",
    "DEVICE_CODE_BATTERY",
    "DEVICE_CODE_EMS",
]
