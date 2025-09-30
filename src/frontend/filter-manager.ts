/**
 * Wedding Photo App Filter Manager
 * Handles photo filtering by category and people, manages filter UI state
 */

import { CONFIG } from './config.js';
import { log } from './logger.js';
import { state } from './state.js';
import photoManager from './photo-manager.js';
import type { Photo, PhotoTag } from './types/index.js';

interface FilterStats {
    totalPhotos: number;
    filteredPhotos: number;
    currentCategoryFilter: PhotoTag | 'all';
    currentPersonFilter: string;
    byCategory: Record<string, number>;
    byPerson: Record<string, number>;
    filtersActive: boolean;
}

interface AvailableFilters {
    categories: string[];
    people: string[];
    totalCategories: number;
    totalPeople: number;
}

interface FilterState {
    categoryFilter: PhotoTag | 'all';
    personFilter: string;
    hasActiveFilters: boolean;
    availableFilters: AvailableFilters;
    stats: FilterStats;
}

export class FilterManager {
    private currentCategoryFilter: PhotoTag | 'all';
    private currentPersonFilter: string;
    private isInitialized: boolean;

    constructor() {
        this.currentCategoryFilter = 'all';
        this.currentPersonFilter = '';
        this.isInitialized = false;
        this.init();
    }
    /**
     * Initialize filter manager
     */
    public init(): void {
        if (this.isInitialized) return;
        
        log.info('Initializing Filter Manager');
        this.setupEventListeners();
        this.setupStateSubscriptions();
        this.updateFilterUI();
        this.isInitialized = true;
        log.info('Filter Manager initialized');
    }

