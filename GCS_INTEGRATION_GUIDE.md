# GCS Integration Complete! ✅

## What's Been Set Up

### ✅ GCS Infrastructure
- **Bucket**: `wedding-photos-nineteen-450716`
- **Service Account**: `wedding-photo-uploader@nineteen-450716.iam.gserviceaccount.com`
- **Credentials**: `config/gcs-key.json` (local only, git ignored)
- **Permissions**: Full object admin access
- **Connection**: Tested and working!

### ✅ Dependencies Installed
```bash
@google-cloud/storage - INSTALLED ✅
```

### ✅ Configuration
Your `.env` file is configured with:
```
STORAGE_TYPE=gcs
GCS_BUCKET_NAME=wedding-photos-nineteen-450716
GCS_KEYFILE=./config/gcs-key.json
GCS_PROJECT_ID=nineteen-450716
```

### ✅ Storage Modules Created
- `server/storage/gcs-storage.js` - GCS adapter
- `server/storage/index.js` - Storage factory

---

## Next: Integrate into Server

The server code (`server/index.cjs`) currently uses local file storage with multer. To switch to GCS, we need to:

1. Replace multer disk storage with multer memory storage
2. Use the GCS storage adapter to upload files
3. Update the delete and clear operations to use GCS

### Option A: Minimal Changes (Keep Both)

Keep local storage for development, use GCS in production:

```javascript
// At the top of server/index.cjs
const { createStorage } = require('./storage');

// Initialize storage adapter
const storageAdapter = createStorage({
    type: process.env.STORAGE_TYPE,
    local: {
        uploadsDir: process.env.NODE_ENV === 'production' ? '/app/data/uploads' : path.join(__dirname, '../uploads'),
        baseUrl: 'https://group-images-production.up.railway.app',
        accessToken: ACCESS_TOKEN
    }
});

// Change multer to memory storage (for GCS)
const upload = multer({
    storage: multer.memoryStorage(), // Store in memory, not disk
    limits: {
        fileSize: 25 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// In upload handler, replace lines 161-197:
app.post('/api/upload', validateAccess, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { tag = 'other' } = req.body;
        
        // Generate filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(req.file.originalname);
        const filename = `photo-${uniqueSuffix}${extension}`;
        
        // Save to storage (GCS or local)
        const fileUrl = await storageAdapter.saveFile(
            req.file.buffer,
            filename,
            {
                originalName: req.file.originalname,
                mimetype: req.file.mimetype
            }
        );
        
        const photo = {
            id: uuidv4(),
            filename: filename,
            originalName: req.file.originalname,
            url: fileUrl, // URL from storage adapter
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

// Update delete handler to use storage adapter
app.delete('/api/photos/:id', validateAccess, async (req, res) => {
    try {
        const photoId = req.params.id;
        const photoIndex = photos.findIndex(p => p.id === photoId);
        
        if (photoIndex === -1) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        const photo = photos[photoIndex];
        
        // Delete file using storage adapter
        await storageAdapter.deleteFile(photo.filename);

        // Remove from array
        photos.splice(photoIndex, 1);
        await savePhotos();

        res.json({ message: 'Photo deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

// Update clear all handler
app.delete('/api/admin/clear-all', validateAccess, async (req, res) => {
    try {
        if (req.body.confirm !== 'DELETE_ALL_DATA') {
            return res.status(400).json({ 
                error: 'Confirmation required.' 
            });
        }
        
        console.log('⚠️  ADMIN: Clearing all photos and data...');
        
        const photoCount = photos.length;
        
        // Delete all files using storage adapter
        const deleteStats = await storageAdapter.deleteAllFiles();
        
        // Clear photos array and save empty database
        photos.length = 0;
        await savePhotos();
        
        console.log(`✅ ADMIN: Cleared ${photoCount} photos from database`);
        
        res.json({ 
            success: true,
            message: 'All photos and data deleted successfully',
            stats: {
                photosCleared: photoCount,
                ...deleteStats
            }
        });
    } catch (error) {
        console.error('ADMIN: Clear all error:', error);
        res.status(500).json({ error: 'Failed to clear all data' });
    }
});
```

---

## Railway Configuration

Once the server is updated, configure Railway:

```bash
# 1. Base64 encode credentials
base64 -i config/gcs-key.json | pbcopy

# 2. Set Railway variables
railway variables --set STORAGE_TYPE=gcs
railway variables --set GCS_BUCKET_NAME=wedding-photos-nineteen-450716
railway variables --set GCS_PROJECT_ID=nineteen-450716
railway variables --set GCS_CREDENTIALS_BASE64="<paste from clipboard>"

# 3. Deploy
railway up
```

---

## Testing Locally First

```bash
# Your .env is already configured, so just:
npm run dev

# Upload a test photo through the UI
# Check GCS bucket:
gsutil ls gs://wedding-photos-nineteen-450716
```

---

## Benefits You'll Get

- ✅ **Cheaper**: ~$0.05/month vs $10-20/month
- ✅ **Scalable**: Unlimited storage
- ✅ **Reliable**: Google's infrastructure
- ✅ **Portable**: Not tied to Railway
- ✅ **Secure**: Signed URLs with expiration

---

## Ready to Integrate?

Say the word and I'll:
1. Update `server/index.cjs` with GCS integration
2. Test it locally  
3. Deploy to Railway
4. Verify photos upload to GCS

The infrastructure is ready - just need to wire it up!