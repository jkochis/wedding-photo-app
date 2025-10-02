/**
 * Wedding Photo App Modal Manager
 * Manages photo modal display, navigation (swipe/keyboard), and modal state
 */

import { CONFIG } from './config.js';
import { log } from './logger.js';
import { state } from './state.js';
import photoManager from './photo-manager.js';
import faceDetection from './face-detection.js';
import type { Photo } from '../types/index';

interface ModalState {
    isOpen: boolean;
    currentPhotoIndex: number;
    currentPhoto: Photo | undefined;
    totalPhotos: number;
    hasNavigation: boolean;
    canGoNext: boolean;
    canGoPrev: boolean;
}

interface ModalStats {
    timesOpened: number;
    hintShown: boolean;
    currentSession: {
        isOpen: boolean;
        currentIndex: number;
    };
}

interface OpenModalEvent extends CustomEvent {
    detail: {
        photo: Photo;
        index: number;
    };
}

export class ModalManager {
    private isOpen: boolean;
    private currentPhotoIndex: number;
    private touchStartX: number;
    private touchEndX: number;
    private isInitialized: boolean;

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
    public init(): void {
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
    private setupEventListeners(): void {
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

        // Delete button
        const deleteBtn = document.getElementById('deletePhotoBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.handleDeletePhoto();
            });
        }

        // Modal background click to close
        const modal = document.getElementById('photoModal');
        if (modal) {
            modal.addEventListener('click', (e: MouseEvent) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e: KeyboardEvent) => {
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
            modal.addEventListener('touchstart', (e: TouchEvent) => {
                this.touchStartX = e.changedTouches[0].screenX;
            });

            modal.addEventListener('touchend', (e: TouchEvent) => {
                this.touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe();
            });
        }

        // Custom event listener for opening modal
        document.addEventListener('openPhotoModal', (e: Event) => {
            const modalEvent = e as OpenModalEvent;
            const { photo, index } = modalEvent.detail;
            this.openModal(photo, index);
        });

        // Category button event listeners
        this.setupCategoryEventListeners();

        log.debug('Modal event listeners setup complete');
    }

