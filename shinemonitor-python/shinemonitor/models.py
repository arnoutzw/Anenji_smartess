"""
Data models for the ShinEmonitor API using Pydantic v2.
"""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class APIResponse(BaseModel):
    """Generic API response model."""

    model_config = ConfigDict(extra="allow")

    err: int = Field(description="Error code (0 = success)")
    desc: str = Field(description="Error description")
    dat: Optional[dict[str, Any]] = Field(default=None, description="Response data")


class LoginResponse(BaseModel):
    """Login response model."""

    model_config = ConfigDict(extra="allow")

    uid: int = Field(description="User ID")
    token: str = Field(description="Authentication token")
    secret: str = Field(description="Signing secret")
    role: int = Field(description="User role")
    username: str = Field(description="Username/email")
    realname: Optional[str] = Field(default=None, description="Real name")
    phone: Optional[str] = Field(default=None, description="Phone number")
    company: Optional[str] = Field(default=None, description="Company name")
    companykeyid: Optional[int] = Field(default=None, description="Company key ID")


class DeviceInfo(BaseModel):
    """Device information model."""

    model_config = ConfigDict(extra="allow")

    pn: str = Field(description="Plant number")
    devcode: str = Field(description="Device code (e.g., SP, SP3, WM)")
    devaddr: str = Field(description="Device address")
    sn: str = Field(description="Device serial number")
    alias: Optional[str] = Field(default=None, description="Device alias")
    status: Optional[str] = Field(default=None, description="Device status")
    protocol: Optional[int] = Field(default=None, description="Protocol version")


class CollectorInfo(BaseModel):
    """Collector information model."""

    model_config = ConfigDict(extra="allow")

    pn: str = Field(description="Collector part number/serial")
    alias: Optional[str] = Field(default=None, description="Collector alias")
    status: Optional[str] = Field(default=None, description="Collector status")
    signal_strength: Optional[int] = Field(default=None, description="Signal strength (0-100)")
    ip_address: Optional[str] = Field(default=None, description="IP address")
    protocol: Optional[int] = Field(default=None, description="Protocol version")
    last_update: Optional[datetime] = Field(default=None, description="Last update time")


class PlantInfo(BaseModel):
    """Plant information model."""

    model_config = ConfigDict(extra="allow")

    plantid: int = Field(description="Plant ID")
    plantname: str = Field(description="Plant name")
    alias: Optional[str] = Field(default=None, description="Plant alias")
    location: Optional[str] = Field(default=None, description="Plant location")
    capacity: Optional[float] = Field(default=None, description="Total capacity (kW)")
    investors: Optional[str] = Field(default=None, description="Investors")
    status: Optional[str] = Field(default=None, description="Plant status")
    devices: Optional[list[DeviceInfo]] = Field(default=None, description="Devices in plant")
    collectors: Optional[list[CollectorInfo]] = Field(default=None, description="Collectors in plant")


class DeviceData(BaseModel):
    """Latest device data model."""

    model_config = ConfigDict(extra="allow")

    pn: str = Field(description="Plant number")
    devcode: str = Field(description="Device code")
    devaddr: str = Field(description="Device address")
    sn: str = Field(description="Serial number")
    timestamp: Optional[datetime] = Field(default=None, description="Data timestamp")
    datatime: Optional[str] = Field(default=None, description="Data time as string")
    values: dict[str, Any] = Field(default_factory=dict, description="Parameter values")


class ChartField(BaseModel):
    """Chart field information."""

    model_config = ConfigDict(extra="allow")

    id: str = Field(description="Field ID")
    name: str = Field(description="Field name")
    unit: Optional[str] = Field(default=None, description="Unit of measurement")
    decimal_places: Optional[int] = Field(default=None, description="Decimal places")
    color: Optional[str] = Field(default=None, description="Color for charts")
    chart_type: Optional[str] = Field(default=None, description="Chart type")


