import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import type { Request, Response, NextFunction } from 'express';
import type { Photo, PhotoTag } from './shared-types.js';
import { storageService } from './storage.js';
import type { StorageInfo, StorageStatus } from './types.js';

dotenv.config();

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

// Generate a unique access token for this instance
const ACCESS_TOKEN: string = process.env.ACCESS_TOKEN || uuidv4();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Access token validation middleware
const validateAccess = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.query.token || req.headers['x-access-token'] || (req.body && req.body.token);
    
    if (!token || token !== ACCESS_TOKEN) {
        res.status(401).json({ 
            error: 'Access denied. Invalid or missing access token.' 
        });
        return;
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
            cb(new Error('Only image files are allowed!') as any, false);
        }
    }
});

// Data storage (in production, you'd want to use a proper database)
let photos: Photo[] = [];
const photosFilePath = path.join(__dirname, 'photos.json');

// Load existing photos on server start
async function loadPhotos(): Promise<void> {
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
async function savePhotos(): Promise<void> {
    try {
        await fs.writeFile(photosFilePath, JSON.stringify(photos, null, 2));
    } catch (error) {
        console.error('Error saving photos:', error);
    }
}

// Routes

// Root route with access validation
app.get('/', (req: Request, res: Response): void => {
    const token = req.query.token;
    
    if (!token || token !== ACCESS_TOKEN) {
        res.status(401).json({
            error: 'Access denied. Please use the correct access link.',
            message: 'You need a valid access token to view this wedding photo gallery.'
        });
        return;
    }
    
    // Serve the main HTML file
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API to get all photos
app.get('/api/photos', validateAccess, (req: Request, res: Response): void => {
    res.json(photos);
});

// API to upload photos
app.post('/api/upload', validateAccess, upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Upload request received:', {
            hasFile: !!req.file,
            body: req.body,
            contentType: req.get('Content-Type')
        });
        
        if (!req.file) {
            console.log('No file in request');
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const { tag = 'other' } = req.body;
        let photoUrl: string;
        
        try {
            // Try to upload to Google Cloud Storage first
            const storageInfo = storageService.getStorageInfo();
            if (storageInfo.configured) {
                photoUrl = await storageService.uploadPhoto(req.file.path, req.file.filename);
                console.log('🌤️  Photo uploaded to Google Cloud Storage');
            } else {
                // Fallback to local storage
                photoUrl = await storageService.uploadToLocal(req.file.path, req.file.filename);
                photoUrl = `${photoUrl}?token=${ACCESS_TOKEN}`;
                console.log('📁 Photo stored locally (GCS not configured)');
            }
        } catch (cloudError) {
            const errorMessage = cloudError instanceof Error ? cloudError.message : 'Unknown error';
            console.warn('⚠️  Cloud storage failed, falling back to local:', errorMessage);
            photoUrl = await storageService.uploadToLocal(req.file.path, req.file.filename);
            photoUrl = `${photoUrl}?token=${ACCESS_TOKEN}`;
        }
        
        // Clean up temporary file
        try {
            await fs.unlink(req.file.path);
        } catch (unlinkError) {
            const errorMessage = unlinkError instanceof Error ? unlinkError.message : 'Unknown error';
            console.warn('Could not clean up temp file:', errorMessage);
        }
        
        const photo: Photo = {
            id: uuidv4(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: photoUrl,
            tag: tag as PhotoTag,
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
app.delete('/api/photos/:id', validateAccess, async (req: Request, res: Response): Promise<void> => {
    try {
        const photoId = req.params.id;
        const photoIndex = photos.findIndex(p => p.id === photoId);
        
        if (photoIndex === -1) {
            res.status(404).json({ error: 'Photo not found' });
            return;
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
app.patch('/api/photos/:id/people', validateAccess, async (req: Request, res: Response): Promise<void> => {
    try {
        const photoId = req.params.id;
        const { people, faces } = req.body;
        
        const photo = photos.find(p => p.id === photoId);
        if (!photo) {
            res.status(404).json({ error: 'Photo not found' });
            return;
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
    const storageInfo = storageService.getStorageInfo();
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        photos: photos.length,
        storage: storageInfo
    });
});

// Storage status endpoint
app.get('/api/storage/status', validateAccess, async (req, res) => {
    try {
        const storageInfo = storageService.getStorageInfo();
        const isConnected = storageInfo.configured ? await storageService.checkConnection() : false;
        
        res.json({
            ...storageInfo,
            connected: isConnected,
            mode: storageInfo.configured && isConnected ? 'cloud' : 'local'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ 
            error: 'Failed to check storage status',
            details: errorMessage 
        });
    }
});

// Serve static assets (CSS, JS, manifest.json, service worker) without token validation
// Note: The main security is at the HTML page level and API endpoints
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../dist/frontend')));
app.use('/manifest.json', express.static(path.join(__dirname, '../public/manifest.json')));
app.use('/sw.js', express.static(path.join(__dirname, '../public/sw.js')));

// Legacy static file serving removed - using modular TypeScript/CSS architecture
app.use('/favicon.ico', (req, res) => {
    res.status(204).end(); // No favicon, return empty response
});

// Error handling middleware
app.use((error: any, req: Request, res: Response, next: NextFunction): void => {
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
    
    // Initialize storage service
    const storageInfo = storageService.getStorageInfo();
    console.log('🗺️  Storage configuration:', {
        provider: storageInfo.provider,
        bucket: storageInfo.bucket,
        configured: storageInfo.configured
    });
    
    if (storageInfo.configured) {
        try {
            const connected = await storageService.checkConnection();
            if (!connected) {
                console.log('📦 Will fallback to local storage');
            }
        } catch (error) {
            console.warn('⚠️  Storage check failed, will use local fallback');
        }
    } else {
        console.log('📁 Using local file storage (GCS not configured)');
        console.log('   Set GCS_BUCKET_NAME and GOOGLE_CLOUD_PROJECT for cloud storage');
    }
    
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