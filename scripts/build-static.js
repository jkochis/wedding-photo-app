#!/usr/bin/env node

/**
 * Static Build Script for GitHub Pages Deployment
 * Prepares the app for static hosting with API backend separation
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_STATIC = path.join(PROJECT_ROOT, 'dist-static');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

console.log('🏗️  Building static version for GitHub Pages...\n');

async function copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
            console.log(`📄 Copied: ${path.relative(PROJECT_ROOT, srcPath)}`);
        }
    }
}

async function updateIndexHtml() {
    const indexPath = path.join(DIST_STATIC, 'index.html');
    let content = await fs.readFile(indexPath, 'utf8');
    
    // Update for static hosting - add configuration for API endpoint
    const configScript = `
    <script>
        window.WEDDING_APP_CONFIG = {
            API_BASE_URL: 'https://your-api-backend.herokuapp.com', // TODO: Update with actual API URL
            STATIC_DEPLOYMENT: true,
            GCS_BUCKET: 'your-wedding-photos-bucket' // TODO: Update with actual bucket name
        };
    </script>`;
    
    content = content.replace('</head>', `    ${configScript}\n</head>`);
    
    // Add note about deployment
    const deploymentInfo = `
    <!-- 
    🚀 DEPLOYMENT CONFIGURATION NEEDED:
    
    1. Update API_BASE_URL in the script above to point to your backend server
    2. Update GCS_BUCKET to your Google Cloud Storage bucket name
    3. Configure your backend to handle CORS for this domain
    4. Set up Google Cloud Storage for photo uploads
    -->`;
    
    content = content.replace('<!-- Photos will be dynamically inserted here -->', 
        deploymentInfo + '\n            <!-- Photos will be dynamically inserted here -->');
    
    await fs.writeFile(indexPath, content);
    console.log('✅ Updated index.html with production configuration');
}

async function createDeploymentReadme() {
    const readmeContent = `# Wedding Photo App - Static Deployment

This is the static version of the Wedding Photo App built for GitHub Pages deployment.

## 🚀 Deployment Configuration

### 1. Backend API Setup
The frontend expects a backend API at the URL specified in \`index.html\`. You need to:

- Deploy the Node.js server (recommend Heroku, Railway, or similar)
- Update \`window.WEDDING_APP_CONFIG.API_BASE_URL\` in \`index.html\`
- Configure CORS on your backend to allow requests from GitHub Pages domain

### 2. Google Cloud Storage Setup
For photo storage, you'll need:

- A Google Cloud Storage bucket
- Service account with appropriate permissions
- Update \`window.WEDDING_APP_CONFIG.GCS_BUCKET\` in \`index.html\`

### 3. Environment Variables for Backend
Set these environment variables on your backend hosting platform:

\`\`\`
ACCESS_TOKEN=your-wedding-access-token
GCS_BUCKET_NAME=your-wedding-photos-bucket
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
\`\`\`

### 4. GitHub Pages Setup
1. Go to your repository Settings > Pages
2. Set Source to "GitHub Actions"
3. The workflow will automatically deploy on pushes to main/master

## 📱 Features Available
- ✅ Photo upload with category tagging
- ✅ Face detection and people tagging
- ✅ Photo filtering and search
- ✅ Mobile-responsive design
- ✅ Dark/light theme toggle
- ✅ PWA support with offline capabilities

## 🔗 Architecture
- **Frontend**: Static files on GitHub Pages
- **Backend**: Node.js server on cloud platform
- **Storage**: Google Cloud Storage for photos
- **Authentication**: Token-based access control
`;

    await fs.writeFile(path.join(DIST_STATIC, 'README.md'), readmeContent);
    console.log('📚 Created deployment README');
}

async function createGitHubPagesConfig() {
    // Create _config.yml for Jekyll (GitHub Pages)
    const jekyllConfig = `# GitHub Pages configuration for Wedding Photo App
title: "Wedding Photo Gallery"
description: "Share your beautiful memories from our special day"
baseurl: ""
url: "https://USERNAME.github.io" # TODO: Update with your GitHub username

# Exclude server files and build artifacts
exclude:
  - node_modules/
  - server/
  - scripts/
  - dist/
  - "*.md"
  - package.json
  - package-lock.json
  - tsconfig*.json
  - jest.config.js

# Include important files
include:
  - .htaccess

plugins:
  - jekyll-relative-links

relative_links:
  enabled: true
  collections: true
`;

    await fs.writeFile(path.join(DIST_STATIC, '_config.yml'), jekyllConfig);
    console.log('⚙️  Created Jekyll configuration');
}

async function main() {
    try {
        // Clean previous build
        await fs.rm(DIST_STATIC, { recursive: true, force: true });
        console.log('🧹 Cleaned previous build\n');
        
        // Copy public directory
        console.log('📁 Copying static assets...');
        await copyDirectory(PUBLIC_DIR, DIST_STATIC);
        
        // Update HTML for production
        console.log('\n🔧 Configuring for production...');
        await updateIndexHtml();
        
        // Create documentation and config
        console.log('\n📝 Creating deployment documentation...');
        await createDeploymentReadme();
        await createGitHubPagesConfig();
        
        console.log('\n✅ Static build complete!');
        console.log(`📦 Output directory: ${path.relative(PROJECT_ROOT, DIST_STATIC)}`);
        console.log('\n🚀 Next steps:');
        console.log('1. Deploy your backend API to a cloud platform');
        console.log('2. Update API_BASE_URL in dist-static/index.html');
        console.log('3. Set up Google Cloud Storage');
        console.log('4. Push to GitHub to trigger deployment');
        
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

main();