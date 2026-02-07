# ShinEmonitor Python Library

A complete, production-quality Python library for interacting with the ShinEmonitor/Eybond solar inverter monitoring API. Provides full async/await support with sync wrappers, comprehensive error handling, and type hints throughout.

## Features

- **Async-First Design**: Built on `httpx` for high-performance async operations
- **Synchronous Wrappers**: Easy sync API for simple use cases
- **Type Hints**: Full type annotations for IDE support and type checking
- **Pydantic Models**: Strong data validation using Pydantic v2
- **Comprehensive Error Handling**: Custom exceptions for different error types
- **Automatic Request Signing**: SHA1-based authentication handled automatically
- **Token Management**: Session management with token refresh support
- **Retry Logic**: Automatic retry with exponential backoff for failed requests
- **Production Ready**: Proper logging, error handling, and edge cases covered

## Installation

### Using pip

```bash
pip install shinemonitor-python
```

### From Source

```bash
git clone https://github.com/yourusername/shinemonitor-python.git
cd shinemonitor-python
pip install -e .
```

### Development Installation

```bash
pip install -e ".[dev]"
```

## Dependencies

- Python 3.8+
- `httpx>=0.24.0` - Async HTTP client
- `pydantic>=2.0` - Data validation

## Quick Start

### Async Usage (Recommended)

```python
import asyncio
from shinemonitor import ShinemonitorClient

async def main():
    client = ShinemonitorClient()

    try:
        # Login to the API
        login_response = await client.login("user@email.com", "password")
        print(f"Logged in as: {login_response.username}")

        # Get all plants
        plants = await client.get_plants()
        print(f"Found {len(plants)} plants")

        # Get specific plant info
        plant_info = await client.get_plant_info(plantid=12345)
        print(f"Plant: {plant_info.plantname}")

        # Get latest device data
        device_data = await client.get_device_last_data(
            pn="PLANT001",
            devcode="SP",  # Single-phase inverter
            devaddr="1",
            sn="DEVICE12345"
        )
        print(f"Device power: {device_data.values.get('power', 'N/A')} W")

        # Get historical data for one day
        history = await client.get_device_parameter_one_day(
            pn="PLANT001",
            devcode="SP",
            devaddr="1",
            sn="DEVICE12345",
            parameter="power",
            date="2024-01-15"
        )
        print(f"Retrieved {len(history.data_points)} data points")

        # Control a device
        success = await client.control_device(
            pn="PLANT001",
            devcode="SP",
            devaddr="1",
            sn="DEVICE12345",
            field_id="1",
            value="1"
        )
        print(f"Control result: {success}")

    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(main())
```

### Synchronous Usage

```python
from shinemonitor import ShinemonitorClient

def main():
    client = ShinemonitorClient()

    try:
        # Login
        login_response = client.login_sync("user@email.com", "password")
        print(f"Logged in as: {login_response.username}")

        # Get device data
        device_data = client.get_device_last_data_sync(
            pn="PLANT001",
            devcode="SP",
            devaddr="1",
            sn="DEVICE12345"
        )
        print(f"Device power: {device_data.values}")

        # Control device
        success = client.control_device_sync(
            pn="PLANT001",
            devcode="SP",
            devaddr="1",
            sn="DEVICE12345",
            field_id="1",
            value="1"
        )

    finally:
        client.logout_sync()

if __name__ == "__main__":
    main()
```

### Context Manager Usage

```python
import asyncio
from shinemonitor import ShinemonitorClient

async def main():
    async with ShinemonitorClient() as client:
        await client.login("user@email.com", "password")

        # Use client...
        account = await client.get_account_info()
        print(f"Account: {account.username}")

        # Automatically logged out and cleaned up on exit

if __name__ == "__main__":
    asyncio.run(main())
```

## API Methods

### Authentication

```python
# Login
await client.login(email, password)

# Logout
await client.logout()

# Check authentication status
is_auth = client.is_authenticated()
```

### Plant Information

```python
# Get all plants
plants = await client.get_plants()

# Get specific plant info
plant = await client.get_plant_info(plantid)
```

### Device Data

```python
# Get latest device data
data = await client.get_device_last_data(
    pn="PLANT001",
    devcode="SP",
    devaddr="1",
    sn="DEVICE12345"
)

# Get historical data for one day
history = await client.get_device_parameter_one_day(
    pn="PLANT001",
    devcode="SP",
    devaddr="1",
    sn="DEVICE12345",
    parameter="power",
    date="2024-01-15"
)

# Get paginated device data
page_data = await client.get_device_data_paginated(
    pn="PLANT001",
    devcode="SP",
    sn="DEVICE12345",
    devaddr="1",
    page=1,
    pagesize=100
)
```

### Device Parameters

```python
# Get key parameters for device type
params = await client.get_device_key_parameters(devcode="SP")

# Get chart fields for device
fields = await client.get_device_chart_fields(devcode="SP")
```

### Device Control

