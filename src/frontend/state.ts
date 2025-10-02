/**
 * Wedding Photo App State Management
 * Centralized state management with event-driven updates
 */

import type { Photo, PhotoTag } from '../types/index';

interface AppState {
    photos: Photo[];
    filteredPhotos: Photo[];
    currentPhotoIndex: number;
    currentFilter: PhotoTag | 'all';
    selectedTag: PhotoTag;
    selectedPerson: string;
    modalOpen: boolean;
    uploadInProgress: boolean;
    faceDetectionInProgress: boolean;
    touchStartX: number;
    touchEndX: number;
    faceApiLoaded: boolean;
    navigationHintShown: boolean;
    // Additional state properties used by main.ts
    accessToken?: string;
    appReady: boolean;
    online: boolean;
    debugMode: boolean;
}

interface StateChange {
    timestamp: number;
    key: string;
    oldValue: any;
    newValue: any;
}

type StateListener<T = any> = (newValue: T, oldValue: T) => void;
type GlobalStateListener = (key: string, newValue: any, oldValue: any) => void;

export class StateManager {
    private state: AppState;
    private listeners: Map<string, (StateListener | GlobalStateListener)[]>;
    private history: StateChange[];

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
    get<K extends keyof AppState>(key?: K): K extends undefined ? AppState : AppState[K] {
        if (key) {
            return this.state[key] as any;
        }
        return { ...this.state } as any;
    }
    
    /**
     * Set state and notify listeners
     */
    set<K extends keyof AppState>(key: K, value: AppState[K]): void {
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
    update(updates: Partial<AppState>): void {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key as keyof AppState, value as any);
        });
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe<K extends keyof AppState>(
        key: K | '*', 
        callback: K extends '*' ? GlobalStateListener : StateListener<AppState[K]>
    ): () => void {
        if (!this.listeners.has(key as string)) {
            this.listeners.set(key as string, []);
        }
        this.listeners.get(key as string)!.push(callback as any);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key as string);
            if (callbacks) {
                const index = callbacks.indexOf(callback as any);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * Notify listeners of state changes
     */
    private notify<K extends keyof AppState>(key: K, newValue: AppState[K], oldValue: AppState[K]): void {
        const callbacks = this.listeners.get(key as string);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    (callback as StateListener)(newValue, oldValue);
                } catch (error) {
                    console.error(`Error in state listener for ${key}:`, error);
                }
            });
        }
        
        // Also notify global listeners
        const globalCallbacks = this.listeners.get('*');
        if (globalCallbacks) {
            globalCallbacks.forEach(callback => {
                try {
                    (callback as GlobalStateListener)(key as string, newValue, oldValue);
                } catch (error) {
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
            this.set(key as keyof AppState, value as any);
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
        } catch (error) {
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
                        (this.state as any)[key] = value;
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to load state from localStorage:', error);
        }
    }
}

// Create and export a singleton instance
export const state = new StateManager();
export default state;