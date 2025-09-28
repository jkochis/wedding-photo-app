/**
 * Wedding Photo App Utilities
 * Common helper functions and utilities
 */

import { CONFIG } from './config.js';

export class Utils {
    /**
     * Get URL parameters
     */
    static getUrlParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    /**
     * Capitalize first letter of a string
     */
    static capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Format file size in human readable format
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format date in a user-friendly way
     */
    static formatDate(dateString) {
        const date = new Date(dateString);
        return `Uploaded ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    }

    /**
     * Validate if file is a supported image type
     */
    static isValidImageFile(file) {
        return CONFIG.UPLOAD.SUPPORTED_TYPES.includes(file.type);
    }

    /**
     * Check if file size is within limits
     */
    static isValidFileSize(file) {
        return file.size <= CONFIG.UPLOAD.MAX_FILE_SIZE;
    }

    /**
     * Generate unique ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Debounce function calls
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Wait for a specified amount of time
     */
    static async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create a promise that resolves when an image loads
     */
    static waitForImageLoad(img) {
        return new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
                resolve();
            } else {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Resolve even on error to prevent hanging
            }
        });
    }

    /**
     * Safe JSON parse with fallback
     */
    static safeJsonParse(jsonString, fallback = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON parse error:', error);
            return fallback;
        }
    }

    /**
     * Create DOM element with properties
     */
    static createElement(tag, properties = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(properties).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else if (key === 'className') {
                element.className = value;
            } else {
                element[key] = value;
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        
        return element;
    }
}

export default Utils;