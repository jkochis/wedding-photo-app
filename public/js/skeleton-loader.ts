/**
 * Wedding Photo App - Skeleton Loader
 * Creates loading placeholders for better UX
 */

export class SkeletonLoader {
    private photoGrid: HTMLElement | null;
    private loadingPhotos: Set<string>;

    constructor() {
        this.photoGrid = null;
        this.loadingPhotos = new Set<string>();
    }

    /**
     * Initialize skeleton loader
     */
    public init(): void {
        this.photoGrid = document.getElementById('photoGrid');
    }

    /**
     * Show loading skeletons
     */
    public showPhotoSkeletons(count: number = 6): void {
        if (!this.photoGrid) return;
        
        // Clear existing content
        this.photoGrid.innerHTML = '';
        
        // Create skeleton items
        for (let i = 0; i < count; i++) {
            const skeleton = this.createPhotoSkeleton();
            skeleton.dataset.skeletonId = i.toString();
            this.photoGrid.appendChild(skeleton);
        }
    }
    /**
     * Create a photo skeleton element
     */
    private createPhotoSkeleton(): HTMLElement {
        const skeleton = document.createElement('div');
        skeleton.className = 'photo-skeleton';
        skeleton.setAttribute('aria-label', 'Loading photo...');
        return skeleton;
    }
    /**
     * Replace skeleton with actual photo
     */
    public replaceSkeletonWithPhoto(index: number, photoElement: HTMLElement): void {
        if (!this.photoGrid) return;
        
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
    public hideSkeletons(): void {
        if (!this.photoGrid) return;
        
        const skeletons = this.photoGrid.querySelectorAll('.photo-skeleton');
        skeletons.forEach(skeleton => {
            (skeleton as HTMLElement).style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (skeleton.parentNode) {
                    skeleton.remove();
                }
            }, 300);
        });
    }
    /**
     * Show upload skeletons during batch upload
     */
    public showUploadSkeletons(count: number): void {
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
    private createUploadSkeleton(): HTMLElement {
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
     */
    public updateUploadProgress(uploadId: string, progress: number): void {
        if (!this.photoGrid) return;
        
        const skeleton = this.photoGrid.querySelector(`[data-upload-id="${uploadId}"]`);
        if (skeleton) {
            const indicator = skeleton.querySelector('.upload-indicator') as HTMLElement;
            if (indicator) {
                indicator.style.opacity = (progress / 100).toString();
            }
        }
    }
    /**
     * Replace upload skeleton with uploaded photo
     */
    public replaceUploadSkeletonWithPhoto(uploadId: string, photoElement: HTMLElement): void {
        if (!this.photoGrid) return;
        
        const skeleton = this.photoGrid.querySelector(`[data-upload-id="${uploadId}"]`);
        if (skeleton) {
            photoElement.classList.add('fade-in');
            skeleton.replaceWith(photoElement);
        }
    }
    /**
     * Remove upload skeleton (for failed uploads)
     */
    public removeUploadSkeleton(uploadId: string): void {
        if (!this.photoGrid) return;
        
        const skeleton = this.photoGrid.querySelector(`[data-upload-id="${uploadId}"]`);
        if (skeleton) {
            (skeleton as HTMLElement).style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (skeleton.parentNode) {
                    skeleton.remove();
                }
            }, 300);
        }
    }
    /**
     * Show skeleton for specific photo loading
     */
    public showPhotoSkeleton(photoId: string): HTMLElement {
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
     */
    public hidePhotoSkeleton(photoId: string): void {
        const skeleton = this.photoGrid?.querySelector(`[data-photo-id="${photoId}"]`);
        if (skeleton) {
            skeleton.remove();
            this.loadingPhotos.delete(photoId);
        }
    }

    /**
     * Check if any photos are currently loading
     */
    public hasLoadingPhotos(): boolean {
        return this.loadingPhotos.size > 0;
    }

    /**
     * Clear all loading states
     */
    public clearAll(): void {
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
//# sourceMappingURL=skeleton-loader.js.map