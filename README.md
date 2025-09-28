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
- **Heroku**: Easy deployment with git
- **Vercel**: Great for static sites with serverless functions  
- **Railway**: Simple Node.js deployment
- **DigitalOcean**: VPS hosting

## 📁 Project Structure

```
wedding-photo-app/
├── public/              # Frontend files
│   ├── index.html      # Main HTML file
│   ├── styles.css      # CSS styles
│   ├── script.js       # JavaScript functionality
│   └── manifest.json   # PWA manifest
├── server/             # Backend files
│   ├── index.js        # Express server
│   └── photos.json     # Photo database (auto-generated)
├── uploads/            # Uploaded photos (auto-generated)
├── package.json        # Node.js dependencies
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## 🔒 Security Features

- **Token-based access**: Only users with the correct token can access the app
- **File validation**: Only image files are accepted
- **File size limits**: Prevents server overload
- **No public access**: Photos are protected behind authentication

## 🎨 Customization

### Colors and Styling

Edit `public/styles.css` to customize:
- Color scheme (search for `#e8b4a0` and `#d4a574`)
- Fonts and typography
- Layout and spacing

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