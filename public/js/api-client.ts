/**
 * Wedding Photo App API Client
 * Centralized API communication with error handling and authentication
 */

import { CONFIG } from './config.js';
import { log, errorHandler } from './logger.js';
import Utils from './utils.js';
import type { Photo, ApiResponse, UploadResponse } from '../../src/types/index.js';

interface ApiClientOptions {
    baseURL?: string;
    accessToken?: string;
}

interface ApiClientStatus {
    initialized: boolean;
    hasToken: boolean;
    baseURL: string;
}

interface RequestOptions {
    params?: Record<string, any>;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    [key: string]: any;
}

export class ApiClient {
    private baseURL: string;
    private accessToken: string | null;
    private defaultHeaders: Record<string, string>;
    private isInitialized: boolean;

    constructor(options: ApiClientOptions = {}) {
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
    async initialize(): Promise<void> {
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
    getStatus(): ApiClientStatus {
        return {
            initialized: this.isInitialized,
            hasToken: !!this.accessToken,
            baseURL: this.baseURL
        };
    }

    /**
     * Set or update access token
     */
    setAccessToken(token: string): void {
        this.accessToken = token;
        log.info('Access token updated');
    }

    /**
     * Get current access token
     */
    getAccessToken(): string | null {
        return this.accessToken;
    }

    /**
     * Build URL with query parameters
     */
    private _buildUrl(endpoint: string, params: Record<string, any> = {}): string {
        const url = new URL(endpoint, window.location.origin);
        
        // Always include access token
        if (this.accessToken) {
            params.token = this.accessToken;
        }

        // Add other parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, String(value));
            }
        });

        return url.toString();
    }

    /**
     * Generic request method with error handling
     */
    private async _request<T = any>(
        method: string, 
        endpoint: string, 
        options: RequestOptions = {}
    ): Promise<T> {
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

        const config: RequestInit = {
            method,
            headers: requestHeaders,
            ...fetchOptions
        };

        // Add body for non-GET requests
        if (body && method !== 'GET') {
            if (body instanceof FormData) {
                // Remove Content-Type for FormData (let browser set it)
                delete (config.headers as Record<string, string>)['Content-Type'];
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
            ]) as Response;

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

                const error = new Error(errorData.error || `HTTP ${response.status}`) as any;
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
            const enhancedError = new Error(contextualError) as any;
            enhancedError.originalError = error;
            enhancedError.endpoint = endpoint;
            enhancedError.method = method;
            
            throw enhancedError;
        }
    }

    /**
     * GET request
     */
    async get<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
        return this._request<T>('GET', endpoint, { params });
    }

    /**
     * POST request
     */
    async post<T = any>(endpoint: string, body: any = null, options: RequestOptions = {}): Promise<T> {
        return this._request<T>('POST', endpoint, { body, ...options });
    }

    /**
     * PUT request
     */
    async put<T = any>(endpoint: string, body: any = null, options: RequestOptions = {}): Promise<T> {
        return this._request<T>('PUT', endpoint, { body, ...options });
    }

    /**
     * PATCH request
     */
    async patch<T = any>(endpoint: string, body: any = null, options: RequestOptions = {}): Promise<T> {
        return this._request<T>('PATCH', endpoint, { body, ...options });
    }

    /**
     * DELETE request
     */
    async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        return this._request<T>('DELETE', endpoint, options);
    }

    // === Photo API Methods ===

    /**
     * Get all photos
     */
    async getPhotos(): Promise<Photo[]> {
        return this.get<Photo[]>(CONFIG.API.ENDPOINTS.PHOTOS);
    }

    /**
     * Upload a photo
     */
    async uploadPhoto(file: File, tag: string = 'other'): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('tag', tag);

        return this.post<UploadResponse>(CONFIG.API.ENDPOINTS.UPLOAD, formData);
    }

    /**
     * Update photo people tags
     */
    async updatePhotoPeople(
        photoId: string, 
        people: string[], 
        faces: any[] | null = null
    ): Promise<Photo> {
        const endpoint = CONFIG.API.ENDPOINTS.PEOPLE.replace(':id', photoId);
        return this.patch<Photo>(endpoint, { people, faces });
    }

    /**
     * Delete a photo
     */
    async deletePhoto(photoId: string): Promise<void> {
        return this.delete<void>(`${CONFIG.API.ENDPOINTS.PHOTOS}/${photoId}`);
    }

    /**
     * Get gallery statistics
     */
    async getStats(): Promise<any> {
        return this.get(CONFIG.API.ENDPOINTS.STATS);
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<any> {
        return this.get(CONFIG.API.ENDPOINTS.HEALTH);
    }

    // === Batch Operations ===

    /**
     * Upload multiple photos
     */
    async uploadPhotos(
        files: File[], 
        tag: string = 'other', 
        onProgress: ((current: number, total: number, filename: string) => void) | null = null
    ) {
        const results: UploadResponse[] = [];
        const errors: { file: string; error: string }[] = [];

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
    async retryOperation<T>(
        operation: () => Promise<T>, 
        maxRetries: number = 3, 
        delay: number = 1000
    ): Promise<T> {
        let lastError: any;

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