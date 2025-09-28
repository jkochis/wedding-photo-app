/**
 * Wedding Photo App - Main Entry Point
 * Initializes and coordinates all application modules
 */

// Import all modules
import { CONFIG } from './config.js';
import { log } from './logger.js';
import { state } from './state.js';
import Utils from './utils.js';
import themeManager from './theme-manager.js';
import apiClient from './api-client.js';
import photoManager from './photo-manager.js';
import faceDetection from './face-detection.js';
import uploadManager from './upload-manager.js';
import filterManager from './filter-manager.js';
import modalManager from './modal-manager.js';

class WeddingPhotoApp {
    constructor() {
        this.initialized = false;
        this.modules = {};
        
        // Initialize app when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) return;
        
        try {
            log.info('🎉 Wedding Photo App starting up...');
            log.info('Initializing modular architecture');

            // Extract access token from URL
            this.initializeAccessToken();
            
            // Store module references
            this.modules = {
                config: CONFIG,
                log: log,
                state: state,
                utils: Utils,
                themeManager: themeManager,
                apiClient: apiClient,
                photoManager: photoManager,
                faceDetection: faceDetection,
                uploadManager: uploadManager,
                filterManager: filterManager,
                modalManager: modalManager
            };

            // Initialize modules in dependency order
            await this.initializeModules();
            
            // Setup global event handlers
            this.setupGlobalHandlers();
            
            // Load initial data
            await this.loadInitialData();
            
            // Mark as initialized
            this.initialized = true;
            
            log.info('✅ Wedding Photo App initialized successfully');
            
            // Log module status
            this.logModuleStatus();
            
        } catch (error) {
            log.error('❌ Failed to initialize Wedding Photo App', error);
            this.showInitializationError(error);
        }
    }

    /**
     * Wait for essential DOM elements to be available
     */
    async waitForDOMElements() {
        const essentialElements = [
            'uploadArea',
            'fileInput', 
            'photoGrid',
            'emptyState',
            'photoModal'
        ];
        
        const maxWait = 5000; // 5 seconds max
        const checkInterval = 100; // Check every 100ms
        let waited = 0;
        
        while (waited < maxWait) {
            const missing = essentialElements.filter(id => !document.getElementById(id));
            
            if (missing.length === 0) {
                log.debug('All essential DOM elements found');
                return;
            }
            
            log.debug(`Waiting for DOM elements: ${missing.join(', ')}`);
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        log.warn('Some DOM elements may not be available yet');
    }

    /**
     * Initialize access token from URL parameters
     */
    initializeAccessToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (!token) {
            throw new Error('No access token found in URL. Please use the correct access link.');
        }
        
        // Set token in API client
        apiClient.setAccessToken(token);
        
        // Store in state
        state.set('accessToken', token);
        
        log.info('Access token initialized');
    }

    /**
     * Initialize all modules in the correct dependency order
     */
    async initializeModules() {
        log.info('Initializing modules...');

        // Core modules are already initialized via imports
        // Just ensure they're ready
        
        // Initialize API Client (if initialize method exists)
        if (typeof apiClient.initialize === 'function') {
            await apiClient.initialize();
            log.info('✓ API Client initialized');
        } else {
            log.info('✓ API Client ready');
        }
        
        // Initialize Photo Manager (depends on API Client)
        await photoManager.initialize();
        log.info('✓ Photo Manager ready');
        
        // Initialize Face Detection (depends on external library)
        await faceDetection.init();
        log.info('✓ Face Detection ready');
        
        // Wait a bit for DOM elements to be available
        await this.waitForDOMElements();
        
        // Initialize Upload Manager (depends on API Client and Photo Manager)
        uploadManager.init();
        log.info('✓ Upload Manager ready');
        
        // Initialize Filter Manager (depends on Photo Manager)
        filterManager.init();
        log.info('✓ Filter Manager ready');
        
        // Initialize Modal Manager (depends on Photo Manager and Face Detection)
        modalManager.init();
        log.info('✓ Modal Manager ready');
    }

    /**
     * Load initial application data
     */
    async loadInitialData() {
        log.info('Loading initial data...');
        
        try {
            // Load photos (PhotoManager handles this)
            const photos = await photoManager.loadPhotos();
            log.info(`Loaded ${photos.length} photos`);
            
            // Apply initial filters
            filterManager.applyFilters();
            
            // Update UI state
            state.set('appReady', true);
            
        } catch (error) {
            log.error('Failed to load initial data', error);
            // Don't throw - allow app to continue with empty state
        }
    }

