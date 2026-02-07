/**
 * ShineMonitor ESS - Settings Module
 */

const Settings = {
    /**
     * Initialize settings
     */
    init: function() {
        this.loadSettings();
        this.setupEventListeners();
    },

    /**
     * Load settings from storage
     */
    loadSettings: function() {
        // General settings
        const refreshInterval = Utils.getLocalStorage('settings_refresh_interval', 30);
        document.getElementById('refreshInterval').value = refreshInterval;

        const theme = Utils.getLocalStorage('settings_theme', 'dark');
        document.getElementById('themeSelect').value = theme;

        const enableNotifications = Utils.getLocalStorage('settings_notifications', false);
        document.getElementById('enableNotifications').checked = enableNotifications;

        // API settings
        document.getElementById('apiBaseUrl').value = API.baseURL;
        document.getElementById('companyKey').value = API.companyKey;

        const credentials = API.getStoredCredentials();
        if (credentials.token) {
            document.getElementById('currentToken').value = credentials.token.substring(0, 50) + '...';
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: function() {
        // General settings save
        document.getElementById('saveGeneralBtn')?.addEventListener('click', () => {
            this.saveGeneralSettings();
        });

        // API settings save
        document.getElementById('saveApiBtn')?.addEventListener('click', () => {
            this.saveAPISettings();
        });

        // Clear credentials
        document.getElementById('clearTokenBtn')?.addEventListener('click', () => {
            this.clearCredentials();
        });

        // Theme change
        document.getElementById('themeSelect')?.addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });

        // Settings tabs
        document.querySelectorAll('.setting-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    },

    /**
     * Switch settings tab
     */
    switchTab: function(tabName) {
        // Hide all tabs
        document.querySelectorAll('.settings-content').forEach(content => {
            content.classList.remove('active');
        });

        // Remove active class from tabs
        document.querySelectorAll('.setting-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab
        const tabElement = document.getElementById(tabName + 'Tab');
        if (tabElement) {
            tabElement.classList.add('active');
        }

        // Mark clicked tab as active
        event.currentTarget.classList.add('active');

        // Special handling for device control tab
        if (tabName === 'device-control') {
            this.loadDeviceControlFields();
        }
    },

    /**
     * Save general settings
     */
    saveGeneralSettings: function() {
        const refreshInterval = parseInt(document.getElementById('refreshInterval').value) || 30;
        const theme = document.getElementById('themeSelect').value;
        const enableNotifications = document.getElementById('enableNotifications').checked;

        // Validate
        if (refreshInterval < 10 || refreshInterval > 300) {
            Utils.showToast('Refresh interval must be between 10 and 300 seconds', 'warning');
            return;
        }

        // Save to storage
        Utils.setLocalStorage('settings_refresh_interval', refreshInterval);
        Utils.setLocalStorage('settings_theme', theme);
        Utils.setLocalStorage('settings_notifications', enableNotifications);

        // Apply theme
        this.applyTheme(theme);

        // Update dashboard refresh interval
        if (Dashboard.autoRefreshTimer) {
            Dashboard.loadSettings();
            Dashboard.startAutoRefresh();
        }

        // Request notification permission if enabled
        if (enableNotifications) {
            Utils.requestNotificationPermission().catch(() => {
                Utils.showToast('Failed to enable notifications', 'warning');
                document.getElementById('enableNotifications').checked = false;
            });
        }

        Utils.showToast('Settings saved successfully', 'success');
    },

    /**
     * Save API settings
     */
    saveAPISettings: function() {
        const baseURL = document.getElementById('apiBaseUrl').value.trim();

        // Validate URL
        try {
            new URL(baseURL);
        } catch (e) {
            Utils.showToast('Invalid API URL format', 'error');
            return;
        }

        // Ensure trailing slash
        const normalizedURL = baseURL.endsWith('/') ? baseURL : baseURL + '/';

        // Update API
        API.baseURL = normalizedURL;
        Utils.setLocalStorage('settings_api_base_url', normalizedURL);

        Utils.showToast('API settings saved successfully', 'success');
    },

    /**
     * Clear stored credentials
     */
    clearCredentials: function() {
        if (confirm('Are you sure you want to clear all stored credentials? You will need to login again.')) {
            API.clearStoredCredentials();
            document.getElementById('currentToken').value = '';
            Utils.showToast('Credentials cleared', 'success');
        }
    },

    /**
     * Apply theme
     */
    applyTheme: function(theme) {
        if (theme === 'light') {
            document.documentElement.style.colorScheme = 'light';
            // Add light theme CSS variables override here if needed
        } else {
            document.documentElement.style.colorScheme = 'dark';
        }
        Utils.setLocalStorage('settings_theme', theme);
    },

    /**
     * Load device control fields
     */
    async loadDeviceControlFields: function() {
        const container = document.getElementById('deviceControlFields');
        Utils.showLoading(container);

        try {
            const accountResponse = await API.getAccountInfo();
            if (!accountResponse.success || !accountResponse.data?.devices?.length) {
                container.innerHTML = '<p style="color: var(--color-text-secondary);">No devices available</p>';
                return;
            }

            const devices = accountResponse.data.devices;
            let html = '<div style="margin-bottom: 20px;"><label>Select Device:</label><select id="deviceControlSelect" style="width: 100%; padding: 8px; margin-top: 8px; background: var(--color-primary); border: 1px solid var(--color-border); color: var(--color-text-primary); border-radius: 4px;">';
            html += '<option value="">Choose a device...</option>';
            html += devices.map(d => `<option value="${d.sn}">${d.dname || d.sn}</option>`).join('');
            html += '</select></div>';

            container.innerHTML = html;

            document.getElementById('deviceControlSelect').addEventListener('change', async (e) => {
                const deviceSn = e.target.value;
                if (!deviceSn) {
                    container.innerHTML = html;
                    return;
                }

                const device = devices.find(d => d.sn === deviceSn);
                if (!device) return;

                Utils.showLoading(container);

                const response = await API.getDeviceControlFields(
                    device.pn,
                    device.devcode,
                    device.devaddr,
                    device.sn
                );

                if (response.success && response.data?.length) {
                    let controlHTML = html;
                    controlHTML += '<div style="margin-top: 20px;">';

                    response.data.forEach((field, idx) => {
                        controlHTML += `
                            <div style="margin-bottom: 15px; padding: 12px; background: var(--color-primary); border: 1px solid var(--color-border); border-radius: 4px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">${field.name || 'Control'}</label>
                                ${field.desc ? `<small style="color: var(--color-text-secondary); display: block; margin-bottom: 8px;">${field.desc}</small>` : ''}
                        `;

                        if (field.type === 'select' || (field.options && Array.isArray(field.options))) {
                            controlHTML += `
                                <select data-field-id="${field.id}" data-field-name="${field.name}" style="width: 100%; padding: 8px; background: var(--color-secondary); border: 1px solid var(--color-border); color: var(--color-text-primary); border-radius: 4px; margin-bottom: 8px;">
                                    ${(field.options || []).map(opt => `
                                        <option value="${opt.value}">${opt.label || opt.value}</option>
                                    `).join('')}
                                </select>
                            `;
                        } else {
                            controlHTML += `
                                <input type="text" data-field-id="${field.id}" data-field-name="${field.name}" value="${field.value || ''}" style="width: 100%; padding: 8px; background: var(--color-secondary); border: 1px solid var(--color-border); color: var(--color-text-primary); border-radius: 4px; margin-bottom: 8px;">
                            `;
                        }

                        controlHTML += `
                                <button class="btn btn-primary" style="width: 100%;" data-field-index="${idx}">Send Command</button>
                            </div>
                        `;
                    });

                    controlHTML += '</div>';
                    container.innerHTML = controlHTML;

                    // Add send listeners
                    document.querySelectorAll('[data-field-index]').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const fieldId = e.currentTarget.previousElementSibling?.dataset.fieldId;
                            const input = e.currentTarget.previousElementSibling;
                            if (fieldId && input) {
                                const value = input.value;
                                Utils.showToast('Sending command...', 'info');

                                const response = await API.controlDevice(
                                    device.pn,
                                    device.devcode,
                                    device.devaddr,
                                    device.sn,
                                    fieldId,
                                    value
                                );

                                if (response.success) {
                                    Utils.showToast('Command sent successfully', 'success');
                                } else {
                                    Utils.showToast('Command failed: ' + response.error, 'error');
                                }
                            }
                        });
                    });
                } else {
                    container.innerHTML = html + '<p style="color: var(--color-text-secondary); margin-top: 20px;">No control fields available for this device</p>';
                }
            });
        } catch (error) {
            console.error('Error loading control fields:', error);
            container.innerHTML = '<p style="color: var(--color-error);">Error loading device controls</p>';
        }
    }
};
