/**
 * Wedding Photo App Filter Manager
 * Handles photo filtering by category and people, manages filter UI state
 */

import { CONFIG } from './config.js';
import { log } from './logger.js';
import { state } from './state.js';
import photoManager from './photo-manager.js';

export class FilterManager {
    constructor() {
        this.currentCategoryFilter = 'all';
        this.currentPersonFilter = '';
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize filter manager
     */
    init() {
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
    setupEventListeners() {
        // Category filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setCategoryFilter(filter);
            });
        });

        // People filter dropdown
        const peopleFilter = document.getElementById('peopleFilter');
        if (peopleFilter) {
            peopleFilter.addEventListener('change', (e) => {
                this.setPersonFilter(e.target.value);
            });
        }

        log.debug('Filter event listeners setup complete');
    }

    /**
     * Setup state subscriptions
     */
    setupStateSubscriptions() {
        // Subscribe to photos changes to update people filter options
        state.subscribe('photos', () => {
            this.updatePeopleFilterOptions();
        });

        // Subscribe to filter changes
        state.subscribe('currentFilter', (newFilter) => {
            this.currentCategoryFilter = newFilter;
            this.updateCategoryFilterUI();
        });

        state.subscribe('selectedPerson', (newPerson) => {
            this.currentPersonFilter = newPerson || '';
            this.updatePersonFilterUI();
        });

        log.debug('Filter state subscriptions setup complete');
    }

    /**
     * Set category filter
     * @param {string} filter - Filter category ('all', 'wedding', 'reception', 'other')
     */
    setCategoryFilter(filter) {
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
     * @param {string} person - Person name to filter by (empty string for all people)
     */
    setPersonFilter(person) {
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
    clearFilters() {
        log.info('Clearing all filters');
        
        this.setCategoryFilter('all');
        this.setPersonFilter('');
    }

    /**
     * Apply current filters to photos
     */
    applyFilters() {
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
     * @param {Array} filteredPhotos - Array of filtered photos
     */
    updateGalleryDisplay(filteredPhotos) {
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
     * @param {Object} photo - Photo object
     * @param {number} index - Photo index
     * @returns {HTMLElement} Photo element
     */
    createPhotoElement(photo, index) {
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
     * @param {Object} photo - Photo object
     * @param {number} index - Photo index
     */
    openPhotoModal(photo, index) {
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
    updateCategoryFilterUI() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(btn => {
            const btnFilter = btn.dataset.filter;
            btn.classList.toggle('active', btnFilter === this.currentCategoryFilter);
        });

        log.debug('Category filter UI updated', { active: this.currentCategoryFilter });
    }

    /**
     * Update person filter UI
     */
    updatePersonFilterUI() {
        const peopleFilter = document.getElementById('peopleFilter');
        
        if (peopleFilter) {
            peopleFilter.value = this.currentPersonFilter;
        }

        log.debug('Person filter UI updated', { active: this.currentPersonFilter });
    }

    /**
     * Update all filter UI elements
     */
    updateFilterUI() {
        this.updateCategoryFilterUI();
        this.updatePersonFilterUI();
        this.updatePeopleFilterOptions();
    }

    /**
     * Update people filter dropdown options
     */
    updatePeopleFilterOptions() {
        const peopleFilter = document.getElementById('peopleFilter');
        if (!peopleFilter) return;

        const photos = photoManager.getPhotos();
        
        // Get all unique people names from all photos
        const allPeople = new Set();
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
        if (!emptyState) return;

        const iconEl = emptyState.querySelector('.empty-icon');
        const titleEl = emptyState.querySelector('h3');
        const messageEl = emptyState.querySelector('p');

        if (!iconEl || !titleEl || !messageEl) return;

        let icon = '📱';
        let title = 'No photos found';
        let message = 'No photos match the current filters.';

        // Customize message based on active filters
        if (this.currentCategoryFilter !== 'all' && this.currentPersonFilter) {
            title = 'No matching photos';
            message = `No photos found for ${this.currentPersonFilter} in ${this.currentCategoryFilter} category.`;
            icon = '🔍';
        } else if (this.currentCategoryFilter !== 'all') {
            title = 'No photos in this category';
            message = `No photos found in the ${this.currentCategoryFilter} category yet.`;
            icon = '📂';
        } else if (this.currentPersonFilter) {
            title = 'No photos found';
            message = `No photos found with ${this.currentPersonFilter}.`;
            icon = '👤';
        } else {
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
     * @returns {Object} Filter statistics
     */
    getFilterStats() {
        const photos = photoManager.getPhotos();
        const filteredPhotos = photoManager.getFilteredPhotos();

        const stats = {
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
     * @returns {boolean} Whether filters are active
     */
    hasActiveFilters() {
        return this.currentCategoryFilter !== 'all' || this.currentPersonFilter !== '';
    }

    /**
     * Log current filter statistics
     */
    logFilterStats() {
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
     * @returns {Object} Available filter options
     */
    getAvailableFilters() {
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
     * @param {string} query - Search query
     * @returns {Array} Matching photos
     */
    searchPhotos(query) {
        return photoManager.searchPhotos(query);
    }

    /**
     * Get photos for a specific date
     * @param {Date|string} date - Date to filter by
     * @returns {Array} Photos from the specified date
     */
    getPhotosByDate(date) {
        return photoManager.getPhotosByDate(date);
    }

    /**
     * Apply quick filter presets
     * @param {string} preset - Preset name
     */
    applyPreset(preset) {
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
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get current filter state
     * @returns {Object} Current filter state
     */
    getCurrentState() {
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
    reset() {
        log.info('Resetting filters to default state');
        
        this.currentCategoryFilter = 'all';
        this.currentPersonFilter = '';
        
        state.update({
            currentFilter: 'all',
            selectedPerson: ''
        });
        
        this.updateFilterUI();
        this.applyFilters();
    }

    /**
     * Destroy filter manager and cleanup
     */
    destroy() {
        // Remove event listeners would go here if we stored them
        // For now, just log the destruction
        log.info('Filter Manager destroyed');
        this.isInitialized = false;
    }
}

// Create and export singleton instance
export const filterManager = new FilterManager();
export default filterManager;