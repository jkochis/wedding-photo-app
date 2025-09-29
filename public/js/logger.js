/**
 * Wedding Photo App Logger and Error Handling
 * Centralized logging and error handling utilities
 */
import { CONFIG } from './config.js';
export class Logger {
    logs;
    maxLogs;
    logLevel;
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.logLevel = 'info';
    }
    /**
     * Log levels enum
     */
    static LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };
    /**
     * Set logging level
     */
    setLevel(level) {
        this.logLevel = level;
    }
    /**
     * Add log entry
     */
    _addLog(level, message, data = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            stack: new Error().stack
        };
        this.logs.push(logEntry);
        // Keep logs within limit
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        // Console output
        const consoleMethod = level === 'error' ? 'error' :
            level === 'warn' ? 'warn' :
                level === 'debug' ? 'debug' : 'log';
        if (data) {
            console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data);
        }
        else {
            console[consoleMethod](`[${level.toUpperCase()}] ${message}`);
        }
        return logEntry;
    }
    /**
     * Debug logging
     */
    debug(message, data) {
        if (Logger.LEVELS[this.logLevel.toUpperCase()] <= Logger.LEVELS.DEBUG) {
            return this._addLog('debug', message, data);
        }
        return undefined;
    }
    /**
     * Info logging
     */
    info(message, data) {
        if (Logger.LEVELS[this.logLevel.toUpperCase()] <= Logger.LEVELS.INFO) {
            return this._addLog('info', message, data);
        }
        return undefined;
    }
    /**
     * Warning logging
     */
    warn(message, data) {
        if (Logger.LEVELS[this.logLevel.toUpperCase()] <= Logger.LEVELS.WARN) {
            return this._addLog('warn', message, data);
        }
        return undefined;
    }
    /**
     * Error logging
     */
    error(message, data) {
        return this._addLog('error', message, data);
    }
    /**
     * Get recent logs
     */
    getLogs(limit = 50) {
        return this.logs.slice(-limit);
    }
    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
    }
    /**
     * Export logs as JSON
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
}
export class ErrorHandler {
    logger;
    constructor(logger) {
        this.logger = logger || new Logger();
        this.setupGlobalErrorHandling();
    }
    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.logger.error('Uncaught error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logger.error('Unhandled promise rejection', {
                reason: event.reason,
                promise: event.promise
            });
        });
    }
    /**
     * Handle API errors
     */
    handleApiError(error, context = '') {
        const errorInfo = {
            context,
            status: error.status,
            statusText: error.statusText,
            message: error.message
        };
        this.logger.error(`API Error${context ? ` (${context})` : ''}`, errorInfo);
        // Return user-friendly error message
        if (error.status >= 500) {
            return 'Server error. Please try again later.';
        }
        else if (error.status === 404) {
            return 'Resource not found.';
        }
        else if (error.status === 401 || error.status === 403) {
            return 'Access denied. Please check your permissions.';
        }
        else if (error.status >= 400) {
            return 'Invalid request. Please check your input.';
        }
        else {
            return 'Network error. Please check your connection.';
        }
    }
    /**
     * Handle file upload errors
     */
    handleUploadError(error, file = null) {
        let message = 'Upload failed. ';
        if (file && !CONFIG.UPLOAD.SUPPORTED_TYPES.includes(file.type)) {
            message += 'Please select a valid image file.';
        }
        else if (file && file.size > CONFIG.UPLOAD.MAX_FILE_SIZE) {
            message += `File is too large. Maximum size is ${Math.round(CONFIG.UPLOAD.MAX_FILE_SIZE / (1024 * 1024))}MB.`;
        }
        else if (error.message && error.message.includes('network')) {
            message += 'Please check your internet connection.';
        }
        else {
            message += 'Please try again.';
        }
        this.logger.error('Upload error', { error, file: file ? file.name : null });
        return message;
    }
    /**
     * Handle face detection errors
     */
    handleFaceDetectionError(error) {
        this.logger.error('Face detection error', error);
        if (error.message && error.message.includes('model')) {
            return 'Face detection models failed to load. Please refresh the page.';
        }
        else if (error.message && error.message.includes('canvas')) {
            return 'Image processing failed. Please try a different image.';
        }
        else {
            return 'Face detection failed. Please try again.';
        }
    }
    /**
     * Try to execute a function with error handling
     */
    async tryExecute(fn, context = '', fallbackValue = null) {
        try {
            return await fn();
        }
        catch (error) {
            this.logger.error(`Error in ${context}`, error);
            return fallbackValue;
        }
    }
    /**
     * Wrap async functions with error handling
     */
    wrapAsync(fn, context = '') {
        return (async (...args) => {
            try {
                return await fn(...args);
            }
            catch (error) {
                this.logger.error(`Async error in ${context}`, error);
                throw error;
            }
        });
    }
}
// Create and export singleton instances
export const logger = new Logger();
export const errorHandler = new ErrorHandler(logger);
// Export convenience functions
export const log = {
    debug: (message, data) => logger.debug(message, data),
    info: (message, data) => logger.info(message, data),
    warn: (message, data) => logger.warn(message, data),
    error: (message, data) => logger.error(message, data),
    setLevel: (level) => logger.setLevel(level)
};
export default { Logger, ErrorHandler, logger, errorHandler, log };
//# sourceMappingURL=logger.js.map