    /**
     * Setup category button event listeners
     */
    private setupCategoryEventListeners(): void {
        const categoryButtons = document.querySelectorAll('.category-btn');

        categoryButtons.forEach(button => {
            button.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const category = target.dataset.category;

                if (category) {
                    this.handleCategoryChange(category as 'wedding' | 'reception' | 'other');
                }
            });
        });

        log.debug('Category event listeners setup complete');
    }

    /**
     * Setup state subscriptions
     */
    private setupStateSubscriptions(): void {
        // Subscribe to filtered photos changes
        state.subscribe('filteredPhotos', () => {
            if (this.isOpen) {
                this.updateNavigationButtons();
            }
        });

        // Subscribe to current photo index changes
        state.subscribe('currentPhotoIndex', (newIndex: number) => {
            if (this.isOpen && newIndex !== this.currentPhotoIndex) {
                this.currentPhotoIndex = newIndex;
                this.displayCurrentPhoto();
            }
        });

        log.debug('Modal state subscriptions setup complete');
    }

    /**
     * Open photo modal
     */
    public openModal(photo: Photo, index: number = 0): void {
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
    public closeModal(): void {
        if (!this.isOpen) return;
        
        log.info('Closing photo modal');

        this.isOpen = false;
        
        // Clear face boxes when closing
        const modalImage = document.getElementById('modalImage') as HTMLImageElement;
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
    private showModal(): void {
        const modal = document.getElementById('photoModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }

    /**
     * Hide the modal UI
     */
    private hideModal(): void {
        const modal = document.getElementById('photoModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    /**
     * Display the current photo in the modal
     */
    private displayCurrentPhoto(): void {
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

        const modalImage = document.getElementById('modalImage') as HTMLImageElement | null;
        const modalTag = document.getElementById('modalTag');
        const modalDate = document.getElementById('modalDate');
        const photoCounter = document.getElementById('photoCounter');

        if (!modalImage) {
            log.error('Modal image element not found');
            return;
        }

        // Update image with CORS error handling
        modalImage.onerror = () => {
            log.warn('Failed to load image due to CORS or network error', { url: photo.url });
            // Try loading without crossOrigin attribute as fallback
            const fallbackImage = new Image();
            fallbackImage.onload = () => {
                modalImage.src = fallbackImage.src;
            };
            fallbackImage.onerror = () => {
                log.error('Image loading failed completely', { url: photo.url });
                // Show error placeholder
                modalImage.alt = 'Image failed to load due to CORS restrictions';
                modalImage.style.backgroundColor = '#f0f0f0';
                modalImage.style.minHeight = '200px';
            };
            // Try loading without crossOrigin
            fallbackImage.src = photo.url;
        };

        modalImage.onload = () => {
            log.debug('Image loaded successfully', { url: photo.url });
        };

        modalImage.crossOrigin = 'anonymous';
        modalImage.src = photo.url;
        modalImage.alt = `Wedding photo - ${photo.tag}`;

        // Update category buttons to show current selection
        this.updateCategoryButtons(photo.tag);
        
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
    private nextPhoto(): void {
        if (!this.isOpen) return;
        
        const filteredPhotos = photoManager.getFilteredPhotos();
        if (filteredPhotos.length === 0) return;
        
        const newIndex = (this.currentPhotoIndex + 1) % filteredPhotos.length;
        this.navigateToPhoto(newIndex);
    }
    
    /**
     * Navigate to previous photo
     */
    private previousPhoto(): void {
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
     */
    private navigateToPhoto(index: number): void {
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
    private handleSwipe(): void {
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
    private updateNavigationButtons(): void {
        const prevBtn = document.getElementById('prevPhoto') as HTMLElement | null;
        const nextBtn = document.getElementById('nextPhoto') as HTMLElement | null;
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
    private showNavigationHint(): void {
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
    public goToFirst(): void {
        if (!this.isOpen) return;
        this.navigateToPhoto(0);
    }

    /**
     * Jump to last photo
     */
    public goToLast(): void {
        if (!this.isOpen) return;
        const filteredPhotos = photoManager.getFilteredPhotos();
        this.navigateToPhoto(filteredPhotos.length - 1);
    }

    /**
     * Toggle fullscreen mode (if supported)
     */
    public toggleFullscreen(): void {
        if (!this.isOpen) return;

        const modal = document.getElementById('photoModal');
        if (!modal) return;

        const modalElement = modal as any; // For fullscreen API compatibility
        const documentElement = document as any;

        if (!document.fullscreenElement) {
            modalElement.requestFullscreen?.() || 
            modalElement.webkitRequestFullscreen?.() || 
            modalElement.mozRequestFullScreen?.();
        } else {
            documentElement.exitFullscreen?.() || 
            documentElement.webkitExitFullscreen?.() || 
            documentElement.mozCancelFullScreen?.();
        }
    }

    /**
     * Get current modal state
     */
    public getCurrentState(): ModalState {
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
     */
    public getStats(): ModalStats {
        const stats: ModalStats = {
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
    private preloadAdjacentPhotos(): void {
        if (!this.isOpen) return;

        const filteredPhotos = photoManager.getFilteredPhotos();
        const preloadIndices: number[] = [];

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
    public handleResize(): void {
        if (!this.isOpen) return;

        // Re-display current photo to update face box positions
        setTimeout(() => {
            this.displayCurrentPhoto();
        }, 100);
    }

    /**
     * Get modal open state
     */
    public get isModalOpen(): boolean {
        return this.isOpen;
    }

    /**
     * Handle photo deletion with confirmation
     */
    private async handleDeletePhoto(): Promise<void> {
        const filteredPhotos = photoManager.getFilteredPhotos();
        const currentPhoto = filteredPhotos[this.currentPhotoIndex];
        
        if (!currentPhoto) {
            log.warn('No photo to delete');
            return;
        }
        
        // Show confirmation dialog
        const confirmed = confirm(
            `Are you sure you want to delete this photo?\n\nThis will remove the photo from the gallery.`
        );
        
        if (!confirmed) {
            log.info('Photo deletion cancelled by user');
            return;
        }
        
        try {
            log.info('Deleting photo', { photoId: currentPhoto.id });
            
            // Disable delete button during deletion
            const deleteBtn = document.getElementById('deletePhotoBtn') as HTMLButtonElement | null;
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.textContent = '⏳ Deleting...';
            }
            
            // Delete the photo
            await photoManager.deletePhoto(currentPhoto.id);
            
            log.info('Photo deleted successfully');
            
            // Navigate to next photo or close modal if this was the last photo
            const remainingPhotos = photoManager.getFilteredPhotos();
            
            if (remainingPhotos.length === 0) {
                // No more photos, close modal
                this.closeModal();
            } else {
                // Adjust current index if needed
                if (this.currentPhotoIndex >= remainingPhotos.length) {
                    this.currentPhotoIndex = remainingPhotos.length - 1;
                }
                // Display next photo
                this.displayCurrentPhoto();
            }
            
        } catch (error) {
            log.error('Failed to delete photo', error);
            alert('Failed to delete photo. Please try again.');
            
            // Re-enable delete button
            const deleteBtn = document.getElementById('deletePhotoBtn') as HTMLButtonElement | null;
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = '🗑️ Delete';
            }
        }
    }

    /**
     * Handle category change for current photo
     */
    private async handleCategoryChange(newCategory: 'wedding' | 'reception' | 'other'): Promise<void> {
        const filteredPhotos = photoManager.getFilteredPhotos();
        const currentPhoto = filteredPhotos[this.currentPhotoIndex];

        if (!currentPhoto) {
            log.warn('No current photo for category change');
            return;
        }

        if (currentPhoto.tag === newCategory) {
            log.debug('Category unchanged', { current: currentPhoto.tag, new: newCategory });
            return;
        }

        try {
            log.info('Changing photo category', {
                photoId: currentPhoto.id,
                from: currentPhoto.tag,
                to: newCategory
            });

            // Update photo category
            const success = await photoManager.updatePhotoCategory(currentPhoto.id, newCategory);

            if (success) {
                // Update local photo object
                currentPhoto.tag = newCategory;

                // Update category buttons
                this.updateCategoryButtons(newCategory);

                // Show success notification
                this.showCategoryChangeNotification(newCategory);

                log.info('Photo category updated successfully');
            } else {
                throw new Error('Failed to update photo category');
            }

        } catch (error) {
            log.error('Failed to update photo category', error);
            this.showErrorNotification('Failed to update category. Please try again.');
        }
    }

    /**
     * Update category buttons to reflect current selection
     */
    private updateCategoryButtons(currentCategory: string): void {
        const categoryButtons = document.querySelectorAll('.category-btn');

        categoryButtons.forEach(button => {
            const btnElement = button as HTMLElement;
            const category = btnElement.dataset.category;

            if (category === currentCategory) {
                btnElement.classList.add('active');
            } else {
                btnElement.classList.remove('active');
            }
        });

        log.debug('Category buttons updated', { currentCategory });
    }

    /**
     * Show category change notification
     */
    private showCategoryChangeNotification(category: string): void {
        const categoryNames: Record<string, string> = {
            wedding: '👰 Wedding',
            reception: '🎉 Reception',
            other: '📷 Other'
        };

        const message = `Photo moved to ${categoryNames[category] || category}`;
        this.showNotification(message, 'success');
    }

    /**
     * Show error notification
     */
    private showErrorNotification(message: string): void {
        this.showNotification(message, 'error');
    }

    /**
     * Show notification to user
     */
    private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `modal-notification ${type}`;

        const colors: Record<string, string> = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3'
        };

        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1005;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-size: 14px;
            font-weight: 500;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Utility function to capitalize first letter
     */
    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Set up resize listener for responsive modal
     */
    private setupResizeListener(): void {
        let resizeTimeout: number;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = window.setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    /**
     * Track modal usage for analytics
     */
    private trackModalOpen(): void {
        const currentCount = parseInt(sessionStorage.getItem('modalOpenCount') || '0');
        sessionStorage.setItem('modalOpenCount', (currentCount + 1).toString());
    }

    /**
     * Clean up modal state and event listeners
     */
    public destroy(): void {
        this.closeModal();
        this.isInitialized = false;
        log.info('Modal Manager destroyed');
    }
}

// Setup resize listener when module loads
const setupGlobalResizeListener = (): void => {
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = window.setTimeout(() => {
            if (modalManager.isModalOpen) {
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