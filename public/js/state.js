/**
 * Wedding Photo App State Management
 * Centralized state management with event-driven updates
 */
export class StateManager {
    state;
    listeners;
    history;
    constructor() {
        this.state = {
            // Photo data
            photos: [],
            filteredPhotos: [],
            currentPhotoIndex: 0,
            // Filters
            currentFilter: 'all',
            selectedTag: 'wedding',
            selectedPerson: '',
            // UI state
            modalOpen: false,
            uploadInProgress: false,
            faceDetectionInProgress: false,
            // Touch/navigation
            touchStartX: 0,
            touchEndX: 0,
            // Face detection
            faceApiLoaded: false,
            // User preferences
            navigationHintShown: false,
            // App state
            appReady: false,
            online: navigator.onLine,
            debugMode: false
        };
        this.listeners = new Map();
        this.history = [];
    }
    /**
     * Get current state or specific property
     */
    get(key) {
        if (key) {
            return this.state[key];
        }
        return { ...this.state };
    }
    /**
     * Set state and notify listeners
     */
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        // Add to history for debugging
        this.history.push({
            timestamp: Date.now(),
            key,
            oldValue,
            newValue: value
        });
        // Keep history size manageable
        if (this.history.length > 100) {
            this.history.shift();
        }
        // Notify listeners
        this.notify(key, value, oldValue);
    }
    /**
     * Update multiple state properties at once
     */
    update(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
    }
    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    /**
     * Notify listeners of state changes
     */
    notify(key, newValue, oldValue) {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(newValue, oldValue);
                }
                catch (error) {
                    console.error(`Error in state listener for ${key}:`, error);
                }
            });
        }
        // Also notify global listeners
        const globalCallbacks = this.listeners.get('*');
        if (globalCallbacks) {
            globalCallbacks.forEach(callback => {
                try {
                    callback(key, newValue, oldValue);
                }
                catch (error) {
                    console.error('Error in global state listener:', error);
                }
            });
        }
    }
    /**
     * Get state history for debugging
     */
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }
    /**
     * Clear state history
     */
    clearHistory() {
        this.history = [];
    }
    /**
     * Reset state to initial values
     */
    reset() {
        const initialState = {
            photos: [],
            filteredPhotos: [],
            currentPhotoIndex: 0,
            currentFilter: 'all',
            selectedTag: 'wedding',
            selectedPerson: '',
            modalOpen: false,
            uploadInProgress: false,
            faceDetectionInProgress: false,
            touchStartX: 0,
            touchEndX: 0,
            faceApiLoaded: false,
            navigationHintShown: false,
            appReady: false,
            online: navigator.onLine,
            debugMode: false
        };
        Object.entries(initialState).forEach(([key, value]) => {
            this.set(key, value);
        });
    }
    /**
     * Save persistent state to localStorage
     */
    savePersistentState() {
        const persistentData = {
            navigationHintShown: this.state.navigationHintShown,
            selectedTag: this.state.selectedTag
        };
        try {
            localStorage.setItem('weddingPhotoAppState', JSON.stringify(persistentData));
        }
        catch (error) {
            console.warn('Failed to save state to localStorage:', error);
        }
    }
    /**
     * Load persistent state from localStorage
     */
    loadPersistentState() {
        try {
            const saved = localStorage.getItem('weddingPhotoAppState');
            if (saved) {
                const persistentData = JSON.parse(saved);
                Object.entries(persistentData).forEach(([key, value]) => {
                    if (this.state.hasOwnProperty(key)) {
                        this.state[key] = value;
                    }
                });
            }
        }
        catch (error) {
            console.warn('Failed to load state from localStorage:', error);
        }
    }
}
// Create and export a singleton instance
export const state = new StateManager();
export default state;
//# sourceMappingURL=state.js.map