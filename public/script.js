class WeddingPhotoApp {
    constructor() {
        this.photos = [];
        this.currentFilter = 'all';
        this.selectedTag = 'wedding';
        this.accessToken = this.getAccessToken();
        this.init();
    }

    init() {
        if (!this.accessToken) {
            this.showAccessDenied();
            return;
        }
        this.setupEventListeners();
        this.loadPhotos();
        this.updateGallery();
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

        // Modal functionality
        const modal = document.getElementById('photoModal');
        const closeModal = document.getElementById('closeModal');

        closeModal.addEventListener('click', () => {
            modal.classList.remove('show');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });

        // Keyboard navigation for modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                modal.classList.remove('show');
            }
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
            }
        } catch (error) {
            console.error('Error loading photos:', error);
        }
    }

    updateGallery() {
        const photoGrid = document.getElementById('photoGrid');
        const emptyState = document.getElementById('emptyState');

        // Filter photos based on current filter
        const filteredPhotos = this.currentFilter === 'all' 
            ? this.photos 
            : this.photos.filter(photo => photo.tag === this.currentFilter);

        if (filteredPhotos.length === 0) {
            photoGrid.style.display = 'none';
            emptyState.classList.remove('hidden');
        } else {
            photoGrid.style.display = 'grid';
            emptyState.classList.add('hidden');
        }

        // Clear existing photos
        photoGrid.innerHTML = '';

        // Add filtered photos to gallery
        filteredPhotos.forEach((photo, index) => {
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
            this.openPhotoModal(photo);
        });

        return photoItem;
    }

    openPhotoModal(photo) {
        const modal = document.getElementById('photoModal');
        const modalImage = document.getElementById('modalImage');
        const modalTag = document.getElementById('modalTag');
        const modalDate = document.getElementById('modalDate');

        modalImage.src = photo.url;
        modalTag.textContent = this.capitalizeFirst(photo.tag);
        
        const date = new Date(photo.uploadedAt);
        modalDate.textContent = `Uploaded ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;

        modal.classList.add('show');
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
    new WeddingPhotoApp();
});

// Handle online/offline states
window.addEventListener('online', () => {
    document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
});