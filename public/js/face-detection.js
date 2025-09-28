/**
 * Wedding Photo App Face Detection Module
 * Handles face detection, face box rendering, and people tagging functionality
 */

import { CONFIG } from './config.js';
import { log } from './logger.js';
import { state } from './state.js';
import apiClient from './api-client.js';

export class FaceDetection {
    constructor() {
        this.faceApiLoaded = false;
        this.isInitialized = false;
        
        // Defer initialization to allow Face API to load
        setTimeout(() => this.init(), 1000);
    }

    /**
     * Initialize face detection
     */
    async init() {
        if (this.isInitialized) return;
        
        log.info('Initializing Face Detection');
        
        try {
            await this.initFaceAPI();
            this.setupEventListeners();
            this.isInitialized = true;
            
            log.info('Face Detection initialized successfully', { loaded: this.faceApiLoaded });
        } catch (error) {
            log.error('Failed to initialize Face Detection', error);
        }
    }

    /**
     * Initialize Face API library
     */
    async initFaceAPI() {
        try {
            if (typeof faceapi === 'undefined') {
                log.warn('Face API library not loaded, face detection will be disabled');
                return;
            }
            
            log.info('Loading Face API models...');
            
            // Load face detection models from CDN
            const MODEL_URL = CONFIG.FACE_DETECTION.MODEL_URL;
            
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            
            this.faceApiLoaded = true;
            
            // Update state
            state.set('faceApiLoaded', true);
            
            log.info('Face API loaded successfully');
            
        } catch (error) {
            log.error('Failed to load Face API', error);
            this.faceApiLoaded = false;
            state.set('faceApiLoaded', false);
        }
    }

    /**
     * Setup event listeners for face detection UI
     */
    setupEventListeners() {
        const detectBtn = document.getElementById('detectFacesBtn');
        
        if (detectBtn) {
            detectBtn.addEventListener('click', () => {
                this.detectFacesInCurrentPhoto();
            });
        }
    }

