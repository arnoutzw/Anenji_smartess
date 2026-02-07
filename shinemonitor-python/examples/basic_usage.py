"""
Basic usage examples for the ShinEmonitor Python library.

This file demonstrates common operations with both async and sync APIs.
"""

import asyncio
import logging
from datetime import datetime, timedelta

from shinemonitor import (
    ShinemonitorClient,
    LoginError,
    AuthenticationError,
    APIError,
    ValidationError,
    DEVICE_CODE_INVERTER,
    DEVICE_CODE_BATTERY,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ============================================================================
# Async Examples
# ============================================================================


async def example_async_login():
    """Example: Login and retrieve account information."""
    logger.info("=== Async Login Example ===")

    client = ShinemonitorClient()

    try:
        # Login
        login_response = await client.login("user@example.com", "password")
        logger.info(f"Successfully logged in as: {login_response.username}")
        logger.info(f"User role: {login_response.role}")

        # Get account info
        account = await client.get_account_info()
        logger.info(f"Account name: {account.realname}")
        logger.info(f"Company: {account.company}")

    except LoginError as e:
        logger.error(f"Login failed: {e.message}")
    except AuthenticationError as e:
        logger.error(f"Authentication error: {e.message}")
    finally:
        await client.close()


async def example_async_get_device_data():
    """Example: Retrieve latest device data."""
    logger.info("=== Async Get Device Data Example ===")

    client = ShinemonitorClient()

    try:
        await client.login("user@example.com", "password")

        # Get latest device data
        device_data = await client.get_device_last_data(
            pn="PLANT001",
            devcode=DEVICE_CODE_INVERTER,  # Single-phase inverter
            devaddr="1",
            sn="INV12345678",
        )

        logger.info(f"Device serial: {device_data.sn}")
        logger.info(f"Device timestamp: {device_data.timestamp}")
        logger.info(f"Device values: {device_data.values}")

        # Extract specific values
        power = device_data.values.get("power", "N/A")
        energy = device_data.values.get("energy", "N/A")
        logger.info(f"Current power: {power} W")
        logger.info(f"Total energy: {energy} kWh")

    except AuthenticationError as e:
        logger.error(f"Not authenticated: {e.message}")
    except APIError as e:
        logger.error(f"API error: {e.message}")
    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        await client.close()


async def example_async_historical_data():
    """Example: Retrieve historical data for one day."""
    logger.info("=== Async Historical Data Example ===")

    client = ShinemonitorClient()

    try:
        await client.login("user@example.com", "password")

        # Get historical data for yesterday
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

        history = await client.get_device_parameter_one_day(
            pn="PLANT001",
            devcode=DEVICE_CODE_INVERTER,
            devaddr="1",
            sn="INV12345678",
            parameter="power",
            date=yesterday,
        )

        logger.info(f"Date: {history.date}")
        logger.info(f"Parameter: {history.parameter}")
        logger.info(f"Data points: {len(history.data_points)}")

        # Process data points
        if history.data_points:
            for point in history.data_points[:5]:  # First 5 points
                logger.info(f"  {point.get('time', 'N/A')}: {point.get('value', 'N/A')} W")

    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        await client.close()


async def example_async_device_control():
    """Example: Control a device."""
    logger.info("=== Async Device Control Example ===")

    client = ShinemonitorClient()

    try:
        await client.login("user@example.com", "password")

        # Get available control fields
        control_fields = await client.get_web_control_fields(
            pn="PLANT001",
            devcode=DEVICE_CODE_INVERTER,
            devaddr="1",
            sn="INV12345678",
        )

        logger.info(f"Available control fields: {len(control_fields)}")
        for field in control_fields:
            logger.info(f"  Field {field.id}: {field.name} (writable: {field.writable})")

        # Get current control value
        current_value = await client.get_control_value(
            pn="PLANT001",
            sn="INV12345678",
            devcode=DEVICE_CODE_INVERTER,
            devaddr="1",
            field_id="1",
        )
        logger.info(f"Current control value: {current_value}")

        # Set control value (example - be careful with real devices!)
        # success = await client.control_device(
        #     pn="PLANT001",
        #     devcode=DEVICE_CODE_INVERTER,
        #     devaddr="1",
        #     sn="INV12345678",
        #     field_id="1",
        #     value="1"
        # )
        # logger.info(f"Control result: {success}")

    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        await client.close()


async def example_async_paginated_data():
    """Example: Get paginated device data."""
    logger.info("=== Async Paginated Data Example ===")

    client = ShinemonitorClient()

    try:
        await client.login("user@example.com", "password")

        # Get first page of data
        page_data = await client.get_device_data_paginated(
            pn="PLANT001",
            devcode=DEVICE_CODE_INVERTER,
            sn="INV12345678",
            devaddr="1",
            page=1,
            pagesize=50,
        )

        logger.info(f"Total records: {page_data.total}")
        logger.info(f"Current page: {page_data.page}")
        logger.info(f"Page size: {page_data.pagesize}")
        logger.info(f"Records in this page: {len(page_data.records)}")

        # Get next page if available
        if page_data.page * page_data.pagesize < page_data.total:
            next_page = await client.get_device_data_paginated(
                pn="PLANT001",
                devcode=DEVICE_CODE_INVERTER,
                sn="INV12345678",
                devaddr="1",
                page=page_data.page + 1,
                pagesize=50,
            )
            logger.info(f"Next page has {len(next_page.records)} records")

    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        await client.close()


async def example_async_context_manager():
    """Example: Using context manager for automatic cleanup."""
    logger.info("=== Async Context Manager Example ===")

    try:
        async with ShinemonitorClient() as client:
            await client.login("user@example.com", "password")

            # All client operations here
            account = await client.get_account_info()
            logger.info(f"Logged in as: {account.username}")

            # No need to call close() - it's automatic
    except Exception as e:
        logger.error(f"Error: {str(e)}")


async def example_async_multiple_devices():
    """Example: Get data from multiple devices in parallel."""
    logger.info("=== Async Multiple Devices Example ===")

    client = ShinemonitorClient()

    try:
        await client.login("user@example.com", "password")

        # Define devices
        devices = [
            {
                "pn": "PLANT001",
                "devcode": DEVICE_CODE_INVERTER,
                "devaddr": "1",
                "sn": "INV12345678",
            },
            {
                "pn": "PLANT001",
                "devcode": DEVICE_CODE_INVERTER,
                "devaddr": "2",
                "sn": "INV87654321",
            },
            {
                "pn": "PLANT002",
                "devcode": DEVICE_CODE_BATTERY,
                "devaddr": "1",
                "sn": "BAT12345678",
            },
        ]

        # Fetch data from all devices in parallel
        tasks = [
            client.get_device_last_data(
                pn=dev["pn"],
                devcode=dev["devcode"],
                devaddr=dev["devaddr"],
                sn=dev["sn"],
            )
            for dev in devices
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Device {i}: Error - {str(result)}")
            else:
                logger.info(
                    f"Device {devices[i]['sn']}: Power = {result.values.get('power', 'N/A')} W"
                )

    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        await client.close()


# ============================================================================
# Synchronous Examples
# ============================================================================


def example_sync_login():
    """Example: Synchronous login."""
    logger.info("=== Sync Login Example ===")

    client = ShinemonitorClient()

    try:
        # Login synchronously
        login_response = client.login_sync("user@example.com", "password")
        logger.info(f"Logged in as: {login_response.username}")

        # Get account info synchronously
        account = client.get_account_info_sync()
        logger.info(f"Account: {account.realname}")

    except LoginError as e:
        logger.error(f"Login failed: {e.message}")
    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        client.logout_sync()


def example_sync_device_data():
    """Example: Synchronous device data retrieval."""
    logger.info("=== Sync Device Data Example ===")

    client = ShinemonitorClient()

    try:
        client.login_sync("user@example.com", "password")

        # Get device data
        device_data = client.get_device_last_data_sync(
            pn="PLANT001",
            devcode=DEVICE_CODE_INVERTER,
            devaddr="1",
            sn="INV12345678",
        )

        logger.info(f"Serial: {device_data.sn}")
        logger.info(f"Power: {device_data.values.get('power', 'N/A')} W")

    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        client.logout_sync()


def example_sync_control_device():
    """Example: Synchronous device control."""
    logger.info("=== Sync Control Device Example ===")

    client = ShinemonitorClient()

    try:
        client.login_sync("user@example.com", "password")

        # Control device synchronously
        success = client.control_device_sync(
            pn="PLANT001",
            devcode=DEVICE_CODE_INVERTER,
            devaddr="1",
            sn="INV12345678",
            field_id="1",
            value="1",
        )

        logger.info(f"Control successful: {success}")

    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        client.logout_sync()


# ============================================================================
# Main
# ============================================================================


async def run_async_examples():
    """Run all async examples."""
    logger.info("\n\n" + "=" * 80)
    logger.info("ASYNC EXAMPLES")
    logger.info("=" * 80 + "\n")

    # Uncomment to run examples (requires valid credentials):
    # await example_async_login()
    # await example_async_get_device_data()
    # await example_async_historical_data()
    # await example_async_device_control()
    # await example_async_paginated_data()
    # await example_async_context_manager()
    # await example_async_multiple_devices()

    logger.info("\nAsync examples are available but commented out.")
    logger.info("Edit this file and uncomment examples to run them.")


def run_sync_examples():
    """Run all sync examples."""
    logger.info("\n\n" + "=" * 80)
    logger.info("SYNC EXAMPLES")
    logger.info("=" * 80 + "\n")

    # Uncomment to run examples (requires valid credentials):
    # example_sync_login()
    # example_sync_device_data()
    # example_sync_control_device()

    logger.info("Sync examples are available but commented out.")
    logger.info("Edit this file and uncomment examples to run them.")


def main():
    """Main entry point."""
    logger.info("ShinEmonitor Python Library - Usage Examples")
    logger.info("=" * 80)

    # Show usage instructions
    logger.info("\nTo run examples:")
    logger.info("1. Edit this file (examples/basic_usage.py)")
    logger.info("2. Update email and password with your credentials")
    logger.info("3. Update device parameters (pn, devcode, etc.) for your devices")
    logger.info("4. Uncomment the example functions you want to run")
    logger.info("5. Run: python examples/basic_usage.py")

    logger.info("\n\nAvailable async examples:")
    logger.info("  - example_async_login(): Login and get account info")
    logger.info("  - example_async_get_device_data(): Retrieve latest device data")
    logger.info("  - example_async_historical_data(): Get one-day historical data")
    logger.info("  - example_async_device_control(): Control a device")
    logger.info("  - example_async_paginated_data(): Get paginated data")
    logger.info("  - example_async_context_manager(): Use context manager")
    logger.info("  - example_async_multiple_devices(): Parallel device queries")

    logger.info("\nAvailable sync examples:")
    logger.info("  - example_sync_login(): Synchronous login")
    logger.info("  - example_sync_device_data(): Synchronous device data")
    logger.info("  - example_sync_control_device(): Synchronous device control")

    # Run async examples
    asyncio.run(run_async_examples())

    # Run sync examples
    run_sync_examples()


if __name__ == "__main__":
    main()
