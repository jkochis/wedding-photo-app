/**
 * Wedding Photo App Upload Manager
 * Handles file upload processing, progress tracking, drag/drop, and batch uploads
 */

import { CONFIG } from './config.js';
import { log } from './logger.js';
import { state } from './state.js';
import apiClient from './api-client.js';
import photoManager from './photo-manager.js';
import notificationManager from './notification-manager.js';
import Utils from './utils.js';
import type { PhotoTag, Photo, UploadResponse } from '../types/index';

// Import heic2any for HEIC/HEIF conversion
declare const heic2any: any;

interface ValidationResult {
    valid: boolean;
    error?: string;
}

interface UploadQueueItem {
    id: string;
    file: File;
    tag: PhotoTag;
    photographer?: string;
    resolve: (photo: Photo) => void;
    reject: (error: Error) => void;
}

interface UploadStatus {
    isUploading: boolean;
    queueLength: number;
    currentUploads: number;
    selectedTag: PhotoTag;
}

interface UploadStats {
    totalUploaded: number;
    uploadedToday: number;
    averageFileSize: number;
    totalSize: number;
}

export class UploadManager {
    private static readonly PHOTOGRAPHER_STORAGE_KEY = 'wedding-app-photographer-name';
    private isUploading: boolean;
    private uploadQueue: UploadQueueItem[];
    private currentUploads: number;
    private maxConcurrentUploads: number;
    private selectedTag: PhotoTag;
    private photographer: string;
    private initialized: boolean;

    constructor() {
        this.isUploading = false;
        this.uploadQueue = [];
        this.currentUploads = 0;
        this.maxConcurrentUploads = CONFIG.UPLOAD.MAX_CONCURRENT;
        this.selectedTag = 'wedding'; // Default tag
        this.photographer = '';
        this.initialized = false;
    }

    /**
     * Initialize upload manager
     */
    init(): void {
        if (this.initialized) {
            log.debug('Upload Manager already initialized, skipping');
            return;
        }

        log.info('Initializing Upload Manager');

        this.setupEventListeners();
        this.setupDragAndDrop();
        this.loadPhotographerFromStorage();

        // Subscribe to state changes
        state.subscribe('selectedTag', (newTag) => {
            this.selectedTag = newTag as PhotoTag;
        });

        this.initialized = true;
        log.info('Upload Manager initialized');
    }

