# Anenji Smartess - ShineMonitor Integration

A comprehensive solar monitoring system featuring a Progressive Web App dashboard and Python library for managing ShineMonitor inverters.

![Screenshot Placeholder](https://via.placeholder.com/800x400)

## Overview

Anenji Smartess is a monorepo project that provides both web-based monitoring and programmatic access to ShineMonitor solar inverter systems. Monitor your solar installation in real-time with the PWA dashboard or integrate ShineMonitor devices into custom applications using the Python library.

## Project Structure

### shinemonitor-pwa/
Web-based dashboard for solar system monitoring and device management.

**Features:**
- Real-time solar data visualization
- Device management and configuration
- Interactive charts and performance monitoring
- Settings and system preferences
- ShineMonitor API integration
- Install as PWA for offline capability

**Tech Stack:** HTML5, JavaScript, CSS, Service Worker

### shinemonitor-python/
Python library for ShineMonitor API interaction and device control.

**Features:**
- ShineMonitor API client
- Device management and discovery
- Data retrieval and monitoring
- Example usage scripts
- Easy integration into Python applications

**Tech Stack:** Python

## Features

### Dashboard (PWA)
- Live solar power generation monitoring
- Device status and performance metrics
- Historical data visualization
- Responsive design for mobile and desktop
- Progressive Web App capabilities
- Offline access to cached data
- Push notifications for alerts

### Python Library
- Simple API for device communication
- Device enumeration and management
- Real-time data queries
- Configuration management
- Error handling and logging

## Tech Stack

- **Frontend**: HTML5, JavaScript, CSS
- **Service Worker**: PWA with offline support
- **Backend Library**: Python
- **API**: ShineMonitor REST API

## Getting Started

### Using the PWA Dashboard

1. Visit the dashboard (check sub-project README for URL)
2. Connect to your ShineMonitor system
3. View real-time solar data
4. Manage devices and settings

### Using the Python Library

```bash
git clone https://github.com/arnoutzw/Anenji_smartess.git
cd Anenji_smartess/shinemonitor-python

# Install the library
pip install -e .

# Use in your project
from shinemonitor import ShineMonitorClient
client = ShineMonitorClient(...)
devices = client.get_devices()
```

## Documentation

Complete documentation for each sub-project is available in their respective README.md files:
- PWA Dashboard: `shinemonitor-pwa/README.md`
- Python Library: `shinemonitor-python/README.md`

Additional technical documentation is available in `ANENJI RS232.docx.pdf`

## Supported Devices

- ShineMonitor inverter systems
- Compatible with various solar panel configurations
- Multi-device monitoring support

## License

MIT License - See LICENSE file for details
