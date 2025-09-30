const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Generate a unique access token for this instance
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || uuidv4();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Access token validation middleware
const validateAccess = (req, res, next) => {
    const token = req.query.token || req.headers['x-access-token'] || (req.body && req.body.token);
    
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
        fileSize: 25 * 1024 * 1024, // 25MB limit for modern phone photos
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
        
        // Update photo URLs with current token
        let urlsUpdated = false;
        photos.forEach(photo => {
            const expectedUrl = `/uploads/${photo.filename}?token=${ACCESS_TOKEN}`;
            if (photo.url !== expectedUrl) {
                photo.url = expectedUrl;
                urlsUpdated = true;
            }
        });
        
        // Save updated URLs if needed
        if (urlsUpdated) {
            await savePhotos();
            console.log('Updated photo URLs with current token');
        }
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
        console.log('Upload request received:', {
            hasFile: !!req.file,
            body: req.body,
            contentType: req.get('Content-Type')
        });
        
        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { tag = 'other' } = req.body;
        
        const photo = {
            id: uuidv4(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: `/uploads/${req.file.filename}?token=${ACCESS_TOKEN}`,
            tag: tag,
            people: [],
            faces: [],
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

// API to update people tags and face data
app.patch('/api/photos/:id/people', validateAccess, async (req, res) => {
    try {
        const photoId = req.params.id;
        const { people, faces } = req.body;
        
        const photo = photos.find(p => p.id === photoId);
        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }
        
        if (people !== undefined) photo.people = people;
        if (faces !== undefined) photo.faces = faces;
        
        await savePhotos();
        res.json(photo);
    } catch (error) {
        console.error('Update people error:', error);
        res.status(500).json({ error: 'Failed to update people tags' });
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

// Serve static assets without token validation
// Note: The main security is at the HTML page level and API endpoints
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../dist/frontend')));
app.use('/manifest.json', express.static(path.join(__dirname, '../public/manifest.json')));
app.use('/sw.js', express.static(path.join(__dirname, '../public/sw.js')));
app.use('/favicon.ico', (req, res) => {
    res.status(204).end(); // No favicon, return empty response
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.log('Multer error:', error.code, error.message);
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'File too large. Maximum size is 25MB.' });
            return;
        }
        res.status(400).json({ error: `Upload error: ${error.message}` });
        return;
    }
    
    if (error.message && error.message.includes('Only image files are allowed')) {
        res.status(400).json({ error: 'Only image files are allowed' });
        return;
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