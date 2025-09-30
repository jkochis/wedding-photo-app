/**
 * Wedding Photo App Face Detection Module
 * Handles face detection, face box rendering, and people tagging functionality
 */

import { CONFIG } from './config.js';
import { log } from './logger.js';
import { state } from './state.js';
import apiClient from './api-client.js';
import type { Photo, FaceDetection as FaceDetectionType } from './types/index.js';

// External Face API types (simplified)
declare global {
    const faceapi: {
        nets: {
            ssdMobilenetv1: { loadFromUri: (url: string) => Promise<any> };
            faceLandmark68Net: { loadFromUri: (url: string) => Promise<any> };
            faceRecognitionNet: { loadFromUri: (url: string) => Promise<any> };
        };
        detectAllFaces: (img: HTMLImageElement) => {
            withFaceLandmarks: () => {
                withFaceDescriptors: () => Promise<FaceApiDetection[]>;
            };
        };
    };
}

interface FaceApiDetection {
    detection: {
        box: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        score: number;
    };
    landmarks: any;
    descriptor: any;
}

interface DetectedFace extends FaceDetectionType {
    id: string;
    person: string | null;
}

interface FaceDetectionStatus {
    initialized: boolean;
    faceApiLoaded: boolean;
    available: boolean;
}

export class FaceDetection {
    private faceApiLoaded: boolean;
    private isInitialized: boolean;
    private modelsLoading: boolean;

    constructor() {
        this.faceApiLoaded = false;
        this.isInitialized = false;
        this.modelsLoading = false;
        
        // Defer initialization to not block UI
        setTimeout(() => this.init(), 100);
    }

    /**
     * Initialize face detection (non-blocking background load)
     */
    public async init(): Promise<void> {
        if (this.isInitialized) return;
        
        log.info('Initializing Face Detection');
        
        try {
            // Setup event listeners first
            this.setupEventListeners();
            this.isInitialized = true;
            
            // Start loading models in background (non-blocking)
            this.loadModelsInBackground();
            
            log.info('Face Detection initialized (models loading in background)');
        } catch (error) {
            log.error('Failed to initialize Face Detection', error);
        }
    }

    /**
     * Load face detection models in background (non-blocking)
     */
    private async loadModelsInBackground(): Promise<void> {
        // If already loaded or currently loading, skip
        if (this.faceApiLoaded || this.modelsLoading) {
            return;
        }
        
        try {
            if (typeof faceapi === 'undefined') {
                log.warn('Face API library not loaded, face detection will be disabled');
                this.updateButtonState(false, 'Face detection unavailable');
                return;
            }
            
            this.modelsLoading = true;
            this.updateButtonState(false, 'Loading face detection...');
            log.info('Loading Face API models in background...');
            
            // Load face detection models from CDN
            const MODEL_URL = CONFIG.FACE_DETECTION.MODEL_URL;
            
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            
            this.faceApiLoaded = true;
            this.modelsLoading = false;
            
            // Update state
            state.set('faceApiLoaded', true);
            
            // Enable button
            this.updateButtonState(true, CONFIG.FACE_DETECTION.BUTTON_TEXT);
            
            log.info('Face API loaded successfully');
            
        } catch (error) {
            log.error('Failed to load Face API', error);
            this.faceApiLoaded = false;
            this.modelsLoading = false;
            state.set('faceApiLoaded', false);
            this.updateButtonState(false, 'Face detection failed to load');
        }
    }

    /**
     * Setup event listeners for face detection UI
     */
    private setupEventListeners(): void {
        const detectBtn = document.getElementById('detectFacesBtn');
        
        if (detectBtn) {
            // Initially disable button until models load
            this.updateButtonState(false, 'Loading face detection...');
            
            detectBtn.addEventListener('click', () => {
                this.detectFacesInCurrentPhoto();
            });
        }
    }
    
    /**
     * Update face detection button state
     */
    private updateButtonState(enabled: boolean, text: string): void {
        const detectBtn = document.getElementById('detectFacesBtn') as HTMLButtonElement | null;
        
        if (detectBtn) {
            detectBtn.disabled = !enabled;
            detectBtn.textContent = text;
            
            if (enabled) {
                detectBtn.classList.remove('loading');
            } else {
                detectBtn.classList.add('loading');
            }
        }
    }