    /**
     * Setup event listeners for filter UI elements
     */
    private setupEventListeners(): void {
        // Category filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const filter = target.dataset.filter as PhotoTag | 'all';
                if (filter) {
                    this.setCategoryFilter(filter);
                }
            });
        });

        // People filter dropdown
        const peopleFilter = document.getElementById('peopleFilter') as HTMLSelectElement;
        if (peopleFilter) {
            peopleFilter.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLSelectElement;
                this.setPersonFilter(target.value);
            });
        }
        
        log.debug('Filter event listeners setup complete');
    }
    /**
     * Setup state subscriptions
     */
    private setupStateSubscriptions(): void {
        // Subscribe to photos changes to update people filter options
        state.subscribe('photos', () => {
            this.updatePeopleFilterOptions();
        });

        // Subscribe to filteredPhotos changes to update gallery display
        state.subscribe('filteredPhotos', (newFilteredPhotos: Photo[]) => {
            if (newFilteredPhotos) {
                this.updateGalleryDisplay(newFilteredPhotos);
            }
        });

        // Subscribe to filter changes
        state.subscribe('currentFilter', (newFilter: PhotoTag | 'all') => {
            this.currentCategoryFilter = newFilter;
            this.updateCategoryFilterUI();
        });

        state.subscribe('selectedPerson', (newPerson: string) => {
            this.currentPersonFilter = newPerson || '';
            this.updatePersonFilterUI();
        });

        log.debug('Filter state subscriptions setup complete');
    }

    /**
     * Set category filter
     */
    public setCategoryFilter(filter: PhotoTag | 'all'): void {
        if (this.currentCategoryFilter === filter) {
            return; // No change needed
        }
        
        log.info('Setting category filter', { from: this.currentCategoryFilter, to: filter });
        this.currentCategoryFilter = filter;
        
        // Update state
        state.set('currentFilter', filter);
        
        // Update UI
        this.updateCategoryFilterUI();
        
        // Apply filters
        this.applyFilters();
        
        // Log filter statistics
        this.logFilterStats();
    }

    /**
     * Set person filter
     */
    public setPersonFilter(person: string): void {
        if (this.currentPersonFilter === person) {
            return; // No change needed
        }
        
        log.info('Setting person filter', { from: this.currentPersonFilter, to: person });
        this.currentPersonFilter = person;
        
        // Update state
        state.set('selectedPerson', person);
        
        // Update UI
        this.updatePersonFilterUI();
        
        // Apply filters
        this.applyFilters();
        
        // Log filter statistics
        this.logFilterStats();
    }
    /**
     * Clear all filters
     */
    public clearFilters(): void {
        log.info('Clearing all filters');
        this.setCategoryFilter('all');
        this.setPersonFilter('');
    }

    /**
     * Apply current filters to photos
     */
    public applyFilters(): void {
        if (!photoManager) {
            log.warn('PhotoManager not available for filtering');
            return;
        }
        
        // PhotoManager handles the actual filtering logic
        // We just need to trigger the update
        photoManager.updateFilteredPhotos();
        const filteredPhotos = photoManager.getFilteredPhotos();
        
        log.debug('Filters applied', {
            categoryFilter: this.currentCategoryFilter,
            personFilter: this.currentPersonFilter,
            resultCount: filteredPhotos.length,
            totalPhotos: photoManager.getPhotos().length
        });
        
        // Update gallery display
        this.updateGalleryDisplay(filteredPhotos);
    }
    /**
     * Update gallery display with filtered photos
     */
    private updateGalleryDisplay(filteredPhotos: Photo[]): void {
        const photoGrid = document.getElementById('photoGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!photoGrid || !emptyState) {
            log.warn('Gallery elements not found');
            return;
        }
        
        // Show/hide empty state
        if (filteredPhotos.length === 0) {
            photoGrid.style.display = 'none';
            emptyState.classList.remove('hidden');
            this.updateEmptyStateMessage();
        } else {
            photoGrid.style.display = 'grid';
            emptyState.classList.add('hidden');
        }
        
        // Clear existing photos
        photoGrid.innerHTML = '';
        
        // Add filtered photos to gallery
        filteredPhotos.forEach((photo, index) => {
            const photoElement = this.createPhotoElement(photo, index);
            photoGrid.appendChild(photoElement);
        });
        
        log.debug('Gallery display updated', { photoCount: filteredPhotos.length });
    }
    /**
     * Create a photo element for display
     */
    private createPhotoElement(photo: Photo, index: number): HTMLElement {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        
        const tagEmoji = CONFIG.UI.PHOTO_TAGS;
        const emoji = tagEmoji[photo.tag] || '📷';
        
        photoItem.innerHTML = `
            <img src="${photo.url}" alt="Wedding photo" loading="lazy">
            <div class="photo-tag-overlay">
                ${emoji} ${this.capitalizeFirst(photo.tag)}
            </div>
        `;
        
        // Add click handler to open modal
        photoItem.addEventListener('click', () => {
            this.openPhotoModal(photo, index);
        });
        
        return photoItem;
    }

    /**
     * Open photo modal (delegates to modal manager if available)
     */
    private openPhotoModal(photo: Photo, index: number): void {
        // Set current photo index in state
        state.set('currentPhotoIndex', index);
        
        // Dispatch custom event for modal opening
        const modalEvent = new CustomEvent('openPhotoModal', {
            detail: { photo, index }
        });
        
        document.dispatchEvent(modalEvent);
        log.debug('Photo modal open requested', { photoId: photo.id, index });
    }
    /**
     * Update category filter UI
     */
    private updateCategoryFilterUI(): void {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            const element = btn as HTMLElement;
            const btnFilter = element.dataset.filter;
            element.classList.toggle('active', btnFilter === this.currentCategoryFilter);
        });
        log.debug('Category filter UI updated', { active: this.currentCategoryFilter });
    }

    /**
     * Update person filter UI
     */
    private updatePersonFilterUI(): void {
        const peopleFilter = document.getElementById('peopleFilter') as HTMLSelectElement;
        if (peopleFilter) {
            peopleFilter.value = this.currentPersonFilter;
        }
        log.debug('Person filter UI updated', { active: this.currentPersonFilter });
    }

    /**
     * Update all filter UI elements
     */
    private updateFilterUI(): void {
        this.updateCategoryFilterUI();
        this.updatePersonFilterUI();
        this.updatePeopleFilterOptions();
    }
    /**
     * Update people filter dropdown options
     */
    private updatePeopleFilterOptions(): void {
        const peopleFilter = document.getElementById('peopleFilter') as HTMLSelectElement;
        if (!peopleFilter) return;
        
        const photos = photoManager.getPhotos();
        
        // Get all unique people names from all photos
        const allPeople = new Set<string>();
        photos.forEach(photo => {
            if (photo.people && Array.isArray(photo.people)) {
                photo.people.forEach(person => allPeople.add(person));
            }
        });
        
        // Clear existing options except "All People"
        peopleFilter.innerHTML = '<option value="">All People</option>';
        
        // Add options for each person
        const sortedPeople = Array.from(allPeople).sort();
        sortedPeople.forEach(person => {
            const option = document.createElement('option');
            option.value = person;
            option.textContent = `👤 ${person}`;
            
            // Keep current selection if it still exists
            if (person === this.currentPersonFilter) {
                option.selected = true;
            }
            
            peopleFilter.appendChild(option);
        });
        
        // If current person filter no longer exists, clear it
        if (this.currentPersonFilter && !allPeople.has(this.currentPersonFilter)) {
            this.setPersonFilter('');
        }
        
        log.debug('People filter options updated', {
            peopleCount: sortedPeople.length,
            people: sortedPeople
        });
    }
    /**
     * Update empty state message based on current filters
     */
    updateEmptyStateMessage() {
        const emptyState = document.getElementById('emptyState');
        if (!emptyState)
            return;
        const iconEl = emptyState.querySelector('.empty-icon');
        const titleEl = emptyState.querySelector('h3');
        const messageEl = emptyState.querySelector('p');
        if (!iconEl || !titleEl || !messageEl)
            return;
        let icon = '📱';
        let title = 'No photos found';
        let message = 'No photos match the current filters.';
        // Customize message based on active filters
        if (this.currentCategoryFilter !== 'all' && this.currentPersonFilter) {
            title = 'No matching photos';
            message = `No photos found for ${this.currentPersonFilter} in ${this.currentCategoryFilter} category.`;
            icon = '🔍';
        }
        else if (this.currentCategoryFilter !== 'all') {
            title = 'No photos in this category';
            message = `No photos found in the ${this.currentCategoryFilter} category yet.`;
            icon = '📂';
        }
        else if (this.currentPersonFilter) {
            title = 'No photos found';
            message = `No photos found with ${this.currentPersonFilter}.`;
            icon = '👤';
        }
        else {
            // No filters active, show default message
            title = 'No photos yet';
            message = 'Be the first to share a photo from the wedding!';
            icon = '📱';
        }
        iconEl.textContent = icon;
        titleEl.textContent = title;
        messageEl.textContent = message;
    }
    /**
     * Get filter statistics
     */
    public getFilterStats(): FilterStats {
        const photos = photoManager.getPhotos();
        const filteredPhotos = photoManager.getFilteredPhotos();
        
        const stats: FilterStats = {
            totalPhotos: photos.length,
            filteredPhotos: filteredPhotos.length,
            currentCategoryFilter: this.currentCategoryFilter,
            currentPersonFilter: this.currentPersonFilter,
            byCategory: {},
            byPerson: {},
            filtersActive: this.hasActiveFilters()
        };
        
        // Calculate photos by category
        Object.keys(CONFIG.UI.PHOTO_TAGS).forEach(tag => {
            stats.byCategory[tag] = photos.filter(p => p.tag === tag).length;
        });
        
        // Calculate photos by person
        const allPeople = photoManager.getPeople();
        allPeople.forEach(person => {
            stats.byPerson[person] = photos.filter(p => 
                p.people && p.people.includes(person)
            ).length;
        });
        
        return stats;
    }

    /**
     * Check if any filters are currently active
     */
    public hasActiveFilters(): boolean {
        return this.currentCategoryFilter !== 'all' || this.currentPersonFilter !== '';
    }
    /**
     * Log current filter statistics
     */
    private logFilterStats(): void {
        const stats = this.getFilterStats();
        log.debug('Filter statistics', stats);
        if (CONFIG.DEBUG.VERBOSE_FILTERING) {
            log.info('Detailed filter results', {
                showing: `${stats.filteredPhotos}/${stats.totalPhotos} photos`,
                categoryFilter: stats.currentCategoryFilter,
                personFilter: stats.currentPersonFilter || 'none',
                filtersActive: stats.filtersActive
            });
        }
    }

    /**
     * Get available filter options
     */
    public getAvailableFilters(): AvailableFilters {
        const photos = photoManager.getPhotos();
        const categories = Object.keys(CONFIG.UI.PHOTO_TAGS);
        const people = photoManager.getPeople();
        
        const availableCategories = categories.filter(category => {
            if (category === 'all') return true;
            return photos.some(photo => photo.tag === category);
        });
        
        return {
            categories: availableCategories,
            people: people,
            totalCategories: categories.length,
            totalPeople: people.length
        };
    }
    /**
     * Search photos by text query
     */
    public searchPhotos(query: string): Photo[] {
        return photoManager.searchPhotos(query);
    }

    /**
     * Get photos for a specific date
     */
    public getPhotosByDate(date: Date | string): Photo[] {
        return photoManager.getPhotosByDate(date);
    }

    /**
     * Apply quick filter presets
     */
    public applyPreset(preset: string): void {
        log.info('Applying filter preset:', preset);
        switch (preset) {
            case 'today':
                this.clearFilters();
                // Could implement date-based filtering here
                break;
            case 'wedding-ceremony':
                this.setCategoryFilter('wedding');
                this.setPersonFilter('');
                break;
            case 'reception-party':
                this.setCategoryFilter('reception');
                this.setPersonFilter('');
                break;
            case 'all-photos':
                this.clearFilters();
                break;
            default:
                log.warn('Unknown filter preset:', preset);
        }
    }
    /**
     * Utility function to capitalize first letter
     */
    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    /**
     * Get current filter state
     */
    public getCurrentState(): FilterState {
        return {
            categoryFilter: this.currentCategoryFilter,
            personFilter: this.currentPersonFilter,
            hasActiveFilters: this.hasActiveFilters(),
            availableFilters: this.getAvailableFilters(),
            stats: this.getFilterStats()
        };
    }

    /**
     * Reset filters to default state
     */
    public reset(): void {
        log.info('Resetting filters to default state');
        this.currentCategoryFilter = 'all';
        this.currentPersonFilter = '';
        
        state.update({
            currentFilter: 'all' as PhotoTag | 'all',
            selectedPerson: ''
        });
        
        this.updateFilterUI();
        this.applyFilters();
    }
    /**
     * Destroy filter manager and cleanup
     */
    public destroy(): void {
        // Remove event listeners would go here if we stored them
        // For now, just log the destruction
        log.info('Filter Manager destroyed');
        this.isInitialized = false;
    }
}
// Create and export singleton instance
export const filterManager = new FilterManager();
export default filterManager;
