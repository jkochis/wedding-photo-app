/**
 * Wedding Photo App Configuration
 * Centralized configuration for the entire application
 */
export const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: '',
        ENDPOINTS: {
            PHOTOS: '/api/photos',
            UPLOAD: '/api/upload',
            PEOPLE: '/api/photos/:id/people',
            STATS: '/api/stats',
            HEALTH: '/health'
        }
    },
    // File Upload Configuration
    UPLOAD: {
        MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
        MAX_BATCH_SIZE: 10,
        MAX_CONCURRENT: 3,
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        SUPPORTED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        MAX_WIDTH: 1920,
        RESIZE_MAX_WIDTH: 1920,
        QUALITY: 0.8,
        COMPRESS_QUALITY: 0.8,
        COMPRESSION_THRESHOLD: 1024 * 1024 // 1MB
    },
    // Face Detection Configuration
    FACE_DETECTION: {
        MODEL_URL: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model',
        CONFIDENCE_THRESHOLD: 0.5,
        MAX_FACES: 10,
        RENDER_DELAY: 300,
        LOAD_TIMEOUT: 10000,
        BUTTON_TEXT: '🧑‍🤝‍🧑 Detect People',
        SHOW_LABELS: true,
        BOX_STYLES: {
            border: '3px solid #e8b4a0',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '1003',
            pointerEvents: 'auto',
            background: 'rgba(232, 180, 160, 0.1)'
        },
        LABEL_STYLES: {
            position: 'absolute',
            top: '-20px',
            left: '0',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '2px 6px',
            fontSize: '10px',
            borderRadius: '3px',
            pointerEvents: 'none'
        }
    },
    // UI Configuration
    UI: {
        PHOTO_TAGS: {
            all: '📱',
            wedding: '👰',
            reception: '🎉',
            other: '📷'
        },
        COLORS: {
            primary: '#e8b4a0',
            secondary: '#d4a574',
            text: '#8b4513',
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3'
        },
        ANIMATION_DELAYS: {
            modal_transition: 300,
            face_box_render: 200,
            notification_duration: 3000
        },
        GRID: {
            min_photo_size: '150px',
            max_photo_size: '250px'
        },
        SWIPE_THRESHOLD: 50,
        NAVIGATION_HINT: '← → Arrow keys or swipe to navigate'
    },
    // Debug Configuration
    DEBUG: {
        ENABLE_GLOBAL_ACCESS: true,
        VERBOSE_FILTERING: true,
        LOG_LEVEL: 'info'
    },
    // Feature Flags
    FEATURES: {
        face_detection: true,
        offline_support: true,
        service_worker: true,
        image_compression: true,
        people_filtering: true,
        photo_navigation: true
    },
    // Storage Keys
    STORAGE: {
        cached_photos: 'cachedPhotos',
        navigation_hint_shown: 'navigationHintShown',
        user_preferences: 'weddingPhotoPrefs'
    }
};
export default CONFIG;
//# sourceMappingURL=config.js.map