    /**
     * Setup global event handlers
     */
    setupGlobalHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            log.error('Global error caught', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error
            });
        });

        // Global unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            log.error('Unhandled promise rejection', event.reason);
            event.preventDefault(); // Prevent console error
        });

        // Beforeunload handler to save state if needed
        window.addEventListener('beforeunload', () => {
            log.info('App unloading, performing cleanup...');
            this.cleanup();
        });

        // Online/offline status
        window.addEventListener('online', () => {
            log.info('Connection restored');
            state.set('online', true);
        });

        window.addEventListener('offline', () => {
            log.warn('Connection lost');
            state.set('online', false);
        });

        // Set initial online status
        state.set('online', navigator.onLine);

        log.debug('Global event handlers setup complete');
    }

    /**
     * Show initialization error to user
     * @param {Error} error - The initialization error
     */
    showInitializationError(error) {
        const errorContainer = document.createElement('div');
        errorContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #f44336;
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        errorContainer.innerHTML = `
            <h1>⚠️ App Initialization Failed</h1>
            <p style="max-width: 600px; text-align: center; margin: 1rem 0;">
                ${error.message || 'An unexpected error occurred while starting the app.'}
            </p>
            <button onclick="window.location.reload()" style="
                background: white;
                color: #f44336;
                border: none;
                padding: 1rem 2rem;
                border-radius: 8px;
                font-size: 1rem;
                cursor: pointer;
                margin-top: 1rem;
            ">
                Reload Page
            </button>
        `;
        
        document.body.appendChild(errorContainer);
    }

    /**
     * Log the status of all modules
     */
    logModuleStatus() {
        const status = {
            config: 'ready',
            state: 'ready',
            logger: 'ready',
            utils: 'ready',
            apiClient: apiClient.getStatus(),
            photoManager: {
                initialized: true,
                photoCount: photoManager.getPhotos().length,
                peopleCount: photoManager.getPeople().length
            },
            faceDetection: faceDetection.getStatus(),
            uploadManager: uploadManager.getStatus(),
            filterManager: filterManager.getCurrentState(),
            modalManager: modalManager.getCurrentState()
        };
        
        log.info('Module status:', status);
    }

    /**
     * Get application status
     * @returns {Object} Application status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            modules: Object.keys(this.modules),
            state: {
                online: state.get('online'),
                appReady: state.get('appReady'),
                photos: photoManager.getPhotos().length,
                filteredPhotos: photoManager.getFilteredPhotos().length
            }
        };
    }

    /**
     * Get application statistics
     * @returns {Object} Application statistics
     */
    getStats() {
        if (!this.initialized) return { error: 'App not initialized' };
        
        return {
            photos: photoManager.getStats(),
            uploads: uploadManager.getStats(),
            filters: filterManager.getFilterStats(),
            modal: modalManager.getStats(),
            faceDetection: faceDetection.getStatus()
        };
    }

    /**
     * Refresh application data
     */
    async refresh() {
        log.info('Refreshing application data...');
        
        try {
            await photoManager.loadPhotos();
            filterManager.applyFilters();
            
            log.info('Application data refreshed');
            
        } catch (error) {
            log.error('Failed to refresh application data', error);
            throw error;
        }
    }

    /**
     * Reset application to initial state
     */
    reset() {
        log.info('Resetting application...');
        
        // Reset modules
        filterManager.reset();
        modalManager.closeModal();
        
        // Clear state
        state.set('currentFilter', 'all');
        state.set('selectedPerson', '');
        state.set('currentPhotoIndex', 0);
        
        log.info('Application reset complete');
    }

    /**
     * Clean up application resources
     */
    cleanup() {
        if (!this.initialized) return;
        
        log.info('Performing cleanup...');
        
        // Cancel any pending uploads
        if (uploadManager.getStatus().isUploading) {
            uploadManager.cancelUploads();
        }
        
        // Close modal if open
        if (modalManager.getCurrentState().isOpen) {
            modalManager.closeModal();
        }
        
        // Save any pending state
        // (Currently we don't persist state, but this is where it would go)
        
        log.info('Cleanup complete');
    }

    /**
     * Enable debug mode
     */
    enableDebugMode() {
        state.set('debugMode', true);
        log.setLevel('debug');
        
        // Add app instance to global scope for debugging
        window.app = this;
        window.modules = this.modules;
        
        log.info('Debug mode enabled. App available as window.app, modules as window.modules');
    }

    /**
     * Disable debug mode
     */
    disableDebugMode() {
        state.set('debugMode', false);
        log.setLevel('info');
        
        delete window.app;
        delete window.modules;
        
        log.info('Debug mode disabled');
    }
}

// Initialize the app
const app = new WeddingPhotoApp();

// Export for potential external access
export default app;

// Also add to global scope if in development
if (CONFIG.DEBUG.ENABLE_GLOBAL_ACCESS) {
    window.app = app;
}

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            log.info('ServiceWorker registered successfully', {
                scope: registration.scope
            });
        } catch (error) {
            log.warn('ServiceWorker registration failed', error);
        }
    });
}