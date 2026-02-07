"""
Custom exceptions for the ShinEmonitor API client.
"""


class ShinemonitorException(Exception):
    """Base exception for all ShinEmonitor errors."""

    def __init__(self, message: str, error_code: int | None = None):
        """
        Initialize the exception.

        Args:
            message: The error message.
            error_code: The API error code (if applicable).
        """
        self.message = message
        self.error_code = error_code
        super().__init__(message)


class AuthenticationError(ShinemonitorException):
    """Raised when authentication fails."""

    pass


class LoginError(AuthenticationError):
    """Raised when login fails."""

    pass


class TokenExpiredError(AuthenticationError):
    """Raised when the authentication token has expired."""

    pass


class InvalidCredentialsError(AuthenticationError):
    """Raised when invalid credentials are provided."""

    pass


class APIError(ShinemonitorException):
    """Raised when the API returns an error."""

    pass


class NetworkError(ShinemonitorException):
    """Raised when a network error occurs."""

    pass


class TimeoutError(NetworkError):
    """Raised when a request times out."""

    pass


class ConnectionError(NetworkError):
    """Raised when a connection error occurs."""

    pass


class ValidationError(ShinemonitorException):
    """Raised when input validation fails."""

    pass


class DeviceNotFoundError(ShinemonitorException):
    """Raised when a device is not found."""

    pass


class PlantNotFoundError(ShinemonitorException):
    """Raised when a plant is not found."""

    pass


class ControlError(ShinemonitorException):
    """Raised when device control fails."""

    pass


class DataFormatError(ShinemonitorException):
    """Raised when the API response format is invalid."""

    pass


class NotImplementedError(ShinemonitorException):
    """Raised when a feature is not yet implemented."""

    pass
