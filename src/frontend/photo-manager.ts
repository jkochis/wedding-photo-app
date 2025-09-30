/**
 * Wedding Photo App Photo Manager
 * Centralized photo data management, filtering, and operations
 */

import { CONFIG } from './config.js';
import { log } from './logger.js';
import { state } from './state.js';
import apiClient from './api-client.js';
import Utils from './utils.js';
import type { Photo } from '../../src/types/index.js';

export class PhotoManager {
    private photos: Photo[];
    private filteredPhotos: Photo[];
    private people: Set<string>;
    private subscriptions: (() => void)[];

    constructor() {
        this.photos = [];
        this.filteredPhotos = [];
        this.people = new Set();
        
        // Subscribe to state changes
        this.subscriptions = [];
        this.setupStateSubscriptions();
    }

    /**
     * Setup state subscriptions
     */
    setupStateSubscriptions() {
        // Listen for filter changes
        this.subscriptions.push(
            state.subscribe('currentFilter', () => this.updateFilteredPhotos()),
            state.subscribe('selectedPerson', () => this.updateFilteredPhotos())
        );
    }

    /**
     * Initialize the photo manager
     */
    async initialize() {
        log.info('Initializing PhotoManager');
        
        try {
            await this.loadPhotos();
            this.extractPeopleFromPhotos();
            this.updateFilteredPhotos();
            
            log.info(`PhotoManager initialized with ${this.photos.length} photos`);
        } catch (error) {
            log.error('Failed to initialize PhotoManager', error);
            throw error;
        }
    }

    /**
     * Load all photos from the server
     */
    async loadPhotos() {
        try {
            log.info('Loading photos from server');
            
            const photos = await apiClient.getPhotos();
            this.setPhotos(photos);
            
            // Update state
            state.set('photos', photos);
            
            log.info(`Loaded ${photos.length} photos`);
            return photos;
            
        } catch (error) {
            log.error('Failed to load photos', error);
            throw error;
        }
    }

    /**
     * Set photos and update internal state
     */
    setPhotos(photos: Photo[]): void {
        this.photos = photos || [];
        this.extractPeopleFromPhotos();
        this.updateFilteredPhotos();
        
        // Notify state
        state.update({
            photos: this.photos,
            filteredPhotos: this.filteredPhotos
        });
    }

    /**
     * Get all photos
     */
    getPhotos(): Photo[] {
        return [...this.photos]; // Return copy to prevent mutations
    }

    /**
     * Get filtered photos
     */
    getFilteredPhotos(): Photo[] {
        return [...this.filteredPhotos];
    }

    /**
     * Get photo by ID
     */
    getPhotoById(id: string): Photo | undefined {
        return this.photos.find(photo => photo.id === id);
    }

    /**
     * Add a new photo
     */
    addPhoto(photo: Photo): boolean {
        if (!photo || !photo.id) {
            log.warn('Cannot add invalid photo', photo);
            return false;
        }

        // Check if photo already exists
        const existingIndex = this.photos.findIndex(p => p.id === photo.id);
        
        if (existingIndex >= 0) {
            // Update existing photo
            this.photos[existingIndex] = photo;
            log.info(`Updated existing photo: ${photo.id}`);
        } else {
            // Add new photo
            this.photos.push(photo);
            log.info(`Added new photo: ${photo.id}`);
        }

        this.extractPeopleFromPhotos();
        this.updateFilteredPhotos();
        
        // Update state
        state.update({
            photos: this.photos,
            filteredPhotos: this.filteredPhotos
        });

        return true;
    }

    /**
     * Remove a photo
     */
    removePhoto(photoId: string): Photo | null {
        const index = this.photos.findIndex(p => p.id === photoId);
        
        if (index >= 0) {
            const removedPhoto = this.photos.splice(index, 1)[0];
            log.info(`Removed photo: ${photoId}`);
            
            this.extractPeopleFromPhotos();
            this.updateFilteredPhotos();
            
            // Update state
            state.update({
                photos: this.photos,
                filteredPhotos: this.filteredPhotos
            });
            
            return removedPhoto;
        }
        
        log.warn(`Photo not found for removal: ${photoId}`);
        return null;
    }

    /**
     * Update photo metadata
     */
    updatePhoto(photoId: string, updates: Partial<Photo>): boolean {
        const photo = this.getPhotoById(photoId);
        
        if (!photo) {
            log.warn(`Photo not found for update: ${photoId}`);
            return false;
        }

        // Apply updates
        Object.assign(photo, updates);
        
        log.info(`Updated photo: ${photoId}`, updates);
        
        // If people were updated, refresh the people list
        if (updates.people || updates.faces) {
            this.extractPeopleFromPhotos();
        }
        
        this.updateFilteredPhotos();
        
        // Update state
        state.update({
            photos: this.photos,
            filteredPhotos: this.filteredPhotos
        });
        
        return true;
    }

