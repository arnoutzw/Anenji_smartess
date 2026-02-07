/**
 * ShineMonitor ESS - Main Application
 */

const App = {
    // State
    currentView: 'login',
    autoRefreshEnabled: true,

    /**
     * Initialize application
     */
    async init: function() {
        console.log('ShineMonitor ESS v3.43.0.1');

        // Check if authenticated
        if (API.isAuthenticated()) {
            this.showMainView();
            await Dashboard.init();
        } else {
            this.showLoginView();
        }

        this.setupEventListeners();
    },

    /**
     * Setup global event listeners
     */
    setupEventListeners: function() {
        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshDashboard();
        });

        // Settings button
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.showSettings();
        });

        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchView(e.currentTarget.dataset.view);
            });
        });

        // Alarm tabs
        document.querySelectorAll('.alarm-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAlarmTab(e.currentTarget.dataset.tab);
            });
        });

        // Close modal buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.currentTarget.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                }
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                }
            });
        });

        // Window visibility change - pause/resume auto-refresh
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                Dashboard.stopAutoRefresh();
            } else if (this.autoRefreshEnabled && this.currentView === 'dashboard') {
                Dashboard.startAutoRefresh();
            }
        });
    },

    /**
     * Handle login
     */
    async handleLogin: function() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        const errorDiv = document.getElementById('loginError');
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        const buttonText = document.getElementById('loginButtonText');
        const spinner = document.getElementById('loginSpinner');

        // Validation
        if (!email || !password) {
            errorDiv.textContent = 'Please enter email and password';
            errorDiv.classList.add('show');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        buttonText.style.display = 'none';
        spinner.style.display = 'inline-block';
        errorDiv.classList.remove('show');

        try {
            const response = await API.login(email, password);

            if (response.success) {
                // Store email if remember me is checked
                if (rememberMe) {
                    Utils.setLocalStorage('login_email', email);
                }

                // Show main view
                this.showMainView();

                // Initialize dashboard and other views
                await Dashboard.init();
                await Devices.init();
                await Charts.init();
                await this.loadAlarms();

                Settings.init();

                // Show success message
                Utils.showToast('Logged in successfully', 'success');
            } else {
                errorDiv.textContent = response.error || 'Login failed';
                errorDiv.classList.add('show');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = 'An error occurred: ' + error.message;
            errorDiv.classList.add('show');
        } finally {
            submitBtn.disabled = false;
            buttonText.style.display = 'inline';
            spinner.style.display = 'none';
        }
    },

    /**
     * Handle logout
     */
    handleLogout: function() {
        if (confirm('Are you sure you want to logout?')) {
            API.logout();
            Dashboard.stopAutoRefresh();
            this.showLoginView();

            // Clear form
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';

            Utils.showToast('Logged out successfully', 'success');
        }
    },

    /**
     * Show login view
     */
    showLoginView: function() {
        document.getElementById('loginView').style.display = 'flex';
        document.getElementById('mainView').style.display = 'none';
        this.currentView = 'login';

        // Restore remembered email
        const savedEmail = Utils.getLocalStorage('login_email', '');
        if (savedEmail) {
            document.getElementById('loginEmail').value = savedEmail;
            document.getElementById('rememberMe').checked = true;
            document.getElementById('loginPassword').focus();
        } else {
            document.getElementById('loginEmail').focus();
        }
    },

    /**
     * Show main view
     */
    showMainView: function() {
        document.getElementById('loginView').style.display = 'none';
        document.getElementById('mainView').style.display = 'flex';
        this.currentView = 'main';
        this.switchView('dashboard');
    },

    /**
     * Switch view
     */
    switchView: function(viewName) {
        if (this.currentView !== 'main') return;

        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active state from all tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected section
        const section = document.getElementById(viewName + 'Section');
        if (section) {
            section.classList.add('active');
        }

        // Mark tab as active
        const tab = document.querySelector(`.nav-tab[data-view="${viewName}"]`);
        if (tab) {
            tab.classList.add('active');
        }

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            devices: 'Devices',
            charts: 'Historical Charts',
            alarms: 'Alarms'
        };
        document.getElementById('pageTitle').textContent = titles[viewName] || 'Dashboard';

        // Handle view-specific initialization
        if (viewName === 'dashboard') {
            Dashboard.startAutoRefresh();
            this.autoRefreshEnabled = true;
        } else {
            Dashboard.stopAutoRefresh();
            this.autoRefreshEnabled = false;
        }
    },

    /**
     * Refresh dashboard
     */
    async refreshDashboard: function() {
        const btn = document.getElementById('refreshBtn');
        btn.disabled = true;
        btn.style.opacity = '0.5';

        try {
            await Dashboard.refresh();
            Utils.showToast('Dashboard refreshed', 'success');
        } catch (error) {
            console.error('Refresh error:', error);
            Utils.showToast('Refresh failed', 'error');
        } finally {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    },

    /**
     * Show settings modal
     */
    showSettings: function() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'flex';
        modal.classList.add('show');

        // Reset to general tab
        document.querySelectorAll('.settings-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById('generalTab').classList.add('active');

        document.querySelectorAll('.setting-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector('.setting-tab[data-tab="general"]').classList.add('active');

        Settings.loadSettings();
    },

    /**
     * Load alarms
     */
    async loadAlarms: function() {
        const accountResponse = await API.getAccountInfo();
        if (accountResponse.success && accountResponse.data?.devices?.length) {
            const devices = accountResponse.data.devices;
            const alarms = [];

            // Collect alarms from all devices
            for (const device of devices) {
                const response = await API.getDeviceLastData(
                    device.pn,
                    device.devcode,
                    device.devaddr,
                    device.sn
                );

                if (response.success && response.data?.alarm) {
                    alarms.push({
                        deviceName: device.dname || device.sn,
                        deviceSn: device.sn,
                        alarmCode: response.data.alarm,
                        timestamp: response.data.utime,
                        severity: this.getAlarmSeverity(response.data.alarm),
                        message: this.getAlarmMessage(response.data.alarm)
                    });
                }
            }

            this.displayAlarms(alarms);
        }
    },

    /**
     * Display alarms
     */
    displayAlarms: function(alarms) {
        const activeList = document.getElementById('activeAlarmsList');

        if (alarms.length === 0) {
            activeList.innerHTML = '<p style="padding: 20px; color: var(--color-text-secondary);">No active alarms</p>';
            return;
        }

        activeList.innerHTML = alarms.map(alarm => `
            <div class="alarm-item ${alarm.severity === 'critical' ? '' : alarm.severity === 'warning' ? 'warning' : 'info'}">
                <div class="alarm-content">
                    <div class="alarm-title">${alarm.deviceName}</div>
                    <div class="alarm-description">${alarm.message}</div>
                    <div class="alarm-time">${Utils.getTimeAgo(alarm.timestamp)}</div>
                </div>
                <div class="alarm-severity severity-${alarm.severity}">${alarm.severity.toUpperCase()}</div>
            </div>
        `).join('');
    },

    /**
     * Get alarm severity
     */
    getAlarmSeverity: function(alarmCode) {
        if (!alarmCode || alarmCode === 0) return 'info';
        if (alarmCode >= 100) return 'critical';
        if (alarmCode >= 50) return 'warning';
        return 'info';
    },

    /**
     * Get alarm message
     */
    getAlarmMessage: function(alarmCode) {
        const messages = {
            0: 'No alarm',
            1: 'Temperature alarm',
            2: 'Grid voltage alarm',
            3: 'Grid frequency alarm',
            4: 'Insulation resistance alarm',
            5: 'Battery voltage alarm',
            6: 'Battery temperature alarm',
            7: 'Communication error',
            8: 'Device offline',
            9: 'Firmware error',
            10: 'Hardware error',
            100: 'Critical system failure',
            101: 'Overtemperature alarm',
            102: 'Over voltage alarm'
        };

        return messages[alarmCode] || `Alarm code: ${alarmCode}`;
    },

    /**
     * Switch alarm tab
     */
    switchAlarmTab: function(tabName) {
        // Hide all alarm lists
        document.getElementById('activeAlarmsList').style.display = 'none';
        document.getElementById('alarmHistoryList').style.display = 'none';

        // Remove active class from tabs
        document.querySelectorAll('.alarm-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected list
        if (tabName === 'active') {
            document.getElementById('activeAlarmsList').style.display = 'flex';
        } else {
            document.getElementById('alarmHistoryList').style.display = 'flex';
            document.getElementById('alarmHistoryList').innerHTML = '<p style="padding: 20px; color: var(--color-text-secondary);">Alarm history not yet available</p>';
        }

        // Mark tab as active
        event.currentTarget.classList.add('active');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Handle beforeunload - stop auto-refresh
window.addEventListener('beforeunload', () => {
    Dashboard.stopAutoRefresh();
});
