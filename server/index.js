const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Generate a unique access token for this instance
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || uuidv4();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Access token validation middleware
const validateAccess = (req, res, next) => {
    const token = req.query.token || req.headers['x-access-token'] || req.body.token;
    
    if (!token || token !== ACCESS_TOKEN) {
        return res.status(401).json({ 
            error: 'Access denied. Invalid or missing access token.' 
        });
    }
    
    next();
};

// Serve static files with access token validation
app.use('/uploads', (req, res, next) => {
    validateAccess(req, res, next);
}, express.static(path.join(__dirname, '../uploads')));

// Serve public files (HTML, CSS, JS) with access token validation
app.use('/', (req, res, next) => {
    // Allow access to root and API endpoints without token for initial validation
    if (req.path === '/' || req.path.startsWith('/api/')) {
        return next();
    }
    validateAccess(req, res, next);
}, express.static(path.join(__dirname, '../public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../uploads');
        try {
            await fs.access(uploadsDir);
        } catch {
            await fs.mkdir(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `photo-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Data storage (in production, you'd want to use a proper database)
let photos = [];
const photosFilePath = path.join(__dirname, 'photos.json');

// Load existing photos on server start
async function loadPhotos() {
    try {
        const data = await fs.readFile(photosFilePath, 'utf8');
        photos = JSON.parse(data);
    } catch (error) {
        console.log('No existing photos file found, starting fresh');
        photos = [];
    }
}

// Save photos to file
async function savePhotos() {
    try {
        await fs.writeFile(photosFilePath, JSON.stringify(photos, null, 2));
    } catch (error) {
        console.error('Error saving photos:', error);
    }
}

// Routes

// Root route with access validation
app.get('/', (req, res) => {
    const token = req.query.token;
    
    if (!token || token !== ACCESS_TOKEN) {
        return res.status(401).json({
            error: 'Access denied. Please use the correct access link.',
            message: 'You need a valid access token to view this wedding photo gallery.'
        });
    }
    
    // Serve the main HTML file
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API to get all photos
app.get('/api/photos', validateAccess, (req, res) => {
    res.json(photos);
});

// API to upload photos
app.post('/api/upload', validateAccess, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { tag = 'other' } = req.body;
        
        const photo = {
            id: uuidv4(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: `/uploads/${req.file.filename}?token=${ACCESS_TOKEN}`,
            tag: tag,
            size: req.file.size,
            uploadedAt: new Date().toISOString(),
            mimetype: req.file.mimetype
        };

        photos.push(photo);
        await savePhotos();

        res.json(photo);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// API to delete a photo (optional, for admin purposes)
app.delete('/api/photos/:id', validateAccess, async (req, res) => {
    try {
        const photoId = req.params.id;
        const photoIndex = photos.findIndex(p => p.id === photoId);
        
        if (photoIndex === -1) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        const photo = photos[photoIndex];
        
        // Delete the file
        const filePath = path.join(__dirname, '../uploads', photo.filename);
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.warn('Could not delete file:', error);
        }

        // Remove from array
        photos.splice(photoIndex, 1);
        await savePhotos();

        res.json({ message: 'Photo deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

// API to get gallery stats
app.get('/api/stats', validateAccess, (req, res) => {
    const stats = {
        totalPhotos: photos.length,
        byTag: {
            wedding: photos.filter(p => p.tag === 'wedding').length,
            reception: photos.filter(p => p.tag === 'reception').length,
            other: photos.filter(p => p.tag === 'other').length
        },
        totalSize: photos.reduce((sum, photo) => sum + photo.size, 0),
        uploadedToday: photos.filter(p => {
            const today = new Date().toDateString();
            const photoDate = new Date(p.uploadedAt).toDateString();
            return today === photoDate;
        }).length
    };
    
    res.json(stats);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        photos: photos.length 
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
    await loadPhotos();
    
    app.listen(PORT, () => {
        console.log(`🎉 Wedding Photo App server running on port ${PORT}`);
        console.log(`📱 Access URL: http://localhost:${PORT}?token=${ACCESS_TOKEN}`);
        console.log(`🔐 Access Token: ${ACCESS_TOKEN}`);
        console.log(`📸 Total photos loaded: ${photos.length}`);
        
        if (!process.env.ACCESS_TOKEN) {
            console.log('⚠️  No ACCESS_TOKEN set in environment variables. Using generated token above.');
            console.log('   Set ACCESS_TOKEN in your .env file for production use.');
        }
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await savePhotos();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await savePhotos();
    process.exit(0);
});

startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});