    /**
     * Detect faces in an image element
     */
    private async detectFaces(imageElement: HTMLImageElement): Promise<DetectedFace[]> {
        if (!this.faceApiLoaded || !imageElement) {
            log.warn('Face API not loaded or invalid image element');
            return [];
        }
        
        try {
            log.info('Detecting faces in image', {
                width: imageElement.naturalWidth,
                height: imageElement.naturalHeight
            });
            
            const detections = await faceapi
                .detectAllFaces(imageElement)
                .withFaceLandmarks()
                .withFaceDescriptors();
            
            const faces: DetectedFace[] = detections.map((detection, index) => ({
                id: `face-${Date.now()}-${index}`,
                x: detection.detection.box.x,
                y: detection.detection.box.y,
                width: detection.detection.box.width,
                height: detection.detection.box.height,
                confidence: detection.detection.score,
                personName: undefined, // Will be set when user tags
                person: null // Legacy property for compatibility
            }));
            
            log.info(`Detected ${faces.length} faces`, faces);
            
            return faces;
            
        } catch (error) {
            log.error('Face detection failed', error);
            return [];
        }
    }

    /**
     * Detect faces in the currently displayed photo
     */
    private async detectFacesInCurrentPhoto(): Promise<void> {
        // Check if models are loaded
        if (this.modelsLoading) {
            this.showNotification('Face detection models are still loading, please wait...', 'info');
            return;
        }
        
        if (!this.faceApiLoaded) {
            this.showNotification('Face detection is not available', 'error');
            return;
        }
        
        const currentPhotoIndex = state.get('currentPhotoIndex');
        const filteredPhotos = state.get('filteredPhotos');
        
        if (!filteredPhotos || currentPhotoIndex >= filteredPhotos.length) {
            log.warn('No current photo for face detection');
            return;
        }
        
        const photo = filteredPhotos[currentPhotoIndex];
        const detectBtn = document.getElementById('detectFacesBtn') as HTMLButtonElement | null;
        const modalImage = document.getElementById('modalImage') as HTMLImageElement | null;
        
        if (!modalImage) {
            log.error('Modal image element not found');
            return;
        }
        
        // Update button state
        if (detectBtn) {
            detectBtn.disabled = true;
            detectBtn.textContent = 'Detecting...';
        }
        
        try {
            // Ensure image is fully loaded
            await this.ensureImageLoaded(modalImage, photo.url);
            
            log.info('Starting face detection for photo:', photo.id);
            
            const faces = await this.detectFaces(modalImage);
            
            if (faces.length > 0) {
                // Update photo with detected faces
                photo.faces = faces;
                
                // Update state
                const photos = state.get('photos');
                const photoIndex = photos.findIndex(p => p.id === photo.id);
                if (photoIndex >= 0) {
                    photos[photoIndex].faces = faces;
                    state.set('photos', photos);
                }
                
                // Draw face boxes with a small delay for rendering
                setTimeout(() => {
                    this.drawFaceBoxes(faces, modalImage);
                }, CONFIG.FACE_DETECTION.RENDER_DELAY);
                
                this.showNotification(`Found ${faces.length} face(s)! Click on faces to tag people.`, 'success');
                
                // Update photo on server
                await this.updatePhotoOnServer(photo);
                
            } else {
                this.showNotification('No faces detected in this photo.', 'info');
            }
            
        } catch (error) {
            log.error('Face detection failed', error);
            this.showNotification('Face detection failed. Please try again.', 'error');
        } finally {
            // Restore button state
            if (detectBtn) {
                detectBtn.disabled = false;
                detectBtn.textContent = CONFIG.FACE_DETECTION.BUTTON_TEXT;
            }
        }
    }

    /**
     * Ensure image is fully loaded with proper dimensions
     */
    private ensureImageLoaded(imageElement: HTMLImageElement, imageUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (imageElement.complete && imageElement.naturalWidth > 0) {
                resolve();
                return;
            }
            
            const timeout = setTimeout(() => {
                reject(new Error('Image load timeout'));
            }, CONFIG.FACE_DETECTION.LOAD_TIMEOUT);
            
            imageElement.onload = () => {
                clearTimeout(timeout);
                resolve();
            };
            
            imageElement.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Image failed to load'));
            };
            
