/**
 * ShineMonitor ESS - Dashboard View
 */

const Dashboard = {
    // State
    plants: [],
    devices: [],
    lastDataCache: {},
    refreshInterval: 30000,
    autoRefreshTimer: null,

    /**
     * Initialize dashboard
     */
    async init: function() {
        this.loadSettings();
        await this.refresh();
        this.startAutoRefresh();
    },

    /**
     * Load settings
     */
    loadSettings: function() {
        const refreshInterval = Utils.getLocalStorage('settings_refresh_interval', 30);
        this.refreshInterval = Math.max(10, refreshInterval) * 1000;
    },

    /**
     * Refresh all dashboard data
     */
    async refresh: function() {
        try {
            // Get account info (includes plants and devices)
            const accountResponse = await API.getAccountInfo();
            if (accountResponse.success && accountResponse.data) {
                const account = accountResponse.data;
                this.plants = account.plants || [];
                this.devices = account.devices || [];

                // Fetch device last data for all devices
                await this.loadDeviceData();
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Dashboard refresh error:', error);
        }
    },

    /**
     * Load last data for all devices
     */
    async loadDeviceData: function() {
        const promises = this.devices.map(device => {
            return API.getDeviceLastData(
                device.pn,
                device.devcode,
                device.devaddr,
                device.sn
            ).then(response => {
                if (response.success && response.data) {
                    this.lastDataCache[device.sn] = response.data;
                }
            });
        });

        await Promise.all(promises);
    },

    /**
     * Update dashboard display
     */
    updateDashboard: function() {
        this.updateStats();
        this.updateEnergyFlow();
        this.updatePlants();
        this.updateDevicesSummary();
    },

    /**
     * Update statistics
     */
    updateStats: function() {
        let totalPower = 0;
        let todayGeneration = 0;
        let batterySoc = 0;
        let gridVoltage = 0;
        let deviceCount = 0;

        this.devices.forEach(device => {
            const data = this.lastDataCache[device.sn];
            if (data) {
                // Accumulate power values
                if (data.pow !== undefined && data.pow !== null) {
                    totalPower += parseFloat(data.pow) || 0;
                }

                // Get today's generation
                if (data.e_day !== undefined && data.e_day !== null) {
                    todayGeneration = parseFloat(data.e_day) || 0;
                }

                // Get battery SOC
                if (data.soc !== undefined && data.soc !== null && !batterySoc) {
                    batterySoc = parseFloat(data.soc) || 0;
                }

                // Get grid voltage
                if (data.gvol !== undefined && data.gvol !== null && !gridVoltage) {
                    gridVoltage = parseFloat(data.gvol) || 0;
                }

                deviceCount++;
            }
        });

        // Update display
        document.getElementById('totalPower').textContent = Utils.formatPower(totalPower);
        document.getElementById('todayGeneration').textContent = Utils.formatEnergy(todayGeneration);
        document.getElementById('batterySoc').textContent = Utils.formatPercentage(batterySoc);
        document.getElementById('gridStatus').textContent = Utils.formatVoltage(gridVoltage);
    },

    /**
     * Update energy flow diagram
     */
    updateEnergyFlow: function() {
        let solarPower = 0;
        let batteryPower = 0;
        let gridPower = 0;
        let loadPower = 0;

        this.devices.forEach(device => {
            const data = this.lastDataCache[device.sn];
            if (data) {
                // Estimate power flows based on available data
                // This is a simplified implementation based on typical inverter data structure
                if (data.ppv !== undefined && data.ppv !== null) {
                    solarPower = parseFloat(data.ppv) || 0;
                }
                if (data.pbat !== undefined && data.pbat !== null) {
                    batteryPower = parseFloat(data.pbat) || 0;
                }
                if (data.pgrid !== undefined && data.pgrid !== null) {
                    gridPower = parseFloat(data.pgrid) || 0;
                }
                if (data.pload !== undefined && data.pload !== null) {
                    loadPower = parseFloat(data.pload) || 0;
                }
            }
        });

        // Update energy flow values
        document.getElementById('solarPower').textContent = Utils.formatPower(solarPower);
        document.getElementById('batteryPower').textContent = Utils.formatPower(batteryPower);
        document.getElementById('gridPower').textContent = Utils.formatPower(gridPower);
        document.getElementById('loadPower').textContent = Utils.formatPower(loadPower);

        // Update battery fill indicator
        if (this.devices.length > 0) {
            const firstDevice = this.lastDataCache[this.devices[0].sn];
            if (firstDevice && firstDevice.soc !== undefined) {
                const soc = parseFloat(firstDevice.soc) || 0;
                const batteryFill = document.getElementById('batteryFill');
                if (batteryFill) {
                    batteryFill.style.height = Math.max(0, Math.min(100, soc)) + '%';
                }
            }
        }
    },

    /**
     * Update plants list
     */
    updatePlants: function() {
        const plantsList = document.getElementById('plantsList');
        if (!plantsList) return;

        if (this.plants.length === 0) {
            plantsList.innerHTML = '<p style="grid-column: 1/-1; color: var(--color-text-secondary);">No plants found</p>';
            return;
        }

        plantsList.innerHTML = this.plants.map(plant => {
            const plantDevices = this.devices.filter(d => d.pn === plant.pn);
            let status = 'offline';
            let statusClass = 'status-offline';

            if (plantDevices.some(d => this.lastDataCache[d.sn])) {
                status = 'online';
                statusClass = 'status-online';
            }

            let totalPower = 0;
            plantDevices.forEach(device => {
                const data = this.lastDataCache[device.sn];
                if (data && data.pow !== undefined && data.pow !== null) {
                    totalPower += parseFloat(data.pow) || 0;
                }
            });

            return `
                <div class="plant-card" data-plant-id="${plant.pn}">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${plant.pname || 'Plant'}</div>
                            <small style="color: var(--color-text-secondary); font-size: 0.75rem;">${plant.addr || ''}</small>
                        </div>
                        <div class="status-badge ${statusClass}">${status}</div>
                    </div>
                    <div class="card-stats">
                        <div class="stat-mini">
                            <div class="stat-mini-label">Power</div>
                            <div class="stat-mini-value">${Utils.formatPower(totalPower)}</div>
                        </div>
                        <div class="stat-mini">
                            <div class="stat-mini-label">Devices</div>
                            <div class="stat-mini-value">${plantDevices.length}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Update devices summary
     */
    updateDevicesSummary: function() {
        const devicesSummary = document.getElementById('devicesSummary');
        if (!devicesSummary) return;

        if (this.devices.length === 0) {
            devicesSummary.innerHTML = '<p style="grid-column: 1/-1; color: var(--color-text-secondary);">No devices found</p>';
            return;
        }

        devicesSummary.innerHTML = this.devices.map(device => {
            const data = this.lastDataCache[device.sn];
            let status = 'offline';
            let statusClass = 'status-offline';

            if (data) {
                status = 'online';
                statusClass = 'status-online';

                // Check for alarms
                if (data.alarm && data.alarm !== 0) {
                    status = 'alarm';
                    statusClass = 'status-alarm';
                }
            }

            const power = data && data.pow !== undefined ? Utils.formatPower(data.pow) : '-- W';
            const voltage = data && data.uvol !== undefined ? Utils.formatVoltage(data.uvol) : '-- V';
            const temp = data && data.temp !== undefined ? Utils.formatTemperature(data.temp) : '-- °C';

            return `
                <div class="device-card" data-device-sn="${device.sn}">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${device.dname || 'Device'}</div>
                            <small style="color: var(--color-text-secondary); font-size: 0.75rem;">${device.sn || ''}</small>
                        </div>
                        <div class="status-badge ${statusClass}">${status}</div>
                    </div>
                    <div class="card-stats">
                        <div class="stat-mini">
                            <div class="stat-mini-label">Power</div>
                            <div class="stat-mini-value">${power}</div>
                        </div>
                        <div class="stat-mini">
                            <div class="stat-mini-label">Voltage</div>
                            <div class="stat-mini-value">${voltage}</div>
                        </div>
                        <div class="stat-mini">
                            <div class="stat-mini-label">Temp</div>
                            <div class="stat-mini-value">${temp}</div>
                        </div>
                        <div class="stat-mini">
                            <div class="stat-mini-label">Last Update</div>
                            <div class="stat-mini-value" style="font-size: 0.75rem;">${data ? Utils.getTimeAgo(data.utime) : '--'}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click listeners
        document.querySelectorAll('.device-card').forEach(card => {
            card.addEventListener('click', () => {
                const sn = card.dataset.deviceSn;
                const device = this.devices.find(d => d.sn === sn);
                if (device) {
                    Devices.showDetails(device);
                }
            });
        });
    },

    /**
     * Start auto-refresh
     */
    startAutoRefresh: function() {
        this.stopAutoRefresh();
        this.autoRefreshTimer = setInterval(() => {
            this.refresh();
        }, this.refreshInterval);
    },

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh: function() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    }
};
