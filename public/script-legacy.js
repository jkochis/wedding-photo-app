class WeddingPhotoApp {
    constructor() {
        this.photos = [];
        this.currentFilter = 'all';
        this.selectedTag = 'wedding';
        this.selectedPerson = ''; // For people filtering
        this.currentPhotoIndex = 0;
        this.filteredPhotos = [];
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.faceApiLoaded = false;
        this.accessToken = this.getAccessToken();
        this.init();
    }

    async init() {
        if (!this.accessToken) {
            this.showAccessDenied();
            return;
        }
        this.setupEventListeners();
        this.loadPhotos();
        this.updateGallery();
        await this.initFaceAPI();
    }

    getAccessToken() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token');
    }

    showAccessDenied() {
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                text-align: center;
                padding: 2rem;
                background: linear-gradient(135deg, #f8f4f0 0%, #e8ddd4 100%);
                color: #8b4513;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                <h1 style="font-size: 2rem; margin-bottom: 1rem;">Access Required</h1>
                <p style="font-size: 1.1rem; margin-bottom: 2rem; max-width: 500px;">You need a valid access link to view this wedding photo gallery. Please contact the wedding couple for the correct link.</p>
            </div>
        `;
    }

    setupEventListeners() {
        // File input and upload area
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');

        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop functionality
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });

        // Tag selection buttons
        const tagButtons = document.querySelectorAll('.tag-btn');
        tagButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                tagButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.selectedTag = button.dataset.tag;
            });
        });

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.currentFilter = button.dataset.filter;
                this.updateGallery();
            });
        });
        
        // People filter dropdown
        const peopleFilter = document.getElementById('peopleFilter');
        peopleFilter.addEventListener('change', (e) => {
            this.selectedPerson = e.target.value;
            this.updateGallery();
        });

        // Modal functionality
        const modal = document.getElementById('photoModal');
        const closeModal = document.getElementById('closeModal');
        const prevBtn = document.getElementById('prevPhoto');
        const nextBtn = document.getElementById('nextPhoto');

        closeModal.addEventListener('click', () => {
            this.closeModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        // Navigation button handlers
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.previousPhoto();
        });
        
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.nextPhoto();
        });
        
        // Face detection button
        const detectFacesBtn = document.getElementById('detectFacesBtn');
        detectFacesBtn.addEventListener('click', () => {
            this.detectFacesInCurrentPhoto();
        });

        // Keyboard navigation for modal
        document.addEventListener('keydown', (e) => {
            if (!modal.classList.contains('show')) return;
            
            switch(e.key) {
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
        
        // Touch navigation for modal
        modal.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        });
        
        modal.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });
    }

    async handleFileSelect(event) {
        const files = event.target.files;
        if (files.length > 0) {
            await this.handleFiles(files);
            // Clear the input so the same file can be selected again
            event.target.value = '';
        }
    }

    async handleFiles(files) {
        const validFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );

        if (validFiles.length === 0) {
            this.showNotification('Please select valid image files.', 'error');
            return;
        }

        if (validFiles.length > 10) {
            this.showNotification('Please select no more than 10 photos at a time.', 'error');
            return;
        }

        for (let i = 0; i < validFiles.length; i++) {
            await this.uploadPhoto(validFiles[i], i + 1, validFiles.length);
        }
    }

    async uploadPhoto(file, current, total) {
        // Show upload progress
        this.showUploadProgress(`Uploading photo ${current} of ${total}...`, (current / total) * 100);

        try {
            // Create form data
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('tag', this.selectedTag);

            // Upload to server
            const response = await fetch(`/api/upload?token=${this.accessToken}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            
            // Add photo to local array
            this.photos.push(result);
            
            // Update gallery
            this.updateGallery();
            
            if (current === total) {
                this.hideUploadProgress();
                this.showNotification(
                    total === 1 ? 'Photo uploaded successfully!' : `${total} photos uploaded successfully!`, 
                    'success'
                );
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.hideUploadProgress();
            this.showNotification('Failed to upload photo. Please try again.', 'error');
        }
    }

    async loadPhotos() {
        try {
            const response = await fetch(`/api/photos?token=${this.accessToken}`);
            if (response.ok) {
                this.photos = await response.json();
                this.updateGallery();
                this.updatePeopleFilterOptions();
            }
        } catch (error) {
            console.error('Error loading photos:', error);
        }
    }

    updateGallery() {
        const photoGrid = document.getElementById('photoGrid');
        const emptyState = document.getElementById('emptyState');

        // Filter photos based on current filter and people filter
        let filteredPhotos = this.photos;
        
        // Apply category filter
        if (this.currentFilter !== 'all') {
            filteredPhotos = filteredPhotos.filter(photo => photo.tag === this.currentFilter);
        }
        
        // Apply people filter
        if (this.selectedPerson) {
            filteredPhotos = filteredPhotos.filter(photo => 
                photo.people && photo.people.includes(this.selectedPerson)
            );
        }
        
        this.filteredPhotos = filteredPhotos;

        if (this.filteredPhotos.length === 0) {
            photoGrid.style.display = 'none';
            emptyState.classList.remove('hidden');
        } else {
            photoGrid.style.display = 'grid';
            emptyState.classList.add('hidden');
        }

        // Clear existing photos
        photoGrid.innerHTML = '';

        // Add filtered photos to gallery
        this.filteredPhotos.forEach((photo, index) => {
            const photoItem = this.createPhotoElement(photo, index);
            photoGrid.appendChild(photoItem);
        });
    }

    createPhotoElement(photo, index) {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        
        const tagEmoji = {
            wedding: '👰',
            reception: '🎉',
            other: '📷'
        };

        photoItem.innerHTML = `
            <img src="${photo.url}" alt="Wedding photo" loading="lazy">
            <div class="photo-tag-overlay">
                ${tagEmoji[photo.tag] || '📷'} ${this.capitalizeFirst(photo.tag)}
            </div>
        `;

        // Add click handler to open modal
        photoItem.addEventListener('click', () => {
            this.openPhotoModal(photo, index);
        });

        return photoItem;
    }

    openPhotoModal(photo, index = 0) {
        this.currentPhotoIndex = index;
        this.displayCurrentPhoto();
        
        const modal = document.getElementById('photoModal');
        modal.classList.add('show');
        
        // Show navigation hint if there are multiple photos
        if (this.filteredPhotos.length > 1) {
            this.showNavigationHint();
        }
    }
    
    displayCurrentPhoto() {
        if (this.filteredPhotos.length === 0) return;
        
        const photo = this.filteredPhotos[this.currentPhotoIndex];
        const modalImage = document.getElementById('modalImage');
        const modalTag = document.getElementById('modalTag');
        const modalDate = document.getElementById('modalDate');
        const photoCounter = document.getElementById('photoCounter');

        modalImage.src = photo.url;
        modalTag.textContent = this.capitalizeFirst(photo.tag);
        
        const date = new Date(photo.uploadedAt);
        modalDate.textContent = `Uploaded ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
        
        // Update counter
        if (photoCounter) {
            photoCounter.textContent = `${this.currentPhotoIndex + 1} / ${this.filteredPhotos.length}`;
        }
        
        // Update navigation button states
        this.updateNavigationButtons();
        
        // Update people display and face detection UI
        this.updatePeopleDisplay(photo);
        
        // Clear any existing face boxes first
        this.clearFaceBoxes(modalImage);
        
        // Show existing face boxes if available
        if (photo.faces && photo.faces.length > 0) {
            setTimeout(() => {
                console.log('Displaying existing faces for photo:', photo.id);
                this.drawFaceBoxes(photo.faces, modalImage);
            }, 300); // Longer delay to ensure image is rendered
        }
        
        // Update face detection button state
        const detectBtn = document.getElementById('detectFacesBtn');
        if (detectBtn) {
            detectBtn.style.display = this.faceApiLoaded ? 'block' : 'none';
        }
    }
    
    closeModal() {
        const modal = document.getElementById('photoModal');
        const modalImage = document.getElementById('modalImage');
        
        // Clear face boxes when closing
        this.clearFaceBoxes(modalImage);
        
        modal.classList.remove('show');
    }
    
    nextPhoto() {
        if (this.filteredPhotos.length === 0) return;
        
        this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.filteredPhotos.length;
        this.displayCurrentPhoto();
    }
    
    previousPhoto() {
        if (this.filteredPhotos.length === 0) return;
        
        this.currentPhotoIndex = this.currentPhotoIndex === 0 
            ? this.filteredPhotos.length - 1 
            : this.currentPhotoIndex - 1;
        this.displayCurrentPhoto();
    }
    
    handleSwipe() {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next photo
                this.nextPhoto();
            } else {
                // Swipe right - previous photo
                this.previousPhoto();
            }
        }
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevPhoto');
        const nextBtn = document.getElementById('nextPhoto');
        
        if (prevBtn && nextBtn) {
            const hasMultiplePhotos = this.filteredPhotos.length > 1;
            prevBtn.style.display = hasMultiplePhotos ? 'block' : 'none';
            nextBtn.style.display = hasMultiplePhotos ? 'block' : 'none';
        }
    }
    
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
        hint.textContent = '← → Arrow keys or swipe to navigate';
        
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
            hint.remove();
            style.remove();
        }, 3000);
        
        // Mark as shown
        sessionStorage.setItem('navigationHintShown', 'true');
    }
    
    async initFaceAPI() {
        try {
            if (typeof faceapi === 'undefined') {
                console.log('Face API not loaded, skipping face detection');
                return;
            }
            
            // Load face detection models from CDN
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
            
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            
            this.faceApiLoaded = true;
            console.log('Face API loaded successfully');
        } catch (error) {
            console.log('Failed to load Face API:', error);
        }
    }
    
    async detectFaces(imageElement) {
        if (!this.faceApiLoaded || !imageElement) return [];
        
        try {
            const detections = await faceapi
                .detectAllFaces(imageElement)
                .withFaceLandmarks()
                .withFaceDescriptors();
            
            return detections.map((detection, index) => ({
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
        } catch (error) {
            console.error('Face detection error:', error);
            return [];
        }
    }
    
    async detectFacesInCurrentPhoto() {
        if (!this.faceApiLoaded) {
            this.showNotification('Face detection is loading, please wait...', 'info');
            return;
        }
        
        const photo = this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) return;
        
        const detectBtn = document.getElementById('detectFacesBtn');
        const modalImage = document.getElementById('modalImage');
        
        detectBtn.disabled = true;
        detectBtn.textContent = 'Detecting...';
        
        try {
            // Ensure image is fully loaded with proper dimensions
            await new Promise(resolve => {
                if (modalImage.complete && modalImage.naturalWidth > 0) {
                    resolve();
                } else {
                    modalImage.onload = () => resolve();
                    // Force reload if needed
                    if (!modalImage.src || modalImage.src === '') {
                        modalImage.src = photo.url;
                    }
                }
            });
            
            console.log('Image loaded:', modalImage.naturalWidth, 'x', modalImage.naturalHeight);
            const faces = await this.detectFaces(modalImage);
            
            if (faces.length > 0) {
                photo.faces = faces;
                // Add small delay to ensure image is fully rendered
                setTimeout(() => {
                    this.drawFaceBoxes(faces, modalImage);
                }, 200);
                this.showNotification(`Found ${faces.length} face(s)! Click on faces to tag people.`, 'success');
                await this.updatePhotoOnServer(photo);
            } else {
                this.showNotification('No faces detected in this photo.', 'info');
            }
        } catch (error) {
            console.error('Face detection error:', error);
            this.showNotification('Face detection failed. Please try again.', 'error');
        }
        
        detectBtn.disabled = false;
        detectBtn.textContent = '🧑‍🤝‍🧑 Detect People';
    }
    
    drawFaceBoxes(faces, imageElement) {
        // Clear existing face boxes first
        this.clearFaceBoxes(imageElement);
        
        const imageContainer = imageElement.parentElement;
        
        console.log('Drawing', faces.length, 'face boxes');
        console.log('Image dimensions:', imageElement.offsetWidth, 'x', imageElement.offsetHeight);
        console.log('Image container:', imageContainer);
        
        faces.forEach((face, index) => {
            const faceBox = document.createElement('div');
            faceBox.className = 'face-box';
            
            // Calculate relative positioning based on image dimensions
            const imgRect = imageElement.getBoundingClientRect();
            const containerRect = imageContainer.getBoundingClientRect();
            
            // Adjust coordinates relative to the image within the container
            const scaleX = imageElement.offsetWidth / imageElement.naturalWidth;
            const scaleY = imageElement.offsetHeight / imageElement.naturalHeight;
            
            const adjustedX = face.box.x * scaleX;
            const adjustedY = face.box.y * scaleY;
            const adjustedWidth = face.box.width * scaleX;
            const adjustedHeight = face.box.height * scaleY;
            
            faceBox.style.position = 'absolute';
            faceBox.style.left = `${adjustedX}px`;
            faceBox.style.top = `${adjustedY}px`;
            faceBox.style.width = `${adjustedWidth}px`;
            faceBox.style.height = `${adjustedHeight}px`;
            faceBox.style.border = '3px solid #e8b4a0';
            faceBox.style.borderRadius = '4px';
            faceBox.style.cursor = 'pointer';
            faceBox.style.zIndex = '1003';
            faceBox.style.pointerEvents = 'auto';
            faceBox.style.background = 'rgba(232, 180, 160, 0.1)';
            
            console.log(`Face ${index}: original(${face.box.x}, ${face.box.y}, ${face.box.width}, ${face.box.height})`);
            console.log(`Face ${index}: adjusted(${adjustedX}, ${adjustedY}, ${adjustedWidth}, ${adjustedHeight})`);
            
            faceBox.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Face box clicked!', index);
                this.tagFace(face, index);
            });
            
            // Add a visible label for debugging
            const label = document.createElement('div');
            label.textContent = `Face ${index + 1}`;
            label.style.position = 'absolute';
            label.style.top = '-20px';
            label.style.left = '0';
            label.style.background = 'rgba(0,0,0,0.8)';
            label.style.color = 'white';
            label.style.padding = '2px 6px';
            label.style.fontSize = '10px';
            label.style.borderRadius = '3px';
            label.style.pointerEvents = 'none';
            faceBox.appendChild(label);
            
            imageContainer.appendChild(faceBox);
        });
    }
    
    clearFaceBoxes(imageElement) {
        const imageContainer = imageElement.parentElement;
        const existingBoxes = imageContainer.querySelectorAll('.face-box');
        existingBoxes.forEach(box => box.remove());
        console.log('Cleared', existingBoxes.length, 'existing face boxes');
    }
    
    async tagFace(face, faceIndex) {
        const personName = prompt('Who is this person?');
        if (personName && personName.trim()) {
            const photo = this.filteredPhotos[this.currentPhotoIndex];
            face.person = personName.trim();
            
            // Initialize people array if it doesn't exist
            if (!photo.people) {
                photo.people = [];
            }
            
            // Add to people array if not already there
            if (!photo.people.includes(personName.trim())) {
                photo.people.push(personName.trim());
            }
            
            await this.updatePhotoOnServer(photo);
            this.updatePeopleDisplay(photo);
            this.updatePeopleFilterOptions();
            this.showNotification(`Tagged ${personName}!`, 'success');
        }
    }
    
    updatePeopleDisplay(photo) {
        const peopleTags = document.getElementById('peopleTags');
        if (!photo.people || photo.people.length === 0) {
            peopleTags.innerHTML = '';
            return;
        }
        
        peopleTags.innerHTML = photo.people.map(person => 
            `<span class="person-tag">${person} <span class="remove-tag" onclick="app.removePerson('${photo.id}', '${person}')">×</span></span>`
        ).join('');
    }
    
    async updatePhotoOnServer(photo) {
        try {
            const response = await fetch(`/api/photos/${photo.id}/people?token=${this.accessToken}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    people: photo.people,
                    faces: photo.faces
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update photo');
            }
        } catch (error) {
            console.error('Error updating photo:', error);
            this.showNotification('Failed to save changes', 'error');
        }
    }
    
    async removePerson(photoId, personName) {
        const photo = this.photos.find(p => p.id === photoId);
        if (!photo) return;
        
        // Initialize people array if it doesn't exist
        if (!photo.people) {
            photo.people = [];
            return;
        }
        
        photo.people = photo.people.filter(p => p !== personName);
        // Also remove from face tags
        if (photo.faces) {
            photo.faces.forEach(face => {
                if (face.person === personName) {
                    face.person = null;
                }
            });
        }
        
        await this.updatePhotoOnServer(photo);
        this.updatePeopleDisplay(photo);
        this.showNotification(`Removed ${personName}`, 'info');
        
        // Update the people filter dropdown
        this.updatePeopleFilterOptions();
    }
    
    updatePeopleFilterOptions() {
        const peopleFilter = document.getElementById('peopleFilter');
        if (!peopleFilter) return;
        
        // Get all unique people names from all photos
        const allPeople = new Set();
        this.photos.forEach(photo => {
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
        
        console.log('Updated people filter with:', sortedPeople);
    }

    showUploadProgress(text, percentage) {
        const uploadProgress = document.getElementById('uploadProgress');
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');

        progressText.textContent = text;
        progressFill.style.width = `${percentage}%`;
        uploadProgress.classList.add('show');
    }

    hideUploadProgress() {
        const uploadProgress = document.getElementById('uploadProgress');
        setTimeout(() => {
            uploadProgress.classList.remove('show');
        }, 1000);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
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
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Utility method to compress images before upload
    async compressImage(file, maxWidth = 1920, quality = 0.8) {
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

            img.src = URL.createObjectURL(file);
        });
    }

    // Method to handle offline functionality (basic caching)
    cachePhoto(photo) {
        try {
            const cached = JSON.parse(localStorage.getItem('cachedPhotos') || '[]');
            cached.push(photo);
            localStorage.setItem('cachedPhotos', JSON.stringify(cached));
        } catch (error) {
            console.error('Error caching photo:', error);
        }
    }

    loadCachedPhotos() {
        try {
            const cached = JSON.parse(localStorage.getItem('cachedPhotos') || '[]');
            return cached;
        } catch (error) {
            console.error('Error loading cached photos:', error);
            return [];
        }
    }
}

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WeddingPhotoApp();
});

// Handle online/offline states
window.addEventListener('online', () => {
    document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
});