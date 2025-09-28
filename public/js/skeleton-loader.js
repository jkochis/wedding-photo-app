/**
 * Wedding Photo App - Skeleton Loader
 * Creates loading placeholders for better UX
 */

export class SkeletonLoader {
    constructor() {
        this.photoGrid = null;
        this.loadingPhotos = new Set();
    }
    
    /**
     * Initialize skeleton loader
     */
    init() {
        this.photoGrid = document.getElementById('photoGrid');
    }
    
    /**
     * Show loading skeletons
     * @param {number} count - Number of skeleton items to show
     */
    showPhotoSkeletons(count = 6) {
        if (!this.photoGrid) return;
        
        // Clear existing content
        this.photoGrid.innerHTML = '';
        
        // Create skeleton items
        for (let i = 0; i < count; i++) {
            const skeleton = this.createPhotoSkeleton();
            skeleton.dataset.skeletonId = i;
            this.photoGrid.appendChild(skeleton);
        }
    }
    
    /**
     * Create a photo skeleton element
     */
    createPhotoSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'photo-skeleton';
        skeleton.setAttribute('aria-label', 'Loading photo...');
        return skeleton;
    }
    
    /**
     * Replace skeleton with actual photo
     * @param {number} index - Index of skeleton to replace
     * @param {HTMLElement} photoElement - Actual photo element
     */
    replaceSkeletonWithPhoto(index, photoElement) {
        const skeleton = this.photoGrid.querySelector(`[data-skeleton-id="${index}"]`);
        if (skeleton) {
            // Add fade-in animation to photo
            photoElement.classList.add('fade-in');
            skeleton.replaceWith(photoElement);
        }
    }
    
    /**
     * Hide all skeletons
     */
    hideSkeletons() {
        if (!this.photoGrid) return;
        
        const skeletons = this.photoGrid.querySelectorAll('.photo-skeleton');
        skeletons.forEach(skeleton => {
            skeleton.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (skeleton.parentNode) {
                    skeleton.remove();
                }
            }, 300);
        });
    }
    
    /**
     * Show upload skeletons during batch upload
     * @param {number} count - Number of files being uploaded
     */
    showUploadSkeletons(count) {
        if (!this.photoGrid) return;
        
        for (let i = 0; i < count; i++) {
            const skeleton = this.createUploadSkeleton();
            skeleton.dataset.uploadId = `upload-${i}`;
            this.photoGrid.appendChild(skeleton);
        }
    }
    
    /**
     * Create upload skeleton with progress indicator
     */
    createUploadSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'photo-skeleton upload-skeleton';
        
        // Add upload indicator
        const indicator = document.createElement('div');
        indicator.className = 'upload-indicator';
        indicator.innerHTML = '📤';
        skeleton.appendChild(indicator);
        
        return skeleton;
    }
    
    /**
     * Update upload progress for skeleton
     * @param {string} uploadId - Upload identifier
     * @param {number} progress - Progress percentage (0-100)
     */
    updateUploadProgress(uploadId, progress) {
        const skeleton = this.photoGrid.querySelector(`[data-upload-id="${uploadId}"]`);
        if (skeleton) {
            const indicator = skeleton.querySelector('.upload-indicator');
            if (indicator) {
                indicator.style.opacity = progress / 100;
            }
        }
    }
    
    /**
     * Replace upload skeleton with uploaded photo
     * @param {string} uploadId - Upload identifier
     * @param {HTMLElement} photoElement - Uploaded photo element
     */
    replaceUploadSkeletonWithPhoto(uploadId, photoElement) {
        const skeleton = this.photoGrid.querySelector(`[data-upload-id="${uploadId}"]`);
        if (skeleton) {
            photoElement.classList.add('fade-in');
            skeleton.replaceWith(photoElement);
        }
    }
    
    /**
     * Remove upload skeleton (for failed uploads)
     * @param {string} uploadId - Upload identifier
     */
    removeUploadSkeleton(uploadId) {
        const skeleton = this.photoGrid.querySelector(`[data-upload-id="${uploadId}"]`);
        if (skeleton) {
            skeleton.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (skeleton.parentNode) {
                    skeleton.remove();
                }
            }, 300);
        }
    }
    
    /**
     * Show skeleton for specific photo loading
     * @param {string} photoId - Photo identifier
     */
    showPhotoSkeleton(photoId) {
        const skeleton = this.createPhotoSkeleton();
        skeleton.dataset.photoId = photoId;
        this.loadingPhotos.add(photoId);
        
        if (this.photoGrid) {
            this.photoGrid.appendChild(skeleton);
        }
        
        return skeleton;
    }
    
    /**
     * Hide skeleton for specific photo
     * @param {string} photoId - Photo identifier
     */
    hidePhotoSkeleton(photoId) {
        const skeleton = this.photoGrid?.querySelector(`[data-photo-id="${photoId}"]`);
        if (skeleton) {
            skeleton.remove();
            this.loadingPhotos.delete(photoId);
        }
    }
    
    /**
     * Check if any photos are currently loading
     */
    hasLoadingPhotos() {
        return this.loadingPhotos.size > 0;
    }
    
    /**
     * Clear all loading states
     */
    clearAll() {
        this.loadingPhotos.clear();
        if (this.photoGrid) {
            const skeletons = this.photoGrid.querySelectorAll('.photo-skeleton');
            skeletons.forEach(skeleton => skeleton.remove());
        }
    }
}

// Create and export singleton instance
export const skeletonLoader = new SkeletonLoader();
export default skeletonLoader;