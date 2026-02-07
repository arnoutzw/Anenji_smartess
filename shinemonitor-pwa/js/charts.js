/**
 * ShineMonitor ESS - Charts View
 */

const Charts = {
    // State
    devices: [],
    chart: null,
    currentDeviceSn: null,
    currentParameter: null,
    currentDate: null,
    chartFields: {},

    /**
     * Initialize charts view
     */
    async init: function() {
        await this.loadDevices();
        this.setupControls();
    },

    /**
     * Load devices list
     */
    async loadDevices: function() {
        const response = await API.getAccountInfo();
        if (response.success && response.data) {
            this.devices = response.data.devices || [];
            this.updateDeviceSelect();
        }
    },

    /**
     * Update device select dropdown
     */
    updateDeviceSelect: function() {
        const select = document.getElementById('chartDevice');
        select.innerHTML = `<option value="">Select a device...</option>` +
            this.devices.map(device => `
                <option value="${device.sn}">${device.dname || device.sn}</option>
            `).join('');

        select.addEventListener('change', (e) => {
            this.onDeviceSelected(e.target.value);
        });
    },

    /**
     * Handle device selection
     */
    async onDeviceSelected: function(deviceSn) {
        this.currentDeviceSn = deviceSn;
        document.getElementById('chartParameter').innerHTML = '<option value="">Loading...</option>';

        if (!deviceSn) {
            document.getElementById('chartParameter').innerHTML = '<option value="">Select a parameter...</option>';
            return;
        }

        const device = this.devices.find(d => d.sn === deviceSn);
        if (!device) return;

        // Fetch chart fields for this device
        const response = await API.getDeviceChartFields(device.devcode);
        if (response.success && response.data) {
            this.chartFields[deviceSn] = response.data;
            this.updateParameterSelect(response.data);
        } else {
            Utils.showToast('Failed to load chart parameters', 'error');
            document.getElementById('chartParameter').innerHTML = '<option value="">No parameters available</option>';
        }
    },

    /**
     * Update parameter select dropdown
     */
    updateParameterSelect: function(fields) {
        const select = document.getElementById('chartParameter');
        const commonFields = [
            { name: 'pow', label: 'Power (W)' },
            { name: 'uvol', label: 'Voltage (V)' },
            { name: 'icur', label: 'Current (A)' },
            { name: 'temp', label: 'Temperature (°C)' },
            { name: 'e_day', label: 'Daily Energy (kWh)' },
            { name: 'pbat', label: 'Battery Power (W)' },
            { name: 'soc', label: 'Battery SOC (%)' },
            { name: 'ppv', label: 'Solar Power (W)' },
            { name: 'pgrid', label: 'Grid Power (W)' }
        ];

        select.innerHTML = `<option value="">Select a parameter...</option>` +
            commonFields.map(field => `
                <option value="${field.name}">${field.label}</option>
            `).join('');

        select.addEventListener('change', (e) => {
            this.currentParameter = e.target.value;
        });
    },

    /**
     * Setup control listeners
     */
    setupControls: function() {
        // Set date to today
        const today = new Date();
        const dateInput = document.getElementById('chartDate');
        dateInput.value = Utils.formatDateForAPI(today);
        dateInput.max = Utils.formatDateForAPI(today);
        this.currentDate = dateInput.value;

        dateInput.addEventListener('change', (e) => {
            this.currentDate = e.target.value;
        });

        // Load chart button
        document.getElementById('loadChartBtn').addEventListener('click', () => {
            this.loadChart();
        });
    },

    /**
     * Load and display chart
     */
    async loadChart: function() {
        if (!this.currentDeviceSn || !this.currentParameter || !this.currentDate) {
            Utils.showToast('Please select device, parameter, and date', 'warning');
            return;
        }

        const device = this.devices.find(d => d.sn === this.currentDeviceSn);
        if (!device) {
            Utils.showToast('Device not found', 'error');
            return;
        }

        // Show loading
        document.getElementById('chartLoading').style.display = 'block';
        document.getElementById('chartContainer').style.display = 'none';

        try {
            // Fetch historical data
            const response = await API.getDeviceOneDayHistory(
                device.pn,
                device.devcode,
                device.devaddr,
                device.sn,
                this.currentParameter,
                this.currentDate
            );

            if (response.success && response.data) {
                this.displayChart(response.data);
            } else {
                Utils.showToast('No data available for selected date', 'warning');
            }
        } catch (error) {
            console.error('Chart load error:', error);
            Utils.showToast('Failed to load chart data', 'error');
        } finally {
            document.getElementById('chartLoading').style.display = 'none';
        }
    },

    /**
     * Display chart with data
     */
    displayChart: function(data) {
        if (!data || (Array.isArray(data) && data.length === 0)) {
            Utils.showToast('No data available', 'warning');
            return;
        }

        const container = document.getElementById('chartContainer');
        container.style.display = 'block';

        // Parse data
        let chartData = [];
        if (Array.isArray(data)) {
            // Array of values
            chartData = data.map((value, index) => ({
                time: this.formatChartTime(index),
                value: parseFloat(value) || 0
            }));
        } else if (typeof data === 'object') {
            // Object with time-value pairs
            chartData = Object.entries(data).map(([time, value]) => ({
                time: this.formatChartTime(time),
                value: parseFloat(value) || 0
            }));
        }

        // Get parameter unit
        let unit = '';
        const parameterMap = {
            'pow': 'W',
            'uvol': 'V',
            'icur': 'A',
            'temp': '°C',
            'e_day': 'kWh',
            'pbat': 'W',
            'soc': '%',
            'ppv': 'W',
            'pgrid': 'W'
        };
        unit = parameterMap[this.currentParameter] || '';

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        const ctx = document.getElementById('historyChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(d => d.time),
                datasets: [{
                    label: this.currentParameter.toUpperCase() + ' (' + unit + ')',
                    data: chartData.map(d => d.value),
                    borderColor: '#00e676',
                    backgroundColor: 'rgba(0, 230, 118, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#00e676',
                    pointBorderColor: '#0f1923',
                    pointBorderWidth: 2,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#00e676'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#ffffff',
                            font: { size: 12, weight: '600' },
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    filler: {
                        propagate: true
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#b0bec5',
                            font: { size: 11 },
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#b0bec5',
                            font: { size: 11 },
                            callback: function(value) {
                                return value.toFixed(2);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    },

    /**
     * Format time for chart display
     */
    formatChartTime: function(input) {
        // If it's a number, assume it's hours (0-23) or index
        if (typeof input === 'number') {
            const hour = Math.floor(input / 3600) || input; // Assume 0-23 range for simple case
            if (hour >= 0 && hour <= 23) {
                return `${String(hour).padStart(2, '0')}:00`;
            }
            return String(input).padStart(2, '0');
        }

        // If it's a string with timestamp
        const timestamp = parseInt(input);
        if (!isNaN(timestamp)) {
            const date = new Date(timestamp);
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }

        return String(input).substring(0, 5);
    }
};
