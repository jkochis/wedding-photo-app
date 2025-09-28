/**
 * Wedding Photo App API Client
 * Centralized API communication with error handling and authentication
 */

import { CONFIG } from './config.js';
import { log, errorHandler } from './logger.js';
import Utils from './utils.js';

export class ApiClient {
    constructor(options = {}) {
        this.baseURL = options.baseURL || CONFIG.API.BASE_URL;
        this.accessToken = options.accessToken || Utils.getUrlParam('token');
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.isInitialized = false;
    }

    /**
     * Initialize the API client
     */
    async initialize() {
        log.info('Initializing API Client');
        
        try {
            // Test connection with health check
            await this.healthCheck();
            this.isInitialized = true;
            log.info('API Client initialized successfully');
        } catch (error) {
            log.warn('API Client health check failed, but continuing', error);
            this.isInitialized = true; // Still mark as initialized
        }
    }

    /**
     * Get API client status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasToken: !!this.accessToken,
            baseURL: this.baseURL
        };
    }

    /**
     * Set or update access token
     */
    setAccessToken(token) {
        this.accessToken = token;
        log.info('Access token updated');
    }

    /**
     * Get current access token
     */
    getAccessToken() {
        return this.accessToken;
    }

    /**
     * Build URL with query parameters
     */
    _buildUrl(endpoint, params = {}) {
        const url = new URL(endpoint, window.location.origin);
        
        // Always include access token
        if (this.accessToken) {
            params.token = this.accessToken;
        }

        // Add other parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        });

        return url.toString();
    }

    /**
     * Generic request method with error handling
     */
    async _request(method, endpoint, options = {}) {
        const { 
            params = {}, 
            headers = {}, 
            body, 
            timeout = 30000,
            ...fetchOptions 
        } = options;

        const url = this._buildUrl(endpoint, params);
        const requestHeaders = { 
            ...this.defaultHeaders, 
            ...headers 
        };

        // Add access token to headers as backup
        if (this.accessToken) {
            requestHeaders['x-access-token'] = this.accessToken;
        }

        const config = {
            method,
            headers: requestHeaders,
            ...fetchOptions
        };

        // Add body for non-GET requests
        if (body && method !== 'GET') {
            if (body instanceof FormData) {
                // Remove Content-Type for FormData (let browser set it)
                delete config.headers['Content-Type'];
                config.body = body;
            } else {
                config.body = JSON.stringify(body);
            }
        }

        try {
            log.debug(`API Request: ${method} ${endpoint}`, { url, config });

            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), timeout);
            });

            // Race between fetch and timeout
            const response = await Promise.race([
                fetch(url, config),
                timeoutPromise
            ]);

            log.debug(`API Response: ${response.status} ${response.statusText}`);

            // Handle non-ok responses
            if (!response.ok) {
                const errorBody = await response.text();
                let errorData;
                
                try {
                    errorData = JSON.parse(errorBody);
                } catch {
                    errorData = { error: errorBody || 'Unknown error' };
                }

                const error = new Error(errorData.error || `HTTP ${response.status}`);
                error.status = response.status;
                error.statusText = response.statusText;
                error.data = errorData;
                
                throw error;
            }

            // Parse JSON response
            const data = await response.json();
            log.debug('API Response Data', data);
            
            return data;

        } catch (error) {
            const contextualError = errorHandler.handleApiError(error, `${method} ${endpoint}`);
            log.error(`API Error: ${method} ${endpoint}`, error);
            
            // Re-throw with context
            const enhancedError = new Error(contextualError);
            enhancedError.originalError = error;
            enhancedError.endpoint = endpoint;
            enhancedError.method = method;
            
            throw enhancedError;
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        return this._request('GET', endpoint, { params });
    }

    /**
     * POST request
     */
    async post(endpoint, body = null, options = {}) {
        return this._request('POST', endpoint, { body, ...options });
    }

    /**
     * PUT request
     */
    async put(endpoint, body = null, options = {}) {
        return this._request('PUT', endpoint, { body, ...options });
    }

    /**
     * PATCH request
     */
    async patch(endpoint, body = null, options = {}) {
        return this._request('PATCH', endpoint, { body, ...options });
    }

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this._request('DELETE', endpoint, options);
    }

    // === Photo API Methods ===

    /**
     * Get all photos
     */
    async getPhotos() {
        return this.get(CONFIG.API.ENDPOINTS.PHOTOS);
    }

    /**
     * Upload a photo
     */
    async uploadPhoto(file, tag = 'other') {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('tag', tag);

        return this.post(CONFIG.API.ENDPOINTS.UPLOAD, formData);
    }

    /**
     * Update photo people tags
     */
    async updatePhotoPeople(photoId, people, faces = null) {
        const endpoint = CONFIG.API.ENDPOINTS.PEOPLE.replace(':id', photoId);
        return this.patch(endpoint, { people, faces });
    }

    /**
     * Delete a photo
     */
    async deletePhoto(photoId) {
        return this.delete(`${CONFIG.API.ENDPOINTS.PHOTOS}/${photoId}`);
    }

    /**
     * Get gallery statistics
     */
    async getStats() {
        return this.get(CONFIG.API.ENDPOINTS.STATS);
    }

    /**
     * Health check
     */
    async healthCheck() {
        return this.get(CONFIG.API.ENDPOINTS.HEALTH);
    }

    // === Batch Operations ===

    /**
     * Upload multiple photos
     */
    async uploadPhotos(files, tag = 'other', onProgress = null) {
        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            try {
                if (onProgress) {
                    onProgress(i + 1, files.length, files[i].name);
                }

                const result = await this.uploadPhoto(files[i], tag);
                results.push(result);

                log.info(`Photo uploaded: ${files[i].name}`);

            } catch (error) {
                const errorMessage = errorHandler.handleUploadError(error, files[i]);
                errors.push({
                    file: files[i].name,
                    error: errorMessage
                });
                
                log.error(`Photo upload failed: ${files[i].name}`, error);
            }
        }

        return {
            successful: results,
            failed: errors,
            totalFiles: files.length,
            successCount: results.length,
            failureCount: errors.length
        };
    }

    /**
     * Retry failed operations
     */
    async retryOperation(operation, maxRetries = 3, delay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                log.debug(`Attempt ${attempt}/${maxRetries} for operation`);
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    break;
                }

                // Exponential backoff
                const waitTime = delay * Math.pow(2, attempt - 1);
                log.warn(`Operation failed, retrying in ${waitTime}ms`, error);
                
                await Utils.wait(waitTime);
            }
        }

        log.error('Operation failed after all retries', lastError);
        throw lastError;
    }
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export default apiClient;