    /**
     * Detect faces in an image element
     * @param {HTMLImageElement} imageElement - The image element to detect faces in
     * @returns {Array} Array of face detection results
     */
    async detectFaces(imageElement) {
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
            
            const faces = detections.map((detection, index) => ({
                id: `face-${Date.now()}-${index}`,
                box: {
                    x: detection.detection.box.x,
                    y: detection.detection.box.y,
                    width: detection.detection.box.width,
                    height: detection.detection.box.height
                },
                confidence: detection.detection.score,
                person: null // Will be set when user tags
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
    async detectFacesInCurrentPhoto() {
        if (!this.faceApiLoaded) {
            this.showNotification('Face detection is loading, please wait...', 'info');
            return;
        }
        
        const currentPhotoIndex = state.get('currentPhotoIndex');
        const filteredPhotos = state.get('filteredPhotos');
        
        if (!filteredPhotos || currentPhotoIndex >= filteredPhotos.length) {
            log.warn('No current photo for face detection');
            return;
        }
        
        const photo = filteredPhotos[currentPhotoIndex];
        const detectBtn = document.getElementById('detectFacesBtn');
        const modalImage = document.getElementById('modalImage');
        
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
     * @param {HTMLImageElement} imageElement - The image element
     * @param {string} imageUrl - The image URL
     */
    ensureImageLoaded(imageElement, imageUrl) {
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
     * @param {Array} faces - Array of face detection results
     * @param {HTMLImageElement} imageElement - The image element to draw on
     */
    drawFaceBoxes(faces, imageElement) {
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
     * @param {Object} face - Face detection result
     * @param {number} index - Face index
     * @param {HTMLImageElement} imageElement - The image element
     * @returns {HTMLElement} The face box element
     */
    createFaceBox(face, index, imageElement) {
        const faceBox = document.createElement('div');
        faceBox.className = 'face-box';
        faceBox.dataset.faceId = face.id;
        faceBox.dataset.faceIndex = index;
        
        // Calculate relative positioning based on image dimensions
        const scaleX = imageElement.offsetWidth / imageElement.naturalWidth;
        const scaleY = imageElement.offsetHeight / imageElement.naturalHeight;
        
        const adjustedX = face.box.x * scaleX;
        const adjustedY = face.box.y * scaleY;
        const adjustedWidth = face.box.width * scaleX;
        const adjustedHeight = face.box.height * scaleY;
        
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
        faceBox.addEventListener('click', (e) => {
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
            original: face.box,
            adjusted: { x: adjustedX, y: adjustedY, width: adjustedWidth, height: adjustedHeight }
        });
        
        return faceBox;
    }

    /**
     * Create a face label element
     * @param {Object} face - Face detection result
     * @param {number} index - Face index
     * @returns {HTMLElement} The label element
     */
    createFaceLabel(face, index) {
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
     * @param {HTMLImageElement} imageElement - The image element
     */
    clearFaceBoxes(imageElement) {
        const imageContainer = imageElement.parentElement;
        
        if (!imageContainer) return;
        
        const existingBoxes = imageContainer.querySelectorAll('.face-box');
        existingBoxes.forEach(box => box.remove());
        
        log.debug(`Cleared ${existingBoxes.length} existing face boxes`);
    }

    /**
     * Tag a detected face with a person's name
     * @param {Object} face - Face detection result
     * @param {number} faceIndex - Face index
     */
    async tagFace(face, faceIndex) {
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
     * @param {string} faceId - Face ID
     * @param {string} personName - Person name
     */
    updateFaceBoxLabel(faceId, personName) {
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
     * @param {Object} photo - Photo object with faces
     * @param {HTMLImageElement} imageElement - Image element
     */
    displayExistingFaces(photo, imageElement) {
        if (!photo.faces || photo.faces.length === 0) {
            this.clearFaceBoxes(imageElement);
            return;
        }
        
        // Clear existing boxes first
        this.clearFaceBoxes(imageElement);
        
        // Add delay to ensure image is rendered
        setTimeout(() => {
            log.info('Displaying existing faces for photo:', photo.id);
            this.drawFaceBoxes(photo.faces, imageElement);
        }, CONFIG.FACE_DETECTION.RENDER_DELAY);
    }

    /**
     * Update people display in modal
     * @param {Object} photo - Photo object
     */
    updatePeopleDisplay(photo) {
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
            btn.addEventListener('click', (e) => {
                const photoId = e.target.dataset.photoId;
                const person = e.target.dataset.person;
                this.removePerson(photoId, person);
            });
        });
    }

    /**
     * Remove a person tag from a photo
     * @param {string} photoId - Photo ID
     * @param {string} personName - Person name to remove
     */
    async removePerson(photoId, personName) {
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
                    if (face.person === personName) {
                        face.person = null;
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
    updatePeopleFilterOptions() {
        const peopleFilter = document.getElementById('peopleFilter');
        if (!peopleFilter) return;
        
        const photos = state.get('photos');
        
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
            peopleFilter.appendChild(option);
        });
        
        log.debug('Updated people filter options', sortedPeople);
    }

    /**
     * Update photo data on server
     * @param {Object} photo - Photo object to update
     */
    async updatePhotoOnServer(photo) {
        try {
            await apiClient.updatePhotoPeople(photo.id, photo.people, photo.faces);
            
            log.info('Photo updated on server', { photoId: photo.id });
            
        } catch (error) {
            log.error('Failed to update photo on server', error);
            throw error;
        }
    }

    /**
     * Update face detection button visibility
     */
    updateButtonVisibility() {
        const detectBtn = document.getElementById('detectFacesBtn');
        if (detectBtn) {
            detectBtn.style.display = this.faceApiLoaded ? 'block' : 'none';
        }
    }

    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = 'info') {
        // This is a simple implementation - in a real app you might use a dedicated notification system
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
     * @returns {boolean} Whether face detection is available
     */
    isAvailable() {
        return this.faceApiLoaded && this.isInitialized;
    }

    /**
     * Get face detection status
     * @returns {Object} Status object
     */
    getStatus() {
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