```python
# Get control fields
fields = await client.get_web_control_fields(
    pn="PLANT001",
    devcode="SP",
    devaddr="1",
    sn="DEVICE12345"
)

# Get control field value
value = await client.get_control_value(
    pn="PLANT001",
    sn="DEVICE12345",
    devcode="SP",
    devaddr="1",
    field_id="1"
)

# Set control field value
success = await client.control_device(
    pn="PLANT001",
    devcode="SP",
    devaddr="1",
    sn="DEVICE12345",
    field_id="1",
    value="1"
)

# Edit device alias
success = await client.edit_device_alias(
    pn="PLANT001",
    devcode="SP",
    devaddr="1",
    sn="DEVICE12345",
    alias="My Inverter"
)
```

### Account Information

```python
# Get account info
account = await client.get_account_info()

# Get all currencies
currencies = await client.get_currencies()

# Get available domains
domains = await client.get_domains()
```

## Device Codes

Common device codes used in API calls:

- `SP` - Single-phase inverter
- `SP3` - Three-phase inverter
- `WM` - Wireless meter
- `BC` - Battery controller
- `EMS` - Energy management system

Example:
```python
from shinemonitor import DEVICE_CODE_INVERTER, DEVICE_CODE_BATTERY

await client.get_device_last_data(
    pn="PLANT001",
    devcode=DEVICE_CODE_INVERTER,  # "SP"
    devaddr="1",
    sn="DEVICE12345"
)
```

## Exception Handling

```python
from shinemonitor import (
    ShinemonitorClient,
    LoginError,
    AuthenticationError,
    APIError,
    ValidationError,
    TimeoutError,
)

client = ShinemonitorClient()

try:
    await client.login("user@email.com", "password")
except LoginError as e:
    print(f"Login failed: {e.message}")
except ValidationError as e:
    print(f"Invalid input: {e.message}")

try:
    data = await client.get_device_last_data(...)
except AuthenticationError as e:
    print(f"Not authenticated: {e.message}")
except APIError as e:
    print(f"API error ({e.error_code}): {e.message}")
except TimeoutError as e:
    print(f"Request timed out: {e.message}")
```

## Configuration

### Custom API Endpoint

```python
client = ShinemonitorClient(
    base_url="https://api.custom-domain.com/public/"
)
```

### Request Timeout

```python
client = ShinemonitorClient(
    timeout=60,  # 60 second timeout
)
```

### Retry Configuration

```python
client = ShinemonitorClient(
    retries=5,        # 5 retry attempts
    retry_delay=2.0,  # 2 second initial delay
)
```

### Language

```python
client = ShinemonitorClient(
    lang="zh"  # Chinese language
)
```

## Logging

Enable logging to debug API interactions:

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("shinemonitor")
```

## Authentication Details

The library handles all authentication details automatically:

1. **Request Signing**: SHA1-based signature calculated as `SHA1(salt + token + secret)`
2. **Salt Generation**: Current timestamp in milliseconds
3. **Token Management**: Tokens are stored and automatically included in requests
4. **Session State**: Tracks login time, last request time, and authentication status

No manual signing or token management is required.

## Type Hints

All public methods include full type hints for IDE support:

```python
# IDE autocomplete and type checking
await client.login("user@email.com", "password")  # Type: LoginResponse

plants: list[PlantInfo] = await client.get_plants()

device_data: DeviceData = await client.get_device_last_data(...)
```

## Error Handling Strategy

The library provides specific exceptions for different error scenarios:

- **AuthenticationError**: Not authenticated or token expired
- **LoginError**: Login failed with invalid credentials
- **APIError**: API returned an error response
- **ValidationError**: Invalid input parameters
- **TimeoutError**: Request timed out
- **ConnectionError**: Network connection error
- **DataFormatError**: Invalid response format

Always use try/except blocks and handle specific exceptions.

## Performance Tips

1. **Reuse Client**: Create one client instance and reuse it for multiple requests
2. **Async Operations**: Use async/await for better performance in concurrent scenarios
3. **Batch Requests**: Retrieve data for multiple devices in parallel using asyncio.gather()
4. **Pagination**: Use paginated endpoints for large datasets

Example:
```python
import asyncio

async def get_all_devices_data(client, plants):
    tasks = []
    for plant in plants:
        for device in plant.devices:
            task = client.get_device_last_data(
                pn=device.pn,
                devcode=device.devcode,
                devaddr=device.devaddr,
                sn=device.sn
            )
            tasks.append(task)

    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

## Testing

Run the test suite:

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# With coverage
pytest --cov=shinemonitor

# Run specific test
pytest tests/test_client.py::TestLogin
```

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues, questions, or suggestions:

- GitHub Issues: https://github.com/yourusername/shinemonitor-python/issues
- Documentation: [Project Wiki]

## Changelog

### Version 1.0.0 (2024-01-15)

- Initial release
- Complete API coverage for ShinEmonitor v3.43.0.1
- Full async/sync support
- Comprehensive error handling
- Type hints throughout
- Pydantic v2 models
- Automatic request signing
- Token management
- Retry logic with exponential backoff

## Disclaimer

This library is an independent implementation based on reverse-engineered API documentation. It is not officially affiliated with or endorsed by ShinEmonitor or Eybond. Use at your own risk and in accordance with their terms of service.