    /**
     * Extract all people from photos and update the people set
     */
    extractPeopleFromPhotos(): string[] {
        const peopleSet = new Set<string>();
        
        this.photos.forEach(photo => {
            if (photo.people && Array.isArray(photo.people)) {
                photo.people.forEach(person => {
                    if (person && person.trim()) {
                        peopleSet.add(person.trim());
                    }
                });
            }
        });
        
        this.people = peopleSet;
        log.debug(`Extracted ${peopleSet.size} unique people from photos`);
        
        return Array.from(peopleSet).sort();
    }

    /**
     * Get all people mentioned in photos
     */
    getPeople() {
        return Array.from(this.people).sort();
    }

    /**
     * Update filtered photos based on current filters
     */
    updateFilteredPhotos() {
        const currentFilter = state.get('currentFilter');
        const selectedPerson = state.get('selectedPerson');
        
        let filtered = [...this.photos];
        
        // Apply category filter
        if (currentFilter && currentFilter !== 'all') {
            filtered = filtered.filter(photo => photo.tag === currentFilter);
        }
        
        // Apply people filter
        if (selectedPerson) {
            filtered = filtered.filter(photo => 
                photo.people && 
                Array.isArray(photo.people) && 
                photo.people.includes(selectedPerson)
            );
        }
        
        this.filteredPhotos = filtered;
        
        log.debug(`Filtered photos: ${filtered.length}/${this.photos.length}`, {
            categoryFilter: currentFilter,
            personFilter: selectedPerson
        });
        
        // Update state
        state.set('filteredPhotos', this.filteredPhotos);
        
        return this.filteredPhotos;
    }

    /**
     * Get photos by tag
     */
    getPhotosByTag(tag: string): Photo[] {
        return this.photos.filter(photo => photo.tag === tag);
    }

    /**
     * Get photos by person
     */
    getPhotosByPerson(person: string): Photo[] {
        return this.photos.filter(photo => 
            photo.people && 
            Array.isArray(photo.people) && 
            photo.people.includes(person)
        );
    }

    /**
     * Get photos uploaded on a specific date
     */
    getPhotosByDate(date: string | Date): Photo[] {
        const targetDate = new Date(date).toDateString();
        return this.photos.filter(photo => {
            const photoDate = new Date(photo.uploadedAt).toDateString();
            return photoDate === targetDate;
        });
    }

    /**
     * Get statistics about the photo collection
     */
    getStats() {
        const stats = {
            totalPhotos: this.photos.length,
            totalPeople: this.people.size,
            byTag: {} as Record<string, number>,
            byPerson: {} as Record<string, number>,
            uploadedToday: 0,
            totalSize: 0,
            totalSizeFormatted: ''
        };

        // Calculate tag distribution
        Object.keys(CONFIG.UI.PHOTO_TAGS).forEach(tag => {
            stats.byTag[tag] = this.getPhotosByTag(tag).length;
        });

        // Calculate person distribution
        this.getPeople().forEach(person => {
            stats.byPerson[person] = this.getPhotosByPerson(person).length;
        });

        // Calculate photos uploaded today
        const today = new Date().toDateString();
        stats.uploadedToday = this.photos.filter(photo => {
            const photoDate = new Date(photo.uploadedAt).toDateString();
            return photoDate === today;
        }).length;

        // Calculate total size
        stats.totalSize = this.photos.reduce((sum, photo) => sum + (photo.size || 0), 0);
        stats.totalSizeFormatted = Utils.formatFileSize(stats.totalSize);

        return stats;
    }

    /**
     * Search photos by text (in people names, tags, etc.)
     */
    searchPhotos(query: string): Photo[] {
        if (!query || !query.trim()) {
            return this.photos;
        }

        const searchTerm = query.toLowerCase().trim();
        
        return this.photos.filter(photo => {
            // Search in tag
            if (photo.tag && photo.tag.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Search in people
            if (photo.people && Array.isArray(photo.people)) {
                return photo.people.some(person => 
                    person.toLowerCase().includes(searchTerm)
                );
            }
            
            // Search in filename
            if (photo.originalName && photo.originalName.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            return false;
        });
    }

    /**
     * Sort photos by various criteria
     */
    sortPhotos(criteria = 'uploadedAt', order = 'desc') {
        const sorted = [...this.filteredPhotos].sort((a, b) => {
            let aVal, bVal;
            
            switch (criteria) {
                case 'uploadedAt':
                    aVal = new Date(a.uploadedAt);
                    bVal = new Date(b.uploadedAt);
                    break;
                case 'size':
                    aVal = a.size || 0;
                    bVal = b.size || 0;
                    break;
                case 'tag':
                    aVal = a.tag || '';
                    bVal = b.tag || '';
                    break;
                case 'name':
                    aVal = a.originalName || '';
                    bVal = b.originalName || '';
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }

    /**
     * Clean up subscriptions
     */
    destroy() {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions = [];
        
        log.info('PhotoManager destroyed');
    }
}

// Create and export singleton instance
export const photoManager = new PhotoManager();
export default photoManager;