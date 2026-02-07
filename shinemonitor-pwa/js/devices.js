/**
 * ShineMonitor ESS - Devices View
 */

const Devices = {
    // State
    devices: [],
    selectedDevice: null,
    lastDataCache: {},

    /**
     * Initialize devices view
     */
    async init: function() {
        await this.refresh();
    },

    /**
     * Refresh devices list
     */
    async refresh: function() {
        const accountResponse = await API.getAccountInfo();
        if (accountResponse.success && accountResponse.data) {
            this.devices = accountResponse.data.devices || [];
            await this.loadAllDeviceData();
            this.updateDevicesList();
        }
    },

    /**
     * Load data for all devices
     */
    async loadAllDeviceData: function() {
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
     * Update devices list display
     */
    updateDevicesList: function() {
        const devicesList = document.getElementById('devicesList');
        if (!devicesList) return;

        if (this.devices.length === 0) {
            devicesList.innerHTML = '<p style="padding: 20px; color: var(--color-text-secondary);">No devices found</p>';
            return;
        }

        devicesList.innerHTML = this.devices.map(device => {
            const data = this.lastDataCache[device.sn];
            let status = 'offline';
            let statusClass = 'status-offline';

            if (data) {
                status = 'online';
                statusClass = 'status-online';

                if (data.alarm && data.alarm !== 0) {
                    status = 'alarm';
                    statusClass = 'status-alarm';
                }
            }

            const power = data && data.pow !== undefined ? Utils.formatPower(data.pow) : '-- W';
            const voltage = data && data.uvol !== undefined ? Utils.formatVoltage(data.uvol) : '-- V';
            const current = data && data.icur !== undefined ? Utils.formatCurrent(data.icur) : '-- A';
            const temp = data && data.temp !== undefined ? Utils.formatTemperature(data.temp) : '-- °C';
            const energy = data && data.e_total !== undefined ? Utils.formatEnergy(data.e_total) : '-- kWh';

            return `
                <div class="device-item" data-device-sn="${device.sn}">
                    <div class="device-header">
                        <div>
                            <div class="device-type">${device.devcode || 'Unknown'}</div>
                            <div class="device-name">${device.dname || 'Device'}</div>
                            <div class="device-sn">SN: ${device.sn}</div>
                        </div>
                        <div class="status-badge ${statusClass}">${status}</div>
                    </div>

                    <div class="device-data">
                        <div class="data-item">
                            <div class="data-label">Power</div>
                            <div class="data-value">${power}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Voltage</div>
                            <div class="data-value">${voltage}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Current</div>
                            <div class="data-value">${current}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Temperature</div>
                            <div class="data-value">${temp}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Total Energy</div>
                            <div class="data-value">${energy}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Last Update</div>
                            <div class="data-value" style="font-size: 1rem;">${data ? Utils.getTimeAgo(data.utime) : '--'}</div>
                        </div>
                    </div>

                    <div class="device-actions">
                        <button class="btn btn-secondary view-details" data-device-sn="${device.sn}">
                            View Details
                        </button>
                        <button class="btn btn-secondary control-device" data-device-sn="${device.sn}">
                            Control
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sn = e.currentTarget.dataset.deviceSn;
                const device = this.devices.find(d => d.sn === sn);
                if (device) {
                    this.showDetails(device);
                }
            });
        });

        document.querySelectorAll('.control-device').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sn = e.currentTarget.dataset.deviceSn;
                const device = this.devices.find(d => d.sn === sn);
                if (device) {
                    this.showControl(device);
                }
            });
        });
    },

    /**
     * Show device details modal
     */
    async showDetails: function(device) {
        this.selectedDevice = device;
        const data = this.lastDataCache[device.sn];

        const modal = document.getElementById('deviceDetailsModal');
        const title = document.getElementById('deviceDetailsTitle');
        const content = document.getElementById('deviceDetailsContent');

        title.textContent = device.dname || 'Device Details';

        if (!data) {
            content.innerHTML = '<p style="color: var(--color-text-secondary);">No data available</p>';
            modal.style.display = 'flex';
            modal.classList.add('show');
            return;
        }

        // Build details HTML
        const details = {
            'Device Name': device.dname || '--',
            'Device Code': device.devcode || '--',
            'Serial Number': device.sn || '--',
            'Plant ID': device.pn || '--',
            'Device Address': device.devaddr || '--',
            'Status': data.alarm ? 'Alarm' : 'Normal',
            'Power': Utils.formatPower(data.pow),
            'Voltage (U)': Utils.formatVoltage(data.uvol),
            'Current (I)': Utils.formatCurrent(data.icur),
            'Frequency': data.f ? parseFloat(data.f).toFixed(2) + ' Hz' : '--',
            'Temperature': Utils.formatTemperature(data.temp),
            'Efficiency': data.eff ? parseFloat(data.eff).toFixed(2) + '%' : '--',
            'Battery SOC': Utils.formatPercentage(data.soc),
            'Battery Power': Utils.formatPower(data.pbat),
            'Battery Voltage': Utils.formatVoltage(data.uvbat),
            'Solar Power': Utils.formatPower(data.ppv),
            'Solar Voltage': Utils.formatVoltage(data.uvpv),
            'Grid Power': Utils.formatPower(data.pgrid),
            'Grid Voltage': Utils.formatVoltage(data.gvol),
            'Load Power': Utils.formatPower(data.pload),
            'Today Energy': Utils.formatEnergy(data.e_day),
            'Total Energy': Utils.formatEnergy(data.e_total),
            'Last Update': Utils.formatDateTime(data.utime),
            'Update Time (Unix)': data.utime || '--'
        };

        content.innerHTML = Object.entries(details).map(([label, value]) => `
            <div class="detail-card">
                <div class="detail-label">${label}</div>
                <div class="detail-value">${value}</div>
            </div>
        `).join('');

        modal.style.display = 'flex';
        modal.classList.add('show');
    },

    /**
     * Show device control modal
     */
    async showControl: function(device) {
        this.selectedDevice = device;

        // Fetch control fields
        const response = await API.getDeviceControlFields(
            device.pn,
            device.devcode,
            device.devaddr,
            device.sn
        );

        if (!response.success) {
            Utils.showToast('Failed to load control fields: ' + response.error, 'error');
            return;
        }

        const modal = document.getElementById('deviceDetailsModal');
        const title = document.getElementById('deviceDetailsTitle');
        const content = document.getElementById('deviceDetailsContent');

        title.textContent = 'Control: ' + (device.dname || 'Device');

        if (!response.data || response.data.length === 0) {
            content.innerHTML = '<p style="color: var(--color-text-secondary);">No control fields available</p>';
            modal.style.display = 'flex';
            modal.classList.add('show');
            return;
        }

        content.innerHTML = response.data.map((field, index) => {
            const currentValue = this.lastDataCache[device.sn]?.[field.name] || field.value || '';

            let inputHTML = '';
            if (field.type === 'select' || (field.options && Array.isArray(field.options))) {
                const options = field.options || [];
                inputHTML = `
                    <select id="control-field-${index}" class="control-value-input" data-field-id="${field.id}" data-field-name="${field.name}">
                        ${options.map(opt => `
                            <option value="${opt.value}" ${opt.value === currentValue ? 'selected' : ''}>
                                ${opt.label || opt.value}
                            </option>
                        `).join('')}
                    </select>
                `;
            } else if (field.type === 'number' || field.type === 'float') {
                inputHTML = `
                    <input type="number" id="control-field-${index}" class="control-value-input"
                           data-field-id="${field.id}" data-field-name="${field.name}"
                           value="${currentValue}" step="${field.step || 1}"
                           min="${field.min || 0}" max="${field.max || 9999}">
                `;
            } else {
                inputHTML = `
                    <input type="text" id="control-field-${index}" class="control-value-input"
                           data-field-id="${field.id}" data-field-name="${field.name}"
                           value="${currentValue}">
                `;
            }

            return `
                <div class="control-card">
                    <div class="control-card-title">${field.name || 'Control Field'}</div>
                    ${field.desc ? `<p style="color: var(--color-text-secondary); font-size: 0.875rem; margin-bottom: 12px;">${field.desc}</p>` : ''}
                    <div class="control-field">
                        <div class="control-field-input">
                            <label>Value</label>
                            ${inputHTML}
                        </div>
                        <button class="btn btn-primary send-control" data-field-index="${index}" data-field-id="${field.id}">
                            Send
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add control send listeners
        document.querySelectorAll('.send-control').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldIndex = e.currentTarget.dataset.fieldIndex;
                const fieldId = e.currentTarget.dataset.fieldId;
                const input = document.getElementById(`control-field-${fieldIndex}`);
                if (input) {
                    const value = input.value;
                    this.sendControl(device, fieldId, value);
                }
            });
        });

        modal.style.display = 'flex';
        modal.classList.add('show');
    },

    /**
     * Send control command to device
     */
    async sendControl: function(device, fieldId, value) {
        const response = await API.controlDevice(
            device.pn,
            device.devcode,
            device.devaddr,
            device.sn,
            fieldId,
            value
        );

        if (response.success) {
            Utils.showToast('Control command sent successfully', 'success');
            // Refresh device data
            const dataResponse = await API.getDeviceLastData(
                device.pn,
                device.devcode,
                device.devaddr,
                device.sn
            );
            if (dataResponse.success) {
                this.lastDataCache[device.sn] = dataResponse.data;
            }
        } else {
            Utils.showToast('Failed to send control command: ' + response.error, 'error');
        }
    }
};