class DeviceParameter(BaseModel):
    """Device parameter/field information."""

    model_config = ConfigDict(extra="allow")

    id: str = Field(description="Parameter ID")
    name: str = Field(description="Parameter name")
    unit: Optional[str] = Field(default=None, description="Unit of measurement")
    value: Optional[Any] = Field(default=None, description="Current value")
    min_value: Optional[float] = Field(default=None, description="Minimum value")
    max_value: Optional[float] = Field(default=None, description="Maximum value")
    writable: bool = Field(default=False, description="Whether parameter is writable")
    read_only: bool = Field(default=True, description="Whether parameter is read-only")


class ControlField(BaseModel):
    """Device control field model."""

    model_config = ConfigDict(extra="allow")

    id: str = Field(description="Control field ID")
    name: str = Field(description="Control field name")
    type: str = Field(description="Control type (switch, slider, etc.)")
    current_value: Optional[Any] = Field(default=None, description="Current control value")
    min_value: Optional[float] = Field(default=None, description="Minimum value")
    max_value: Optional[float] = Field(default=None, description="Maximum value")
    step: Optional[float] = Field(default=None, description="Step value")
    options: Optional[list[str]] = Field(default=None, description="Available options")
    readable: bool = Field(default=True, description="Whether field is readable")
    writable: bool = Field(default=True, description="Whether field is writable")


class HistoricalData(BaseModel):
    """Historical device data for a specific parameter."""

    model_config = ConfigDict(extra="allow")

    pn: str = Field(description="Plant number")
    devcode: str = Field(description="Device code")
    devaddr: str = Field(description="Device address")
    sn: str = Field(description="Serial number")
    parameter: str = Field(description="Parameter name")
    date: str = Field(description="Date (YYYY-MM-DD)")
    data_points: list[dict[str, Any]] = Field(default_factory=list, description="Data points with timestamp and value")


class DeviceDataPage(BaseModel):
    """Paginated device data response."""

    model_config = ConfigDict(extra="allow")

    pn: str = Field(description="Plant number")
    devcode: str = Field(description="Device code")
    sn: str = Field(description="Serial number")
    devaddr: str = Field(description="Device address")
    total: int = Field(description="Total number of records")
    page: int = Field(description="Current page number")
    pagesize: int = Field(description="Page size")
    records: list[dict[str, Any]] = Field(default_factory=list, description="Data records")


class AccountInfo(BaseModel):
    """User account information model."""

    model_config = ConfigDict(extra="allow")

    uid: int = Field(description="User ID")
    username: str = Field(description="Username/email")
    realname: Optional[str] = Field(default=None, description="Real name")
    phone: Optional[str] = Field(default=None, description="Phone number")
    company: Optional[str] = Field(default=None, description="Company")
    role: int = Field(description="User role")
    status: Optional[str] = Field(default=None, description="Account status")
    created_at: Optional[datetime] = Field(default=None, description="Account creation time")
    last_login: Optional[datetime] = Field(default=None, description="Last login time")


class Currency(BaseModel):
    """Currency information."""

    model_config = ConfigDict(extra="allow")

    code: str = Field(description="Currency code (e.g., USD)")
    name: str = Field(description="Currency name")
    symbol: Optional[str] = Field(default=None, description="Currency symbol")


class Domain(BaseModel):
    """Domain information."""

    model_config = ConfigDict(extra="allow")

    id: int = Field(description="Domain ID")
    name: str = Field(description="Domain name")
    url: Optional[str] = Field(default=None, description="Domain URL")


class CollectorProtocol(BaseModel):
    """Collector protocol information."""

    model_config = ConfigDict(extra="allow")

    pn: str = Field(description="Collector part number")
    protocol_type: str = Field(description="Protocol type")
    protocol_version: Optional[str] = Field(default=None, description="Protocol version")
    supported_devices: Optional[list[str]] = Field(default=None, description="Supported device types")


class SessionState(BaseModel):
    """Session state information."""

    model_config = ConfigDict(extra="allow")

    uid: int = Field(description="User ID")
    token: str = Field(description="Authentication token")
    secret: str = Field(description="Signing secret")
    role: int = Field(description="User role")
    username: str = Field(description="Username/email")
    login_time: datetime = Field(description="Login timestamp")
    last_request_time: datetime = Field(description="Last request timestamp")
    is_authenticated: bool = Field(default=True, description="Authentication status")
