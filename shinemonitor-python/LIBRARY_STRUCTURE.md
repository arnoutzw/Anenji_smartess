# ShinEmonitor Python Library - Complete Structure

## Directory Structure

```
shinemonitor-python/
├── shinemonitor/                    # Main package
│   ├── __init__.py                  # Package exports (112 lines)
│   ├── client.py                    # Main ShinemonitorClient class (1086 lines)
│   ├── auth.py                      # Authentication & signing logic (266 lines)
│   ├── models.py                    # Pydantic v2 data models (227 lines)
│   ├── exceptions.py                # Custom exceptions (103 lines)
│   └── const.py                     # Constants and configuration (79 lines)
├── examples/
│   └── basic_usage.py               # Usage examples (452 lines)
├── setup.py                         # pip installable configuration
├── pyproject.toml                   # Modern Python packaging (PEP 517/518)
├── requirements.txt                 # Core dependencies
├── README.md                        # Complete documentation
└── LIBRARY_STRUCTURE.md            # This file

Total Python Code: ~1873 lines
```

## File Descriptions

### Core Package Files

#### `shinemonitor/__init__.py` (112 lines)
- Package initialization and exports
- Exports all public classes, functions, and constants
- Version information

#### `shinemonitor/client.py` (1086 lines)
**Main ShinemonitorClient class** - the primary entry point for users
- Async HTTP client built on httpx
- Complete async API with sync wrappers
- Methods for:
  - Authentication (login/logout)
  - Plant information retrieval
  - Device data querying
  - Device control operations
  - Historical data retrieval
  - Account management
- Features:
  - Automatic request signing
  - Token management
  - Retry logic with exponential backoff
  - Comprehensive error handling
  - Full type hints and docstrings
  - Context manager support
  - Session state tracking

#### `shinemonitor/auth.py` (266 lines)
- AuthSignature class: SHA1 signature generation
- RequestBuilder class: Request parameter construction and validation
- Authentication parameter helpers
- Token response validation
- Login parameter builders

#### `shinemonitor/models.py` (227 lines)
**Pydantic v2 data models** for all API responses and data structures
- APIResponse: Generic API response envelope
- LoginResponse: Login credentials and user info
- PlantInfo: Plant details with devices
- DeviceInfo: Device information
- CollectorInfo: Collector/gateway information
- DeviceData: Latest device sensor values
- ChartField: Chart field definitions
- DeviceParameter: Device parameter specifications
- ControlField: Device control field definitions
- HistoricalData: Time-series data
- DeviceDataPage: Paginated device data
- AccountInfo: User account information
- Currency: Currency definitions
- Domain: API domain information
- CollectorProtocol: Collector protocol specs
- SessionState: Client session tracking

#### `shinemonitor/exceptions.py` (103 lines)
**Custom exception hierarchy** for error handling
- ShinemonitorException (base)
- AuthenticationError
- LoginError
- TokenExpiredError
- InvalidCredentialsError
- APIError
- NetworkError
- TimeoutError
- ConnectionError
- ValidationError
- DeviceNotFoundError
- PlantNotFoundError
- ControlError
- DataFormatError
- NotImplementedError

#### `shinemonitor/const.py` (79 lines)
**Constants and configuration**
- API URLs and endpoints
- Request parameters and defaults
- API action names
- Device codes (SP, SP3, WM, BC, EMS)
- User roles
- HTTP configuration (timeouts, retries)
- Field IDs for controls
- Pagination defaults

### Examples

#### `examples/basic_usage.py` (452 lines)
**Comprehensive usage examples** demonstrating:

Async Examples:
- `example_async_login()` - Login and account info
- `example_async_get_device_data()` - Latest device readings
- `example_async_historical_data()` - One-day historical data
- `example_async_device_control()` - Device control operations
- `example_async_paginated_data()` - Pagination handling
- `example_async_context_manager()` - Using context managers
- `example_async_multiple_devices()` - Parallel queries with asyncio.gather()

Sync Examples:
- `example_sync_login()` - Synchronous login
- `example_sync_device_data()` - Synchronous data retrieval
- `example_sync_control_device()` - Synchronous device control

### Package Configuration

#### `setup.py`
- Traditional setuptools configuration
- Package metadata and dependencies
- Development dependencies
- Entry points and scripts

#### `pyproject.toml`
- Modern Python packaging (PEP 517/518)
- Build system configuration
- Tool configuration (black, isort, mypy, pytest)
- Package metadata and dependencies
- Optional development extras

#### `requirements.txt`
- Core dependencies:
  - httpx>=0.24.0
  - pydantic>=2.0

#### `README.md`
- Complete library documentation
- Installation instructions
- Quick start guide
- API reference
- Error handling guide
- Configuration options
- Performance tips
- Testing instructions
- Logging guide

## Implementation Details

### API Coverage

Implemented API actions:
- authSource (login)
- logoutVerifiction (logout)
- queryPlantInfo (plant information)
- queryCollectorAddressEs (collector address)
- queryCollectorDevicesStatus (collector device status)
- querySPDeviceLastData (latest device data)
- querySPKeyParameters (device parameters)
- querySPDeviceKeyParameterOneDay (one-day parameter history)
- queryDeviceChartField (chart fields)
- queryDeviceChartsFieldsEs (ES chart fields)
- queryDeviceDataOneDayPaging (paginated device data)
- queryDeviceCtrlValue (control field value)
- ctrlDevice (set control field)
- webQueryDeviceCtrlField (web control fields)
- queryAccountInfo (account information)
- queryPlantCurrenciesAll (currencies)
- queryDomainListNotLogin (domains - no auth required)
- getBindUserByCollectorPn (bound users)
- queryCollectorProtocol (collector protocol)

### Authentication Implementation

- SHA1 signature generation: `SHA1(salt + token + secret)`
- Salt generated as current timestamp in milliseconds
- Automatic signing on every request
- Token storage and session management
- Token refresh threshold monitoring

### Error Handling

- Specific exceptions for different error types
- API error code tracking
- Network error detection
- Timeout handling with retries
- Validation of input parameters
- Response format validation

### Design Patterns

1. **Async-First**: Built on async/await with sync wrappers
2. **Type Hints**: Full type annotations for IDE support
3. **Pydantic Validation**: Strong data validation
4. **Retry Logic**: Exponential backoff for resilience
5. **Context Manager**: Resource cleanup with `async with`
6. **Logging**: Comprehensive debug logging
7. **Session Management**: Automatic token tracking

## Performance Characteristics

- Async operations for concurrent requests
- Connection pooling via httpx
- Pagination support for large datasets
- Parallel query support via asyncio.gather()
- Configurable timeouts and retries

## Compatibility

- Python 3.8+
- No third-party C extensions (pure Python)
- Cross-platform (Windows, macOS, Linux)
- Type-checked with mypy

## Testing Infrastructure

Supports:
- pytest for unit and integration tests
- pytest-asyncio for async test support
- pytest-cov for coverage reporting
- mypy for type checking
- black/isort for code formatting
- flake8 for linting

## Security Considerations

- No hardcoded credentials
- Secure token storage in session state
- Password passed only to API
- HTTPS support via httpx
- Request signing prevents tampering
- Proper error messages without exposing internals

## Future Enhancements

- Token refresh mechanism
- Request caching layer
- Batch operation support
- WebSocket support for real-time data
- Additional device types
- Event-driven monitoring
- Data export formats (CSV, JSON)
