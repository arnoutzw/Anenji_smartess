"""
Constants and configuration for the ShinEmonitor API client.
"""

# API Configuration
API_BASE_URL = "http://android.shinemonitor.com/public/"
API_FILE_URL = "http://img.shinemonitor.com/file/"

# Request parameters
DEFAULT_LANG = "en"
DEFAULT_SOURCE = "android"
APP_CLIENT = "android"
APP_ID = "com.eybond.smartclient.ess"
APP_VERSION = "3.43.0.1"
COMPANY_KEY = "bnrl_frRFjEz8Mkn"

# API Actions
ACTION_LOGIN = "authSource"
ACTION_LOGOUT = "logoutVerifiction"
ACTION_QUERY_PLANT_INFO = "queryPlantInfo"
ACTION_QUERY_COLLECTOR_ADDRESS = "queryCollectorAddressEs"
ACTION_QUERY_COLLECTOR_DEVICES_STATUS = "queryCollectorDevicesStatus"
ACTION_QUERY_DEVICE_LAST_DATA = "querySPDeviceLastData"
ACTION_QUERY_DEVICE_KEY_PARAMETERS = "querySPKeyParameters"
ACTION_QUERY_DEVICE_KEY_PARAMETER_ONE_DAY = "querySPDeviceKeyParameterOneDay"
ACTION_QUERY_DEVICE_CHART_FIELD = "queryDeviceChartField"
ACTION_QUERY_DEVICE_CHART_FIELDS_ES = "queryDeviceChartsFieldsEs"
ACTION_QUERY_DEVICE_DATA_ONE_DAY_PAGING = "queryDeviceDataOneDayPaging"
ACTION_QUERY_DEVICE_CTRL_VALUE = "queryDeviceCtrlValue"
ACTION_CTRL_DEVICE = "ctrlDevice"
ACTION_WEB_QUERY_DEVICE_CTRL_FIELD = "webQueryDeviceCtrlField"
ACTION_SEND_CMD_TO_DEVICE = "sendCmdToDevice"
ACTION_EDIT_DEVICE_INFO = "editDeviceInfo"
ACTION_DEL_DEVICE_FROM_PLANT = "delDeviceFromPlant"
ACTION_QUERY_ACCOUNT_INFO = "queryAccountInfo"
ACTION_QUERY_PLANT_CURRENCIES_ALL = "queryPlantCurrenciesAll"
ACTION_QUERY_DOMAIN_LIST_NOT_LOGIN = "queryDomainListNotLogin"
ACTION_GET_BIND_USER_BY_COLLECTOR_PN = "getBindUserByCollectorPn"
ACTION_ADD_COLLECTOR_ES = "addCollectorEs"
ACTION_EDIT_COLLECTOR_ES = "editCollectorEs"
ACTION_QUERY_COLLECTOR_PROTOCOL = "queryCollectorProtocol"

# User Roles
class UserRole:
    """User role constants."""
    OWNER = 0
    VENDOR_LEVEL_1 = 1
    VENDOR = 2
    GROUP = 3
    BROWSER = 5
    VENDOR_ADMIN = 15

# HTTP Configuration
DEFAULT_TIMEOUT = 30
DEFAULT_RETRIES = 3
DEFAULT_RETRY_DELAY = 1  # seconds

# Device codes (common types)
DEVICE_CODE_INVERTER = "SP"  # Single phase
DEVICE_CODE_INVERTER_3PHASE = "SP3"  # Three phase
DEVICE_CODE_METER = "WM"  # Wireless meter
DEVICE_CODE_BATTERY = "BC"  # Battery controller
DEVICE_CODE_EMS = "EMS"  # Energy management system

# Common field IDs for control
FIELD_ID_POWER_ON_OFF = "1"
FIELD_ID_GRID_CONNECT = "2"
FIELD_ID_BATTERY_CHARGE = "3"

# Date format
DATE_FORMAT = "%Y-%m-%d"
DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"

# Pagination defaults
DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 1000

# Token refresh threshold (seconds before expiry)
TOKEN_REFRESH_THRESHOLD = 300
