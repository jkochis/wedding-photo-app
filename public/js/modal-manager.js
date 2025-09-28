/**
 * Wedding Photo App Modal Manager
 * Manages photo modal display, navigation (swipe/keyboard), and modal state
 */

import { CONFIG } from './config.js';
import { log } from './logger.js';
import { state } from './state.js';
import photoManager from './photo-manager.js';
import faceDetection from './face-detection.js';

export class ModalManager {
    constructor() {
        this.isOpen = false;
        this.currentPhotoIndex = 0;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize modal manager
     */
    init() {
        if (this.isInitialized) return;
        
        log.info('Initializing Modal Manager');
        
        this.setupEventListeners();
        this.setupStateSubscriptions();
        
        this.isInitialized = true;
        log.info('Modal Manager initialized');
    }

    /**
     * Setup event listeners for modal functionality
     */
    setupEventListeners() {
        // Modal close button
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Navigation buttons
        const prevBtn = document.getElementById('prevPhoto');
        const nextBtn = document.getElementById('nextPhoto');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.previousPhoto();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextPhoto();
            });
        }

        // Modal background click to close
        const modal = document.getElementById('photoModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            
            switch (e.key) {
                case 'Escape':
                    this.closeModal();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    this.previousPhoto();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    this.nextPhoto();
                    break;
            }
        });

        // Touch events for swipe navigation
        if (modal) {
            modal.addEventListener('touchstart', (e) => {
                this.touchStartX = e.changedTouches[0].screenX;
            });

            modal.addEventListener('touchend', (e) => {
                this.touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe();
            });
        }

        // Custom event listener for opening modal
        document.addEventListener('openPhotoModal', (e) => {
            const { photo, index } = e.detail;
            this.openModal(photo, index);
        });

        log.debug('Modal event listeners setup complete');
    }

    /**
     * Setup state subscriptions
     */
    setupStateSubscriptions() {
        // Subscribe to filtered photos changes
        state.subscribe('filteredPhotos', () => {
            if (this.isOpen) {
                this.updateNavigationButtons();
            }
        });

        // Subscribe to current photo index changes
        state.subscribe('currentPhotoIndex', (newIndex) => {
            if (this.isOpen && newIndex !== this.currentPhotoIndex) {
                this.currentPhotoIndex = newIndex;
                this.displayCurrentPhoto();
            }
        });

        log.debug('Modal state subscriptions setup complete');
    }

    /**
     * Open photo modal
     * @param {Object} photo - Photo object to display
     * @param {number} index - Photo index in filtered photos
     */
    openModal(photo, index = 0) {
        log.info('Opening photo modal', { photoId: photo?.id, index });

        this.currentPhotoIndex = index;
        this.isOpen = true;

        // Update state
        state.update({
            currentPhotoIndex: index,
            modalOpen: true
        });

        this.displayCurrentPhoto();
        this.showModal();
        
        // Show navigation hint if there are multiple photos
        const filteredPhotos = photoManager.getFilteredPhotos();
        if (filteredPhotos.length > 1) {
            this.showNavigationHint();
        }
    }

    /**
     * Close photo modal
     */
    closeModal() {
        if (!this.isOpen) return;
        
        log.info('Closing photo modal');

        this.isOpen = false;
        
        // Clear face boxes when closing
        const modalImage = document.getElementById('modalImage');
        if (modalImage && faceDetection) {
            faceDetection.clearFaceBoxes(modalImage);
        }
        
        // Update state
        state.update({
            modalOpen: false,
            currentPhotoIndex: 0
        });

        this.hideModal();
    }

    /**
     * Show the modal UI
     */
    showModal() {
        const modal = document.getElementById('photoModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }

    /**
     * Hide the modal UI
     */
    hideModal() {
        const modal = document.getElementById('photoModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    /**
     * Display the current photo in the modal
     */
    displayCurrentPhoto() {
        const filteredPhotos = photoManager.getFilteredPhotos();
        
        if (filteredPhotos.length === 0) {
            log.warn('No photos to display in modal');
            return;
        }
        
        const photo = filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            log.warn('Photo not found at index:', this.currentPhotoIndex);
            return;
        }

        const modalImage = document.getElementById('modalImage');
        const modalTag = document.getElementById('modalTag');
        const modalDate = document.getElementById('modalDate');
        const photoCounter = document.getElementById('photoCounter');

        if (!modalImage) {
            log.error('Modal image element not found');
            return;
        }

        // Update image
        modalImage.src = photo.url;
        modalImage.alt = `Wedding photo - ${photo.tag}`;

        // Update tag
        if (modalTag) {
            modalTag.textContent = this.capitalizeFirst(photo.tag);
        }
        
        // Update date
        if (modalDate) {
            const date = new Date(photo.uploadedAt);
            modalDate.textContent = `Uploaded ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
        }
        
        // Update counter
        if (photoCounter) {
            photoCounter.textContent = `${this.currentPhotoIndex + 1} / ${filteredPhotos.length}`;
        }
        
        // Update navigation button states
        this.updateNavigationButtons();
        
        // Update people display and face detection UI
        if (faceDetection) {
            faceDetection.updatePeopleDisplay(photo);
            faceDetection.displayExistingFaces(photo, modalImage);
            faceDetection.updateButtonVisibility();
        }

        log.debug('Modal photo updated', {
            photoId: photo.id,
            index: this.currentPhotoIndex,
            totalPhotos: filteredPhotos.length
        });
    }

    /**
     * Navigate to next photo
     */
    nextPhoto() {
        if (!this.isOpen) return;
        
        const filteredPhotos = photoManager.getFilteredPhotos();
        if (filteredPhotos.length === 0) return;
        
        const newIndex = (this.currentPhotoIndex + 1) % filteredPhotos.length;
        this.navigateToPhoto(newIndex);
    }
    
    /**
     * Navigate to previous photo
     */
    previousPhoto() {
        if (!this.isOpen) return;
        
        const filteredPhotos = photoManager.getFilteredPhotos();
        if (filteredPhotos.length === 0) return;
        
        const newIndex = this.currentPhotoIndex === 0 
            ? filteredPhotos.length - 1 
            : this.currentPhotoIndex - 1;
        this.navigateToPhoto(newIndex);
    }

    /**
     * Navigate to specific photo index
     * @param {number} index - Photo index
     */
    navigateToPhoto(index) {
        const filteredPhotos = photoManager.getFilteredPhotos();
        
        if (index < 0 || index >= filteredPhotos.length) {
            log.warn('Invalid photo index:', index);
            return;
        }

        log.debug('Navigating to photo', { from: this.currentPhotoIndex, to: index });

        this.currentPhotoIndex = index;
        
        // Update state
        state.set('currentPhotoIndex', index);
        
        this.displayCurrentPhoto();
    }
    
    /**
     * Handle swipe gesture for navigation
     */
    handleSwipe() {
        if (!this.isOpen) return;
        
        const swipeThreshold = CONFIG.UI.SWIPE_THRESHOLD || 50;
        const diff = this.touchStartX - this.touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next photo
                this.nextPhoto();
            } else {
                // Swipe right - previous photo
                this.previousPhoto();
            }
            
            log.debug('Swipe navigation', { 
                direction: diff > 0 ? 'left (next)' : 'right (previous)',
                distance: Math.abs(diff)
            });
        }
    }
    
    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevPhoto');
        const nextBtn = document.getElementById('nextPhoto');
        const filteredPhotos = photoManager.getFilteredPhotos();
        
        if (prevBtn && nextBtn) {
            const hasMultiplePhotos = filteredPhotos.length > 1;
            prevBtn.style.display = hasMultiplePhotos ? 'block' : 'none';
            nextBtn.style.display = hasMultiplePhotos ? 'block' : 'none';
        }

        log.debug('Navigation buttons updated', {
            visible: filteredPhotos.length > 1,
            totalPhotos: filteredPhotos.length
        });
    }
    
    /**
     * Show navigation hint to user
     */
    showNavigationHint() {
        // Only show hint once per session
        if (sessionStorage.getItem('navigationHintShown')) return;
        
        const hint = document.createElement('div');
        hint.style.cssText = `
            position: fixed;
            bottom: 6rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 0.8rem 1.2rem;
            border-radius: 25px;
            font-size: 0.9rem;
            z-index: 1003;
            animation: fadeInOut 3s ease-in-out;
            pointer-events: none;
            text-align: center;
            max-width: 280px;
        `;
        hint.textContent = CONFIG.UI.NAVIGATION_HINT || '← → Arrow keys or swipe to navigate';
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0%, 100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0px); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(hint);
        
        // Remove hint after animation
        setTimeout(() => {
            if (hint.parentNode) {
                hint.remove();
            }
            if (style.parentNode) {
                style.remove();
            }
        }, 3000);
        
        // Mark as shown
        sessionStorage.setItem('navigationHintShown', 'true');
        
        log.debug('Navigation hint shown');
    }

    /**
     * Jump to first photo
     */
    goToFirst() {
        if (!this.isOpen) return;
        this.navigateToPhoto(0);
    }

    /**
     * Jump to last photo
     */
    goToLast() {
        if (!this.isOpen) return;
        const filteredPhotos = photoManager.getFilteredPhotos();
        this.navigateToPhoto(filteredPhotos.length - 1);
    }

    /**
     * Toggle fullscreen mode (if supported)
     */
    toggleFullscreen() {
        if (!this.isOpen) return;

        const modal = document.getElementById('photoModal');
        if (!modal) return;

        if (!document.fullscreenElement) {
            modal.requestFullscreen?.() || 
            modal.webkitRequestFullscreen?.() || 
            modal.mozRequestFullScreen?.();
        } else {
            document.exitFullscreen?.() || 
            document.webkitExitFullscreen?.() || 
            document.mozCancelFullScreen?.();
        }
    }

    /**
     * Get current modal state
     * @returns {Object} Modal state
     */
    getCurrentState() {
        const filteredPhotos = photoManager.getFilteredPhotos();
        const currentPhoto = filteredPhotos[this.currentPhotoIndex];

        return {
            isOpen: this.isOpen,
            currentPhotoIndex: this.currentPhotoIndex,
            currentPhoto: currentPhoto,
            totalPhotos: filteredPhotos.length,
            hasNavigation: filteredPhotos.length > 1,
            canGoNext: this.currentPhotoIndex < filteredPhotos.length - 1,
            canGoPrev: this.currentPhotoIndex > 0
        };
    }

    /**
     * Get modal statistics
     * @returns {Object} Modal usage statistics
     */
    getStats() {
        const stats = {
            timesOpened: parseInt(sessionStorage.getItem('modalOpenCount') || '0'),
            hintShown: !!sessionStorage.getItem('navigationHintShown'),
            currentSession: {
                isOpen: this.isOpen,
                currentIndex: this.currentPhotoIndex
            }
        };

        return stats;
    }

    /**
     * Preload adjacent photos for smoother navigation
     */
    preloadAdjacentPhotos() {
        if (!this.isOpen) return;

        const filteredPhotos = photoManager.getFilteredPhotos();
        const preloadIndices = [];

        // Preload next photo
        if (this.currentPhotoIndex < filteredPhotos.length - 1) {
            preloadIndices.push(this.currentPhotoIndex + 1);
        }

        // Preload previous photo
        if (this.currentPhotoIndex > 0) {
            preloadIndices.push(this.currentPhotoIndex - 1);
        }

        preloadIndices.forEach(index => {
            const photo = filteredPhotos[index];
            if (photo) {
                const img = new Image();
                img.src = photo.url;
            }
        });

        log.debug('Preloaded adjacent photos', { indices: preloadIndices });
    }

    /**
     * Handle window resize to update modal layout
     */
    handleResize() {
        if (!this.isOpen) return;

        // Re-display current photo to update face box positions
        setTimeout(() => {
            this.displayCurrentPhoto();
        }, 100);
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
     * Set up resize listener for responsive modal
     */
    setupResizeListener() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    /**
     * Track modal usage for analytics
     */
    trackModalOpen() {
        const currentCount = parseInt(sessionStorage.getItem('modalOpenCount') || '0');
        sessionStorage.setItem('modalOpenCount', (currentCount + 1).toString());
    }

    /**
     * Clean up modal state and event listeners
     */
    destroy() {
        this.closeModal();
        this.isInitialized = false;
        log.info('Modal Manager destroyed');
    }
}

// Setup resize listener when module loads
const setupGlobalResizeListener = () => {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (modalManager.isOpen) {
                modalManager.handleResize();
            }
        }, 250);
    });
};

// Create and export singleton instance
export const modalManager = new ModalManager();
export default modalManager;

// Setup global listeners
setupGlobalResizeListener();