    /**
     * Setup event listeners for upload UI
     */
    private setupEventListeners(): void {
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        const uploadArea = document.getElementById('uploadArea');
        const tagButtons = document.querySelectorAll('.tag-btn');
        const photographerInput = document.getElementById('photographerName') as HTMLInputElement;

        // File input change handler
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.handleFileSelection(target.files);
            });
        }

        // Upload area click handler
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                fileInput?.click();
            });
        }

        // Photographer name input handler
        if (photographerInput) {
            photographerInput.addEventListener('input', () => {
                this.savePhotographerToStorage();
            });
        }

        // Tag selection handlers
        tagButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                // Update active tag button
                tagButtons.forEach(b => b.classList.remove('active'));
                target.classList.add('active');

                // Update selected tag
                const tagValue = target.dataset.tag as PhotoTag;
                this.selectedTag = tagValue;
                state.set('selectedTag', this.selectedTag);

                log.debug('Tag selected:', this.selectedTag);
            });
        });
    }

    /**
     * Setup drag and drop functionality
     */
    private setupDragAndDrop(): void {
        const uploadArea = document.getElementById('uploadArea');
        
        if (!uploadArea) {
            log.warn('Upload area not found, drag and drop disabled');
            return;
        }

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('drag-over');
            }, false);
        });

        // Handle dropped files
        uploadArea.addEventListener('drop', (e) => {
            const dragEvent = e as DragEvent;
            const files = dragEvent.dataTransfer?.files;
            if (files) {
                this.handleFileSelection(files);
            }
        }, false);

        log.debug('Drag and drop initialized');
    }

    /**
     * Prevent default drag behaviors
     */
    private preventDefaults(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handle file selection from input or drag/drop
     */
    private async handleFileSelection(files: FileList | null): Promise<void> {
        if (!files || files.length === 0) {
            return;
        }

        log.info(`Files selected for upload: ${files.length}`);

        // Convert FileList to Array and validate files
        const validFiles = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const validation = this.validateFile(file);
            
            if (validation.valid) {
                validFiles.push(file);
            } else {
                errors.push(`${file.name}: ${validation.error}`);
            }
        }

        // Show validation errors
        if (errors.length > 0) {
            this.showNotification(`Upload errors:\n${errors.join('\n')}`, 'error');
        }

        // Proceed with valid files
        if (validFiles.length > 0) {
            await this.uploadFiles(validFiles);
        }
    }

    /**
     * Validate a file for upload
     */
    private validateFile(file: File): ValidationResult {
        // Check file type
        if (!file.type.startsWith('image/')) {
            return { valid: false, error: 'Only image files are allowed' };
        }

        // Check file size
        if (file.size > CONFIG.UPLOAD.MAX_FILE_SIZE) {
            const maxSizeMB = CONFIG.UPLOAD.MAX_FILE_SIZE / (1024 * 1024);
            return { valid: false, error: `File too large (max ${maxSizeMB}MB)` };
        }

        // Check file extension
        const allowedTypes = CONFIG.UPLOAD.ALLOWED_TYPES;
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Unsupported file format' };
        }

        return { valid: true };
    }

    /**
     * Upload multiple files
     */
    private async uploadFiles(files: File[]): Promise<void> {
        if (this.isUploading && this.uploadQueue.length + files.length > CONFIG.UPLOAD.MAX_BATCH_SIZE) {
            this.showNotification(`Maximum ${CONFIG.UPLOAD.MAX_BATCH_SIZE} files can be uploaded at once`, 'error');
            return;
        }

        // Add files to upload queue
        const uploadPromises = files.map(file => this.queueFileUpload(file));
        
        log.info(`Starting upload of ${files.length} files`);
        
        try {
            // Process uploads
            await this.processUploadQueue();
            
            // Wait for all uploads to complete
            const results = await Promise.allSettled(uploadPromises);
            
            // Process results
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            if (successful > 0) {
                this.showNotification(`Successfully uploaded ${successful} photo(s)!`, 'success');
                
                // Reload photos to show new uploads
                await photoManager.loadPhotos();
            }
            
            if (failed > 0) {
                this.showNotification(`${failed} upload(s) failed`, 'error');
            }
            
            log.info('Upload batch completed', { successful, failed });
            
        } catch (error) {
            log.error('Upload batch failed', error);
            this.showNotification('Upload failed. Please try again.', 'error');
        } finally {
            this.hideUploadProgress();
            this.isUploading = false;
        }
    }

    /**
     * Queue a file for upload
     */
    private queueFileUpload(file: File): Promise<Photo> {
        return new Promise((resolve, reject) => {
            // Get current photographer name
            const photographerName = this.getPhotographerName();

            this.uploadQueue.push({
                file,
                tag: this.selectedTag,
                photographer: photographerName,
                resolve,
                reject,
                id: Utils.generateId()
            });
        });
    }

    /**
     * Process the upload queue
     */
    private async processUploadQueue(): Promise<void> {
        if (this.uploadQueue.length === 0) return;
        
        this.isUploading = true;
        this.currentUploads = 0;
        
        // Show progress
        this.showUploadProgress('Preparing upload...', 0);
        
        // Process uploads with concurrency limit
        const promises = [];
        
        for (let i = 0; i < Math.min(this.maxConcurrentUploads, this.uploadQueue.length); i++) {
            promises.push(this.processNextUpload());
        }
        
        await Promise.all(promises);
    }

    /**
     * Process the next upload in queue
     */
    private async processNextUpload(): Promise<void> {
        while (this.uploadQueue.length > 0) {
            const uploadItem = this.uploadQueue.shift();
            if (!uploadItem) break;
            
            try {
                this.currentUploads++;
                
                // Update progress
                const completed = this.currentUploads;
                const total = this.currentUploads + this.uploadQueue.length;
                const percentage = Math.round((completed / total) * 100);
                
                this.showUploadProgress(`Uploading ${uploadItem.file.name}...`, percentage);
                
                // Compress image if needed
                const processedFile = await this.preprocessFile(uploadItem.file);
                
                // Upload file (cast Blob to File for API compatibility)
                const fileToUpload = processedFile instanceof File ? processedFile : new File([processedFile], uploadItem.file.name, { type: processedFile.type });
                const uploadResponse = await apiClient.uploadPhoto(fileToUpload, uploadItem.tag, uploadItem.photographer);
                
                // Extract photo from response - handle both direct photo return and {photo: ...} structure
                const photo = uploadResponse.photo || (uploadResponse as unknown as Photo);
                
                // Add to photo manager
                photoManager.addPhoto(photo);

                // Show notification for successful upload
                notificationManager.notifyPhotoUploaded(photo, uploadItem.photographer);

                uploadItem.resolve(photo);

                log.info('File uploaded successfully', {
                    filename: uploadItem.file.name,
                    photoId: photo.id
                });
                
            } catch (error) {
                log.error('File upload failed', error);
                uploadItem.reject(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    /**
     * Preprocess file before upload (compression, HEIC conversion, etc.)
     */
    private async preprocessFile(file: File): Promise<File | Blob> {
        try {
            // Convert HEIC/HEIF files to JPEG first
            let processedFile = file;
            if (file.type === 'image/heic' || file.type === 'image/heif') {
                log.info('Converting HEIC/HEIF to JPEG', {
                    originalFormat: file.type,
                    filename: file.name
                });

                processedFile = await this.convertHeicToJpeg(file);

                log.info('HEIC/HEIF conversion completed', {
                    originalSize: Utils.formatFileSize(file.size),
                    convertedSize: Utils.formatFileSize(processedFile.size)
                });
            }

            // Skip compression for small files
            if (processedFile.size < CONFIG.UPLOAD.COMPRESSION_THRESHOLD) {
                return processedFile;
            }

            log.info('Compressing image before upload', {
                originalSize: Utils.formatFileSize(processedFile.size),
                filename: processedFile.name || file.name
            });

            const compressedFile = await this.compressImage(
                processedFile,
                CONFIG.UPLOAD.MAX_WIDTH,
                CONFIG.UPLOAD.QUALITY
            );

            log.info('Image compressed', {
                originalSize: Utils.formatFileSize(processedFile.size),
                compressedSize: Utils.formatFileSize(compressedFile.size),
                reduction: `${Math.round((1 - compressedFile.size / processedFile.size) * 100)}%`
            });

            return compressedFile;

        } catch (error) {
            log.warn('File preprocessing failed, using original', error);
            return file;
        }
    }

    /**
     * Convert HEIC/HEIF file to JPEG using heic2any library
     */
    private async convertHeicToJpeg(file: File): Promise<File> {
        try {
            // Load heic2any library if not already loaded
            if (typeof heic2any === 'undefined') {
                await this.loadHeic2AnyLibrary();
            }

            // Convert HEIC to JPEG blob
            const convertedBlob = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.9
            }) as Blob;

            // Create new File object with JPEG type
            const convertedFile = new File(
                [convertedBlob],
                file.name.replace(/\.(heic|heif)$/i, '.jpg'),
                {
                    type: 'image/jpeg',
                    lastModified: file.lastModified
                }
            );

            return convertedFile;

        } catch (error) {
            log.error('HEIC conversion failed', error);
            throw new Error(`Failed to convert HEIC file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Dynamically load heic2any library
     */
    private async loadHeic2AnyLibrary(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof heic2any !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load heic2any library'));
            document.head.appendChild(script);
        });
    }

    /**
     * Compress an image file
     */
    private compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<Blob> {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                }
                
                canvas.toBlob((blob) => {
                    resolve(blob || file);
                }, 'image/jpeg', quality);
            };

            img.onerror = () => {
                resolve(file); // Return original on error
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Show upload progress
     */
    private showUploadProgress(text: string, percentage: number): void {
        const uploadProgress = document.getElementById('uploadProgress');
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');

        if (uploadProgress && progressText && progressFill) {
            progressText.textContent = text;
            progressFill.style.width = `${percentage}%`;
            uploadProgress.classList.add('show');
            
            // Update state
            state.set('uploadInProgress', true);
        }

        log.debug('Upload progress updated', { text, percentage });
    }

    /**
     * Hide upload progress
     */
    private hideUploadProgress(): void {
        const uploadProgress = document.getElementById('uploadProgress');
        
        if (uploadProgress) {
            setTimeout(() => {
                uploadProgress.classList.remove('show');
                
                // Update state
                state.set('uploadInProgress', false);
            }, 1000);
        }

        log.debug('Upload progress hidden');
    }

    /**
     * Show notification to user
     */
    private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
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
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1001;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            white-space: pre-line;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after duration based on message length
        const duration = Math.max(3000, message.length * 50);
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);

        log.debug('Notification shown', { message, type });
    }

    /**
     * Get current upload status
     */
    public getStatus(): UploadStatus {
        return {
            isUploading: this.isUploading,
            queueLength: this.uploadQueue.length,
            currentUploads: this.currentUploads,
            selectedTag: this.selectedTag
        };
    }

    /**
     * Cancel all pending uploads
     */
    public cancelUploads(): void {
        if (this.uploadQueue.length > 0) {
            const canceledCount = this.uploadQueue.length;
            
            // Reject all pending uploads
            this.uploadQueue.forEach(item => {
                item.reject(new Error('Upload canceled by user'));
            });
            
            this.uploadQueue = [];
            this.hideUploadProgress();
            
            this.showNotification(`Canceled ${canceledCount} pending upload(s)`, 'info');
            
            log.info('Uploads canceled', { count: canceledCount });
        }
    }

    /**
     * Set the selected photo tag
     */
    public setSelectedTag(tag: PhotoTag): void {
        if (CONFIG.UI.PHOTO_TAGS[tag]) {
            this.selectedTag = tag;
            state.set('selectedTag', tag);
            
            // Update UI
            const tagButtons = document.querySelectorAll('.tag-btn');
            tagButtons.forEach(btn => {
                const element = btn as HTMLElement;
                element.classList.toggle('active', element.dataset.tag === tag);
            });
            
            log.debug('Selected tag updated', tag);
        }
    }

    /**
     * Get upload statistics
     */
    public getStats(): UploadStats {
        return {
            totalUploaded: state.get('photos')?.length || 0,
            uploadedToday: this.getPhotosUploadedToday().length,
            averageFileSize: this.getAverageFileSize(),
            totalSize: this.getTotalUploadSize()
        };
    }

    /**
     * Get photos uploaded today
     */
    private getPhotosUploadedToday(): Photo[] {
        const photos = state.get('photos') || [];
        const today = new Date().toDateString();
        
        return photos.filter((photo: Photo) => {
            const uploadDate = new Date(photo.uploadedAt).toDateString();
            return uploadDate === today;
        });
    }

    /**
     * Get average file size of uploaded photos
     */
    private getAverageFileSize(): number {
        const photos = state.get('photos') || [];
        
        if (photos.length === 0) return 0;
        
        const totalSize = photos.reduce((sum: number, photo: Photo) => sum + (photo.size || 0), 0);
        return Math.round(totalSize / photos.length);
    }

    /**
     * Get total size of all uploaded photos
     */
    private getTotalUploadSize(): number {
        const photos = state.get('photos') || [];
        return photos.reduce((sum: number, photo: Photo) => sum + (photo.size || 0), 0);
    }

    /**
     * Get photographer name from input field
     */
    private getPhotographerName(): string {
        const photographerInput = document.getElementById('photographerName') as HTMLInputElement;
        return photographerInput?.value?.trim() || '';
    }

    /**
     * Set photographer name
     */
    public setPhotographer(name: string): void {
        this.photographer = name;
        const photographerInput = document.getElementById('photographerName') as HTMLInputElement;
        if (photographerInput) {
            photographerInput.value = name;
        }
    }

    /**
     * Get current photographer name
     */
    public getPhotographer(): string {
        return this.getPhotographerName();
    }

    /**
     * Load photographer name from localStorage
     */
    private loadPhotographerFromStorage(): void {
        try {
            const savedName = localStorage.getItem(UploadManager.PHOTOGRAPHER_STORAGE_KEY);
            if (savedName) {
                this.setPhotographer(savedName);
                log.debug('Photographer name loaded from storage:', savedName);
            }
        } catch (error) {
            log.warn('Failed to load photographer name from storage:', error);
        }
    }

    /**
     * Save photographer name to localStorage
     */
    private savePhotographerToStorage(): void {
        try {
            const currentName = this.getPhotographerName();
            if (currentName) {
                localStorage.setItem(UploadManager.PHOTOGRAPHER_STORAGE_KEY, currentName);
                log.debug('Photographer name saved to storage:', currentName);
            } else {
                localStorage.removeItem(UploadManager.PHOTOGRAPHER_STORAGE_KEY);
                log.debug('Empty photographer name, removed from storage');
            }
        } catch (error) {
            log.warn('Failed to save photographer name to storage:', error);
        }
    }
}

// Create and export singleton instance
export const uploadManager = new UploadManager();
export default uploadManager;