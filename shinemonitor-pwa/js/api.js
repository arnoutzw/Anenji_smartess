/**
 * ShineMonitor ESS - API Client
 * Handles authentication and communication with the Eybond ShineMonitor API
 */

const API = {
    // Configuration
    baseURL: 'http://android.shinemonitor.com/public/',
    companyKey: 'bnrl_frRFjEz8Mkn',

    // State
    token: null,
    secret: null,
    authTime: null,

    /**
     * Initialize API with custom base URL if provided
     */
    init: function(customBaseURL = null) {
        if (customBaseURL) {
            this.baseURL = customBaseURL;
        }
        // Load stored credentials
        const stored = Utils.getLocalStorage('api_credentials', {});
        if (stored.token && stored.secret) {
            this.token = stored.token;
            this.secret = stored.secret;
            this.authTime = stored.authTime;
        }
    },

    /**
     * Generate request signature
     */
    generateSignature: function(salt, token, secret) {
        const data = salt + token + secret;
        return CryptoJS.SHA1(data).toString().toLowerCase();
    },

    /**
     * Build request parameters with authentication
     */
    buildParams: function(params = {}) {
        const salt = Date.now().toString();
        const sign = this.generateSignature(salt, this.token, this.secret);

        const baseParams = {
            sign: sign,
            salt: salt,
            token: this.token,
            i18n: 'en_US',
            lang: 'en_US',
            source: 'android',
            _app_client_: 'android',
            _app_id_: 'com.eybond.smartclient.ess',
            _app_version_: '3.43.0.1'
        };

        return { ...baseParams, ...params };
    },

    /**
     * Make API request
     */
    async request: function(action, params = {}) {
        try {
            const requestParams = this.buildParams({ action, ...params });
            const queryString = Utils.toQueryString(requestParams);
            const url = this.baseURL + '?' + queryString;

            const response = await Utils.fetchWithTimeout(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }, 30000);

            const data = await response.json();

            if (data.err === 0) {
                return { success: true, data: data.dat, message: data.desc };
            } else {
                return { success: false, error: data.desc || 'Unknown error', data: data.dat };
            }
        } catch (error) {
            console.error('API request error:', error);
            return {
                success: false,
                error: error.message || 'Network error'
            };
        }
    },

    /**
     * Login with email and password
     */
    async login: function(email, password) {
        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: Utils.toQueryString({
                    action: 'authSource',
                    usr: email,
                    pwd: password,
                    'company-key': this.companyKey,
                    source: 'android'
                })
            });

            const data = await response.json();

            if (data.err === 0 && data.dat) {
                const { token, secret, userid } = data.dat;
                this.token = token;
                this.secret = secret;
                this.authTime = Date.now();

                // Store credentials
                Utils.setLocalStorage('api_credentials', {
                    token: token,
                    secret: secret,
                    authTime: this.authTime,
                    userid: userid,
                    email: email
                });

                return { success: true, data: data.dat };
            } else {
                return { success: false, error: data.desc || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message || 'Login failed' };
        }
    },

    /**
     * Logout
     */
    logout: function() {
        this.token = null;
        this.secret = null;
        this.authTime = null;
        Utils.removeLocalStorage('api_credentials');
    },

    /**
     * Get account info
     */
    async getAccountInfo: function() {
        return this.request('queryAccountInfo');
    },

    /**
     * Get plant info
     */
    async getPlantInfo: function(plantId) {
        return this.request('queryPlantInfo', { plantid: plantId });
    },

    /**
     * Get device last data
     */
    async getDeviceLastData: function(pn, devcode, devaddr, sn) {
        return this.request('querySPDeviceLastData', {
            pn: pn,
            devcode: devcode,
            devaddr: devaddr,
            sn: sn
        });
    },

    /**
     * Get device key parameters
     */
    async getDeviceKeyParameters: function(devcode) {
        return this.request('querySPKeyParameters', { devcode: devcode });
    },

    /**
     * Get device one day history
     */
    async getDeviceOneDayHistory: function(pn, devcode, devaddr, sn, parameter, date) {
        return this.request('querySPDeviceKeyParameterOneDay', {
            pn: pn,
            devcode: devcode,
            devaddr: devaddr,
            sn: sn,
            parameter: parameter,
            date: date
        });
    },

    /**
     * Get device chart fields
     */
    async getDeviceChartFields: function(devcode) {
        return this.request('queryDeviceChartsFieldsEs', { devcode: devcode });
    },

    /**
     * Get collector status
     */
    async getCollectorStatus: function(pn) {
        return this.request('queryCollectorDevicesStatus', { pn: pn });
    },

    /**
     * Get device control fields
     */
    async getDeviceControlFields: function(pn, devcode, devaddr, sn) {
        return this.request('webQueryDeviceCtrlField', {
            pn: pn,
            devcode: devcode,
            devaddr: devaddr,
            sn: sn
        });
    },

    /**
     * Control device
     */
    async controlDevice: function(pn, devcode, devaddr, sn, id, val) {
        return this.request('ctrlDevice', {
            pn: pn,
            devcode: devcode,
            devaddr: devaddr,
            sn: sn,
            id: id,
            val: val
        });
    },

    /**
     * Check if authenticated
     */
    isAuthenticated: function() {
        return !!(this.token && this.secret);
    },

    /**
     * Get stored credentials
     */
    getStoredCredentials: function() {
        return Utils.getLocalStorage('api_credentials', {});
    },

    /**
     * Clear stored credentials
     */
    clearStoredCredentials: function() {
        this.logout();
    }
};

// Initialize API
API.init();
