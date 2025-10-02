# 💕 Wedding Photo Sharing App

A beautiful, mobile-first web application for sharing wedding photos with friends and family. Features link-based access control to keep your memories private and secure.

## ✨ Features

- 📱 **Mobile-optimized**: Designed for phones and tablets with touch-friendly interface
- 🔐 **Link-based access**: Only people with the access link can view and upload photos  
- 🏷️ **Photo tagging**: Organize photos by Wedding, Reception, or Other categories
- 🎯 **Smart filtering**: View all photos or filter by specific tags
- 📤 **Drag & drop upload**: Easy photo uploads with progress tracking
- 🖼️ **Gallery view**: Beautiful grid layout with modal photo viewer
- 💾 **Auto-save**: Photos are automatically saved with metadata
- 🎨 **Beautiful design**: Elegant wedding-themed color palette

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone or download** this project to your computer
2. **Navigate** to the project directory:
   ```bash
   cd wedding-photo-app
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the server**:
   ```bash
   npm start
   ```
5. **Access the app**: Look for the access URL and token in the console output

## 🛠️ Development Commands

### Basic Commands
```bash
npm start          # Build and start the server
npm run dev        # Build and start development server
npm run build      # Build TypeScript (frontend + server)
npm run clean      # Clear uploaded photos, build artifacts, and database
```

### TypeScript Development
```bash
npm run build:frontend     # Build frontend TypeScript to dist/public/js/
npm run build:server      # Build server TypeScript to dist/server/
npm run type-check        # Check all TypeScript files for errors
npm run type-check:frontend # Check only frontend TypeScript files
npm run build:watch       # Watch and rebuild frontend on changes
```

### CSS Development Tools
```bash
npm run css:list     # List all CSS files with sizes
npm run css:analyze  # Analyze CSS for potential issues
npm run css:component <name>  # Create new CSS component
npm run css:utility <name>    # Create new CSS utility file
```

For detailed CSS development guidance, see the development documentation.

## 🔑 Access Control

The app uses a unique access token for security. When you start the server, you'll see output like:

```
🎉 Wedding Photo App server running on port 3000
📱 Access URL: http://localhost:3000?token=abc123xyz
🔐 Access Token: abc123xyz
```

**Share the complete access URL** (including the `?token=...` part) with your wedding guests.

### Setting a Custom Access Token

For production use, set a custom token in a `.env` file:

```bash
# Create .env file
echo "ACCESS_TOKEN=your-custom-wedding-token-here" > .env
```

## 📱 Usage

### For Guests (Mobile Users)

1. **Open the link** shared by the couple on your mobile device
2. **Upload photos**: 
   - Tap the upload area or camera icon
   - Select photos from your device
   - Choose the appropriate tag (Wedding, Reception, Other)
   - Photos upload automatically
3. **View photos**: Scroll down to see all uploaded photos
4. **Filter photos**: Use the filter buttons to see specific categories
5. **View full size**: Tap any photo to see it in full size

### For Hosts (Couple)

1. **Share the access URL** with your wedding guests via:
   - Text message/WhatsApp
   - Email
   - Wedding website
   - QR code (you can generate one online)

2. **Monitor uploads**: Photos appear in real-time as guests upload them

3. **Download photos**: Access uploaded photos in the `uploads/` folder

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required: Custom access token (recommended for production)
ACCESS_TOKEN=your-secure-wedding-token

# Optional: Custom port (default: 3000)
PORT=3000
```

### File Limits

- **Maximum file size**: 10MB per photo
- **Maximum uploads per batch**: 10 photos
- **Supported formats**: JPG, PNG, GIF, WebP

## 🌐 Deployment

### Local Network Access

To allow guests on your WiFi to access the app:

1. Find your computer's IP address:
   - **Mac/Linux**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - **Windows**: `ipconfig | findstr "IPv4"`

2. Share the URL with your IP:
   ```
   http://192.168.1.100:3000?token=your-token
   ```

### Cloud Deployment

For internet-wide access, deploy to platforms like:
- **Railway**: Simple Node.js deployment (see [docs/deployment/](docs/deployment/))
- **Heroku**: Easy deployment with git
- **Vercel**: Great for static sites with serverless functions  
- **DigitalOcean**: VPS hosting

For detailed deployment instructions, see:
- **[docs/deployment/RAILWAY_SETUP_CHECKLIST.md](docs/deployment/RAILWAY_SETUP_CHECKLIST.md)** - Quick Railway deployment
- **[docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md)** - Complete deployment guide
- **[docs/gcs/GCS_SETUP.md](docs/gcs/GCS_SETUP.md)** - Google Cloud Storage setup

