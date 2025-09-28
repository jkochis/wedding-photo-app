/**
 * Wedding Photo App Upload Manager
 * Handles file upload processing, progress tracking, drag/drop, and batch uploads
 */

import { CONFIG } from './config.js';
import { log } from './logger.js';
import { state } from './state.js';
import apiClient from './api-client.js';
import photoManager from './photo-manager.js';
import Utils from './utils.js';

export class UploadManager {
    constructor() {
        this.isUploading = false;
        this.uploadQueue = [];
        this.currentUploads = 0;
        this.maxConcurrentUploads = CONFIG.UPLOAD.MAX_CONCURRENT;
        this.selectedTag = 'wedding'; // Default tag
        
        this.init();
    }

    /**
     * Initialize upload manager
     */
    init() {
        log.info('Initializing Upload Manager');
        
        this.setupEventListeners();
        this.setupDragAndDrop();
        
        // Subscribe to state changes
        state.subscribe('selectedTag', (newTag) => {
            this.selectedTag = newTag;
        });
        
        log.info('Upload Manager initialized');
    }

    /**
     * Setup event listeners for upload UI
     */
    setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const tagButtons = document.querySelectorAll('.tag-btn');

        // File input change handler
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
        }

        // Upload area click handler
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                fileInput?.click();
            });
        }

        // Tag selection handlers
        tagButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active tag button
                tagButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update selected tag
                this.selectedTag = e.target.dataset.tag;
                state.set('selectedTag', this.selectedTag);
                
                log.debug('Tag selected:', this.selectedTag);
            });
        });
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
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
            const files = e.dataTransfer.files;
            this.handleFileSelection(files);
        }, false);

        log.debug('Drag and drop initialized');
    }

    /**
     * Prevent default drag behaviors
     * @param {Event} e - Event object
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handle file selection from input or drag/drop
     * @param {FileList} files - Selected files
     */
    async handleFileSelection(files) {
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
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateFile(file) {
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
     * @param {Array} files - Array of files to upload
     */
    async uploadFiles(files) {
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
     * @param {File} file - File to queue
     * @returns {Promise} Upload promise
     */
    queueFileUpload(file) {
        return new Promise((resolve, reject) => {
            this.uploadQueue.push({
                file,
                tag: this.selectedTag,
                resolve,
                reject,
                id: Utils.generateId()
            });
        });
    }

    /**
     * Process the upload queue
     */
    async processUploadQueue() {
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
    async processNextUpload() {
        while (this.uploadQueue.length > 0) {
            const uploadItem = this.uploadQueue.shift();
            
            try {
                this.currentUploads++;
                
                // Update progress
                const completed = this.currentUploads;
                const total = this.currentUploads + this.uploadQueue.length;
                const percentage = Math.round((completed / total) * 100);
                
                this.showUploadProgress(`Uploading ${uploadItem.file.name}...`, percentage);
                
                // Compress image if needed
                const processedFile = await this.preprocessFile(uploadItem.file);
                
                // Upload file
                const photo = await apiClient.uploadPhoto(processedFile, uploadItem.tag);
                
                // Add to photo manager
                photoManager.addPhoto(photo);
                
                uploadItem.resolve(photo);
                
                log.info('File uploaded successfully', {
                    filename: uploadItem.file.name,
                    photoId: photo.id
                });
                
            } catch (error) {
                log.error('File upload failed', error);
                uploadItem.reject(error);
            }
        }
    }

    /**
     * Preprocess file before upload (compression, etc.)
     * @param {File} file - Original file
     * @returns {File|Blob} Processed file
     */
    async preprocessFile(file) {
        // Skip preprocessing for small files
        if (file.size < CONFIG.UPLOAD.COMPRESSION_THRESHOLD) {
            return file;
        }

        try {
            log.info('Compressing image before upload', {
                originalSize: Utils.formatFileSize(file.size),
                filename: file.name
            });
            
            const compressedFile = await this.compressImage(
                file,
                CONFIG.UPLOAD.MAX_WIDTH,
                CONFIG.UPLOAD.QUALITY
            );
            
            log.info('Image compressed', {
                originalSize: Utils.formatFileSize(file.size),
                compressedSize: Utils.formatFileSize(compressedFile.size),
                reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
            });
            
            return compressedFile;
            
        } catch (error) {
            log.warn('Image compression failed, using original', error);
            return file;
        }
    }

    /**
     * Compress an image file
     * @param {File} file - Image file to compress
     * @param {number} maxWidth - Maximum width
     * @param {number} quality - Compression quality (0-1)
     * @returns {Promise<Blob>} Compressed image
     */
    compressImage(file, maxWidth = 1920, quality = 0.8) {
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
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };

            img.onerror = () => {
                resolve(file); // Return original on error
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Show upload progress
     * @param {string} text - Progress text
     * @param {number} percentage - Progress percentage
     */
    showUploadProgress(text, percentage) {
        const uploadProgress = document.getElementById('uploadProgress');
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');

        if (uploadProgress && progressText && progressFill) {
            progressText.textContent = text;
            progressFill.style.width = `${percentage}%`;
            uploadProgress.classList.add('show');
            
            // Update state
            state.update({
                uploadProgress: {
                    visible: true,
                    text,
                    percentage
                }
            });
        }

        log.debug('Upload progress updated', { text, percentage });
    }

    /**
     * Hide upload progress
     */
    hideUploadProgress() {
        const uploadProgress = document.getElementById('uploadProgress');
        
        if (uploadProgress) {
            setTimeout(() => {
                uploadProgress.classList.remove('show');
                
                // Update state
                state.set('uploadProgress', {
                    visible: false,
                    text: '',
                    percentage: 0
                });
            }, 1000);
        }

        log.debug('Upload progress hidden');
    }

    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const colors = {
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
     * @returns {Object} Upload status
     */
    getStatus() {
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
    cancelUploads() {
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
     * @param {string} tag - Photo tag
     */
    setSelectedTag(tag) {
        if (CONFIG.UI.PHOTO_TAGS[tag]) {
            this.selectedTag = tag;
            state.set('selectedTag', tag);
            
            // Update UI
            const tagButtons = document.querySelectorAll('.tag-btn');
            tagButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tag === tag);
            });
            
            log.debug('Selected tag updated', tag);
        }
    }

    /**
     * Get upload statistics
     * @returns {Object} Upload statistics
     */
    getStats() {
        return {
            totalUploaded: state.get('photos')?.length || 0,
            uploadedToday: this.getPhotosUploadedToday().length,
            averageFileSize: this.getAverageFileSize(),
            totalSize: this.getTotalUploadSize()
        };
    }

    /**
     * Get photos uploaded today
     * @returns {Array} Photos uploaded today
     */
    getPhotosUploadedToday() {
        const photos = state.get('photos') || [];
        const today = new Date().toDateString();
        
        return photos.filter(photo => {
            const uploadDate = new Date(photo.uploadedAt).toDateString();
            return uploadDate === today;
        });
    }

    /**
     * Get average file size of uploaded photos
     * @returns {number} Average file size in bytes
     */
    getAverageFileSize() {
        const photos = state.get('photos') || [];
        
        if (photos.length === 0) return 0;
        
        const totalSize = photos.reduce((sum, photo) => sum + (photo.size || 0), 0);
        return Math.round(totalSize / photos.length);
    }

    /**
     * Get total size of all uploaded photos
     * @returns {number} Total size in bytes
     */
    getTotalUploadSize() {
        const photos = state.get('photos') || [];
        return photos.reduce((sum, photo) => sum + (photo.size || 0), 0);
    }
}

// Create and export singleton instance
export const uploadManager = new UploadManager();
export default uploadManager;