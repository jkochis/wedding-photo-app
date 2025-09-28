# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Application Overview

This is a mobile-first wedding photo sharing web application built with vanilla JavaScript, Node.js/Express backend, and token-based access control. The app allows wedding guests to upload and view photos using a secure access link, with automatic photo categorization and real-time gallery updates.

## Architecture

### Backend (server/index.js)
- **Express.js server** with token-based authentication middleware
- **Multer** for file upload handling with 25MB size limit
- **File-based storage** using local filesystem and JSON for metadata
- **Auto-generated access tokens** (UUID) or custom tokens via environment variables
- **REST API endpoints** for photo CRUD operations and statistics

### Frontend Architecture Evolution

#### **Current (Legacy)** - `public/script.js`
- **Monolithic class** (`WeddingPhotoApp` - 893 lines)
- All functionality in single file
- Tightly coupled components

#### **New (Modular)** - `public/js/` modules
- **Core Infrastructure**:
  - `config.js` - Centralized configuration management
  - `state.js` - Event-driven state management system  
  - `utils.js` - Common utilities and helpers
  - `logger.js` - Logging and error handling
- **Feature Modules** (In Progress):
  - `api-client.js` - API communication layer
  - `photo-manager.js` - Photo data management
  - `face-detection.js` - Face detection and tagging
  - `filter-manager.js` - Photo filtering logic
  - `modal-manager.js` - Photo navigation and modal

#### **Key Features**
- **Progressive Web App (PWA)** with service worker support
- **Responsive design** optimized for mobile devices with touch interactions
- **Real-time photo gallery** with drag/drop upload and modal viewer
- **Photo tagging system** (Wedding, Reception, Other categories)
- **AI-powered face detection** with people tagging
- **Advanced filtering** by category and person

### Data Flow
1. Client authenticates via URL token parameter (`?token=...`)
2. Photos uploaded to `/uploads/` directory with generated filenames
3. Metadata stored in `server/photos.json` array
4. Gallery updates in real-time after successful uploads
5. All API endpoints protected by access token validation

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server (auto-generated token)
npm start
npm run dev

# Clean uploaded photos and database (useful for development)
npm run clean

# Set custom access token for production
echo "ACCESS_TOKEN=your-custom-token" > .env
npm start
```

### Testing & Debugging
```bash
# Check server health
curl http://localhost:3000/health

# Test API with token (replace TOKEN with actual value)
curl "http://localhost:3000/api/photos?token=TOKEN"

# View server logs
npm start | tee server.log
```

### File Structure Operations
```bash
# View uploaded photos
ls -la uploads/

# Check photo metadata
cat server/photos.json | jq '.'

# Clean uploads and database (for development)
npm run clean
```

## Key Implementation Details

### Authentication System
- Token passed via query parameter (`?token=...`), headers (`x-access-token`), or request body
- Middleware validates all protected routes and static file access
- Root route requires token to serve HTML, API endpoints validate per request

### File Upload Architecture
- **Multer configuration**: 10MB limit, image MIME type validation
- **Filename generation**: `photo-{timestamp}-{random}.{ext}` pattern
- **Directory auto-creation**: `uploads/` folder created if missing
- **Error handling**: Comprehensive upload error responses

### Frontend State Management
- **Photo state**: Array of photo objects with metadata
- **Filter state**: Current view filter (all, wedding, reception, other)
- **Upload state**: Progress tracking and batch upload support
- **Modal state**: Photo viewer with metadata display

### Mobile Optimization
- Touch-friendly upload area with camera capture
- Drag & drop interface with visual feedback
- Responsive grid layout (150px-250px photo tiles based on screen size)
- **Swipe navigation**: Swipe left/right to navigate between photos in modal view
- **Arrow key support**: Use arrow keys (←→↑↓) for photo navigation
- **Touch navigation buttons**: Circular navigation buttons for easy photo browsing
- PWA manifest for home screen installation
- Offline support with service worker and localStorage caching

## Environment Configuration

### Required Environment Variables
```bash
# Optional: Custom access token (recommended for production)
ACCESS_TOKEN=your-secure-wedding-token

# Optional: Custom port (default: 3000)  
PORT=3000
```

### File Limits & Validation
- **Max file size**: 25MB per photo (optimized for modern phone cameras)
- **Max batch upload**: 10 photos simultaneously
- **Supported formats**: JPG, PNG, GIF, WebP (image/* MIME types)
- **Filename sanitization**: Auto-generated safe filenames

## Customization Points

### Visual Customization
- **Color scheme**: Edit CSS variables for `#e8b4a0` (rose gold) and `#d4a574` (champagne)
- **Photo categories**: Modify tag buttons in `public/index.html` and corresponding JavaScript handlers
- **Wedding details**: Update header text and welcome messages

### Functionality Extensions
- **Database integration**: Replace JSON file storage with proper database
- **Cloud storage**: Replace local file storage with S3/CloudFront
- **User management**: Add admin interface for photo management
- **Download features**: Bulk photo download functionality
- **Social features**: Photo comments or reactions

## Security Considerations

- Access token should be cryptographically secure for production use
- File uploads restricted to image MIME types only
- No public file access without valid token
- Rate limiting not implemented (consider adding for production)
- HTTPS recommended for production deployment