## 📁 Project Structure

```
wedding-photo-app/
├── src/                 # TypeScript source files
│   ├── frontend/       # Frontend TypeScript modules
│   │   ├── api-client.ts      # API communication layer
│   │   ├── config.ts          # App configuration
│   │   ├── face-detection.ts  # AI face detection
│   │   ├── filter-manager.ts  # Photo filtering logic
│   │   ├── logger.ts          # Logging system
│   │   ├── main.ts            # Main app entry point
│   │   ├── modal-manager.ts   # Photo modal viewer
│   │   ├── photo-manager.ts   # Photo data management
│   │   ├── state.ts           # Event-driven state management
│   │   ├── theme-manager.ts   # Theme switching
│   │   ├── upload-manager.ts  # File upload handling
│   │   └── utils.ts           # Common utilities
│   └── types/          # Shared TypeScript type definitions
│       └── index.ts    # All app type definitions
├── dist/               # Compiled TypeScript output
│   ├── public/js/      # Built frontend JavaScript
│   └── server/         # Built server JavaScript
├── public/             # Static frontend files
│   ├── css/           # Modular CSS architecture
│   │   ├── base/      # Foundation styles (reset, tokens, typography)
│   │   ├── utilities/ # Utility classes (spacing, layout, visual)
│   │   ├── layout/    # Layout components
│   │   ├── components/# UI components
│   │   └── main.css   # CSS entry point
│   ├── index.html     # Main HTML file
│   ├── script.js      # Legacy monolithic JS (being replaced)
│   └── manifest.json  # PWA manifest
├── server/            # Backend TypeScript files
│   ├── index.ts       # Express server (TypeScript)
│   ├── index.cjs      # Express server (CommonJS)
│   ├── shared-types.ts # Server-only type definitions
│   ├── storage.ts     # File storage service
│   ├── types.ts       # Server type definitions
│   └── photos.json    # Photo database (auto-generated)
├── scripts/           # Development tools
│   └── css-utils.js   # CSS architecture management
├── docs/              # Documentation (organized by category)
│   ├── README.md      # Documentation index
│   ├── deployment/    # Deployment guides
│   ├── gcs/           # Google Cloud Storage setup
│   └── development/   # Development workflows
│   └── CSS_DEVELOPMENT.md # CSS development guide
├── uploads/           # Uploaded photos (auto-generated)
├── tsconfig.json          # Main TypeScript configuration
├── tsconfig.frontend.json # Frontend build configuration
├── tsconfig.server.json   # Server build configuration
├── package.json       # Node.js dependencies and scripts
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## 🔒 Security Features

- **Token-based access**: Only users with the correct token can access the app
- **File validation**: Only image files are accepted
- **File size limits**: Prevents server overload
- **No public access**: Photos are protected behind authentication

## 🎨 Customization

### Colors and Styling

The app uses a modular CSS architecture. To customize:

- **Design tokens**: Edit `public/css/base/tokens.css` for colors, spacing, typography
- **Components**: Modify individual component files in `public/css/components/`
- **Create new styles**: Use the CSS utilities: `npm run css:component <name>`

See [`docs/CSS_DEVELOPMENT.md`](docs/CSS_DEVELOPMENT.md) for detailed guidance.

### Wedding Details

Edit `public/index.html` to customize:
- Page title and header text
- Tag options (Wedding, Reception, Other)
- Welcome message

## 🚨 Troubleshooting

### Common Issues

**"Access denied" error**:
- Make sure the URL includes `?token=...`
- Check that the token matches the one shown in console

**Photos not uploading**:
- Check file size (max 10MB)
- Ensure files are images (JPG, PNG, etc.)
- Check internet connection

**App not accessible on other devices**:
- Make sure devices are on the same WiFi network
- Use your computer's IP address in the URL
- Check firewall settings

**Server won't start**:
- Make sure port 3000 isn't being used by another app
- Run `npm install` to ensure dependencies are installed

### Getting Help

1. Check the console for error messages
2. Try restarting the server (`Ctrl+C`, then `npm start`)
3. Make sure all files are in the correct locations

## 📝 License

This project is free to use for personal and commercial purposes.

## 💝 Enjoy Your Wedding!

We hope this app helps you collect and share beautiful memories from your special day. Congratulations on your wedding! 🎉👰🤵

---

*Built with love for couples who want to share their special moments with friends and family.* ❤️

# Trigger GitHub Pages rebuild with CSP fixes Wed Oct  1 21:39:38 EDT 2025
