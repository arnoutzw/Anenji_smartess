/**
 * ShineMonitor ESS - Utility Functions
 */

const Utils = {
    /**
     * Format power values with appropriate units
     */
    formatPower: function(value) {
        if (value === null || value === undefined) return '-- W';
        value = parseFloat(value);
        if (Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(2) + ' kW';
        }
        return value.toFixed(0) + ' W';
    },

    /**
     * Format energy values with appropriate units
     */
    formatEnergy: function(value) {
        if (value === null || value === undefined) return '-- kWh';
        value = parseFloat(value);
        if (Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(2) + ' MWh';
        }
        return value.toFixed(2) + ' kWh';
    },

    /**
     * Format voltage
     */
    formatVoltage: function(value) {
        if (value === null || value === undefined) return '-- V';
        return parseFloat(value).toFixed(1) + ' V';
    },

    /**
     * Format current
     */
    formatCurrent: function(value) {
        if (value === null || value === undefined) return '-- A';
        return parseFloat(value).toFixed(2) + ' A';
    },

    /**
     * Format temperature
     */
    formatTemperature: function(value) {
        if (value === null || value === undefined) return '-- °C';
        return parseFloat(value).toFixed(1) + ' °C';
    },

    /**
     * Format percentage
     */
    formatPercentage: function(value) {
        if (value === null || value === undefined) return '-- %';
        value = parseFloat(value);
        return Math.max(0, Math.min(100, value)).toFixed(0) + '%';
    },

    /**
     * Format generic number with decimals
     */
    formatNumber: function(value, decimals = 2) {
        if (value === null || value === undefined) return '--';
        return parseFloat(value).toFixed(decimals);
    },

    /**
     * Format timestamp to readable date
     */
    formatDateTime: function(timestamp) {
        if (!timestamp) return '--';
        const date = new Date(parseInt(timestamp));
        return date.toLocaleString();
    },

    /**
     * Format timestamp to time only
     */
    formatTime: function(timestamp) {
        if (!timestamp) return '--';
        const date = new Date(parseInt(timestamp));
        return date.toLocaleTimeString();
    },

    /**
     * Format timestamp to date only
     */
    formatDate: function(timestamp) {
        if (!timestamp) return '--';
        const date = new Date(parseInt(timestamp));
        return date.toLocaleDateString();
    },

    /**
     * Format date for API (YYYY-MM-DD)
     */
    formatDateForAPI: function(date) {
        if (!date) {
            date = new Date();
        } else if (typeof date === 'string') {
            date = new Date(date);
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Get time ago string
     */
    getTimeAgo: function(timestamp) {
        if (!timestamp) return 'Unknown';
        const seconds = Math.floor((Date.now() - parseInt(timestamp)) / 1000);

        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return Utils.formatDate(timestamp);
    },

    /**
     * Deep clone object
     */
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Debounce function
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     */
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Get CSS variable value
     */
    getCSSVariable: function(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    },

    /**
     * Set CSS variable value
     */
    setCSSVariable: function(name, value) {
        document.documentElement.style.setProperty(name, value);
    },

    /**
     * Show toast notification
     */
    showToast: function(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background-color: ${
                type === 'success' ? '#00e676' :
                type === 'error' ? '#f44336' :
                type === 'warning' ? '#ff9800' :
                '#2196f3'
            };
            color: ${type === 'success' ? '#0f1923' : '#fff'};
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Check if value is empty
     */
    isEmpty: function(value) {
        return value === null || value === undefined || value === '' ||
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && Object.keys(value).length === 0);
    },

    /**
     * Get local storage item with error handling
     */
    getLocalStorage: function(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error('localStorage get error:', e);
            return defaultValue;
        }
    },

    /**
     * Set local storage item with error handling
     */
    setLocalStorage: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('localStorage set error:', e);
            return false;
        }
    },

    /**
     * Remove local storage item
     */
    removeLocalStorage: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('localStorage remove error:', e);
            return false;
        }
    },

    /**
     * Clear local storage
     */
    clearLocalStorage: function() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('localStorage clear error:', e);
            return false;
        }
    },

    /**
     * Generate UUID v4
     */
    generateUUID: function() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    },

    /**
     * Convert parameters object to query string
     */
    toQueryString: function(params) {
        const query = new URLSearchParams(params);
        return query.toString();
    },

    /**
     * Parse query string to object
     */
    parseQueryString: function(queryString) {
        const params = {};
        const searchParams = new URLSearchParams(queryString);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    },

    /**
     * Fetch with timeout
     */
    fetchWithTimeout: function(url, options = {}, timeout = 30000) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
        ]);
    },

    /**
     * Get URL parameters
     */
    getURLParams: function() {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    },

    /**
     * Show loading spinner
     */
    showLoading: function(element) {
        if (!element) return;
        element.innerHTML = '<div class="loading-spinner"></div>';
    },

    /**
     * Get contrasting text color for background
     */
    getContrastingColor: function(hexColor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    },

    /**
     * Request notification permission
     */
    requestNotificationPermission: function() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                return Promise.resolve();
            } else if (Notification.permission !== 'denied') {
                return Notification.requestPermission();
            }
        }
        return Promise.reject(new Error('Notifications not supported'));
    },

    /**
     * Send notification
     */
    sendNotification: function(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const defaults = {
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%230f1923" width="192" height="192"/><circle cx="96" cy="96" r="60" fill="%2300e676"/></svg>',
                badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><circle cx="96" cy="96" r="96" fill="%2300e676"/></svg>',
            };
            new Notification(title, { ...defaults, ...options });
        }
    }
};

// Add CSS animations to document
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