            // Force reload if needed
            if (!imageElement.src || imageElement.src !== imageUrl) {
                imageElement.src = imageUrl;
            }
        });
    }

    /**
     * Draw face detection boxes on an image
     */
    private drawFaceBoxes(faces: DetectedFace[], imageElement: HTMLImageElement): void {
        // Clear existing face boxes first
        this.clearFaceBoxes(imageElement);
        
        const imageContainer = imageElement.parentElement;
        
        if (!imageContainer) {
            log.error('Image container not found');
            return;
        }
        
        log.info(`Drawing ${faces.length} face boxes`);
        log.debug('Image dimensions', {
            display: { width: imageElement.offsetWidth, height: imageElement.offsetHeight },
            natural: { width: imageElement.naturalWidth, height: imageElement.naturalHeight }
        });
        
        faces.forEach((face, index) => {
            const faceBox = this.createFaceBox(face, index, imageElement);
            imageContainer.appendChild(faceBox);
        });
    }

    /**
     * Create a face box element
     */
    private createFaceBox(face: DetectedFace, index: number, imageElement: HTMLImageElement): HTMLElement {
        const faceBox = document.createElement('div');
        faceBox.className = 'face-box';
        faceBox.dataset.faceId = face.id;
        faceBox.dataset.faceIndex = index.toString();
        
        // Calculate relative positioning based on image dimensions
        const scaleX = imageElement.offsetWidth / imageElement.naturalWidth;
        const scaleY = imageElement.offsetHeight / imageElement.naturalHeight;
        
        const adjustedX = face.x * scaleX;
        const adjustedY = face.y * scaleY;
        const adjustedWidth = face.width * scaleX;
        const adjustedHeight = face.height * scaleY;
        
        // Apply face box styles
        const styles = CONFIG.FACE_DETECTION.BOX_STYLES;
        Object.assign(faceBox.style, {
            position: 'absolute',
            left: `${adjustedX}px`,
            top: `${adjustedY}px`,
            width: `${adjustedWidth}px`,
            height: `${adjustedHeight}px`,
            border: styles.border,
            borderRadius: styles.borderRadius,
            cursor: styles.cursor,
            zIndex: styles.zIndex,
            pointerEvents: styles.pointerEvents,
            background: styles.background
        });
        
        // Add click handler for tagging
        faceBox.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            log.info('Face box clicked', { faceId: face.id, index });
            this.tagFace(face, index);
        });
        
        // Add face label
        if (CONFIG.FACE_DETECTION.SHOW_LABELS) {
            const label = this.createFaceLabel(face, index);
            faceBox.appendChild(label);
        }
        
        log.debug(`Face ${index} positioned`, {
            original: { x: face.x, y: face.y, width: face.width, height: face.height },
            adjusted: { x: adjustedX, y: adjustedY, width: adjustedWidth, height: adjustedHeight }
        });
        
        return faceBox;
    }

    /**
     * Create a face label element
     */
    private createFaceLabel(face: DetectedFace, index: number): HTMLElement {
        const label = document.createElement('div');
        label.className = 'face-label';
        
        const labelStyles = CONFIG.FACE_DETECTION.LABEL_STYLES;
        Object.assign(label.style, labelStyles);
        
        // Show person name if tagged, otherwise show face number
        label.textContent = face.person || `Face ${index + 1}`;
        
        return label;
    }

    /**
     * Clear all face boxes from an image
     */
    public clearFaceBoxes(imageElement: HTMLImageElement): void {
        const imageContainer = imageElement.parentElement;
        
        if (!imageContainer) return;
        
        const existingBoxes = imageContainer.querySelectorAll('.face-box');
        existingBoxes.forEach(box => box.remove());
        
        log.debug(`Cleared ${existingBoxes.length} existing face boxes`);
    }

    /**
     * Tag a detected face with a person's name
     */
    private async tagFace(face: DetectedFace, faceIndex: number): Promise<void> {
        const personName = prompt('Who is this person?');
        
        if (!personName || !personName.trim()) {
            return;
        }
        
        const trimmedName = personName.trim();
        
        try {
            const currentPhotoIndex = state.get('currentPhotoIndex');
            const filteredPhotos = state.get('filteredPhotos');
            const photo = filteredPhotos[currentPhotoIndex];
            
            if (!photo) {
                log.error('No current photo found for tagging');
                return;
            }
            
            // Update face with person name
            face.person = trimmedName;
            
            // Initialize people array if needed
            if (!photo.people) {
                photo.people = [];
            }
            
            // Add person to photo's people list if not already there
            if (!photo.people.includes(trimmedName)) {
                photo.people.push(trimmedName);
            }
            
            // Update photo on server
            await this.updatePhotoOnServer(photo);
            
            // Update people display
            this.updatePeopleDisplay(photo);
            
            // Update people filter options
            this.updatePeopleFilterOptions();
            
            // Update face box label
            this.updateFaceBoxLabel(face.id, trimmedName);
            
            this.showNotification(`Tagged ${trimmedName}!`, 'success');
            
            log.info('Face tagged successfully', { faceId: face.id, person: trimmedName });
            
        } catch (error) {
            log.error('Failed to tag face', error);
            this.showNotification('Failed to save tag. Please try again.', 'error');
        }
    }

    /**
     * Update face box label with person name
     */
    private updateFaceBoxLabel(faceId: string, personName: string): void {
        const faceBox = document.querySelector(`[data-face-id="${faceId}"]`);
        if (faceBox) {
            const label = faceBox.querySelector('.face-label');
            if (label) {
                label.textContent = personName;
            }
        }
    }

    /**
     * Display existing face boxes for a photo
     */
    public displayExistingFaces(photo: Photo, imageElement: HTMLImageElement): void {
        if (!photo.faces || photo.faces.length === 0) {
            this.clearFaceBoxes(imageElement);
            return;
        }
        
        // Clear existing boxes first
        this.clearFaceBoxes(imageElement);
        
        // Add delay to ensure image is rendered
        setTimeout(() => {
            log.info('Displaying existing faces for photo:', photo.id);
            // Convert FaceDetection to DetectedFace for compatibility
            const detectedFaces: DetectedFace[] = photo.faces.map((face, index) => ({
                ...face,
                id: `existing-face-${index}`,
                person: face.personName || null
            }));
            this.drawFaceBoxes(detectedFaces, imageElement);
        }, CONFIG.FACE_DETECTION.RENDER_DELAY);
    }

    /**
     * Update people display in modal
     */
    public updatePeopleDisplay(photo: Photo): void {
        const peopleTags = document.getElementById('peopleTags');
        
        if (!peopleTags) return;
        
        if (!photo.people || photo.people.length === 0) {
            peopleTags.innerHTML = '';
            return;
        }
        
        peopleTags.innerHTML = photo.people.map(person => 
            `<span class="person-tag">${person} <span class="remove-tag" data-photo-id="${photo.id}" data-person="${person}">×</span></span>`
        ).join('');
        
        // Add event listeners for remove buttons
        peopleTags.querySelectorAll('.remove-tag').forEach(btn => {
            btn.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const photoId = target.dataset.photoId;
                const person = target.dataset.person;
                if (photoId && person) {
                    this.removePerson(photoId, person);
                }
            });
        });
    }

    /**
     * Remove a person tag from a photo
     */
    private async removePerson(photoId: string, personName: string): Promise<void> {
        try {
            const photos = state.get('photos');
            const photo = photos.find(p => p.id === photoId);
            
            if (!photo) {
                log.error('Photo not found for person removal', { photoId });
                return;
            }
            
            // Initialize people array if needed
            if (!photo.people) {
                photo.people = [];
                return;
            }
            
            // Remove person from people array
            photo.people = photo.people.filter(p => p !== personName);
            
            // Remove person from face tags
            if (photo.faces) {
                photo.faces.forEach(face => {
                    if (face.personName === personName) {
                        face.personName = undefined;
                    }
                });
            }
            
            // Update photo on server
            await this.updatePhotoOnServer(photo);
            
            // Update displays
            this.updatePeopleDisplay(photo);
            this.updatePeopleFilterOptions();
            
            this.showNotification(`Removed ${personName}`, 'info');
            
            log.info('Person removed successfully', { photoId, person: personName });
            
        } catch (error) {
            log.error('Failed to remove person', error);
            this.showNotification('Failed to remove person. Please try again.', 'error');
        }
    }

    /**
     * Update people filter dropdown options
     */
    private updatePeopleFilterOptions(): void {
        const peopleFilter = document.getElementById('peopleFilter') as HTMLSelectElement | null;
        if (!peopleFilter) return;
        
        const photos = state.get('photos');
        
        // Get all unique people names from all photos
        const allPeople = new Set<string>();
        photos.forEach((photo: Photo) => {
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
            peopleFilter.appendChild(option);
        });
        
        log.debug('Updated people filter options', sortedPeople);
    }

    /**
     * Update photo data on server
     */
    private async updatePhotoOnServer(photo: Photo): Promise<void> {
        try {
            await apiClient.updatePhotoPeople(photo.id, photo.people, photo.faces as any);
            
            log.info('Photo updated on server', { photoId: photo.id });
            
        } catch (error) {
            log.error('Failed to update photo on server', error);
            throw error;
        }
    }

    /**
     * Update face detection button visibility
     */
    public updateButtonVisibility(): void {
        const detectBtn = document.getElementById('detectFacesBtn');
        if (detectBtn) {
            detectBtn.style.display = this.faceApiLoaded ? 'block' : 'none';
        }
    }

    /**
     * Show notification to user
     */
    private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
        // This is a simple implementation - in a real app you might use a dedicated notification system
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
     * Check if face detection is available
     */
    public isAvailable(): boolean {
        return this.faceApiLoaded && this.isInitialized;
    }

    /**
     * Get face detection status
     */
    public getStatus(): FaceDetectionStatus {
        return {
            initialized: this.isInitialized,
            faceApiLoaded: this.faceApiLoaded,
            available: this.isAvailable()
        };
    }
}

// Create and export singleton instance
export const faceDetection = new FaceDetection();
export default faceDetection;