# Wedding Photo App - Deployment Guide

This guide walks you through deploying your wedding photo app with GitHub Pages for the frontend and a cloud platform for the backend API.

## 🎯 Architecture Overview

- **Frontend**: Static files hosted on GitHub Pages
- **Backend**: Node.js API server on cloud platform (Heroku, Railway, etc.)
- **Storage**: Google Cloud Storage for photos (with local fallback)
- **Authentication**: Token-based access control

## 🚀 Step 1: Set Up Google Cloud Storage

### 1.1 Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your Project ID

### 1.2 Enable Required APIs
```bash
# Enable Cloud Storage API
gcloud services enable storage-component.googleapis.com
```

### 1.3 Create Storage Bucket
```bash
# Create bucket (replace with your bucket name)
gsutil mb gs://your-wedding-photos-bucket

# Make bucket publicly readable (for photo access)
gsutil iam ch allUsers:objectViewer gs://your-wedding-photos-bucket
```

### 1.4 Create Service Account
1. Go to IAM & Admin > Service Accounts
2. Create new service account
3. Grant "Storage Admin" role
4. Download JSON key file
5. Save as `service-account-key.json` in your project root

## 🔧 Step 2: Configure Environment Variables

### 2.1 Local Development
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

Required variables:
```env
ACCESS_TOKEN=your-wedding-access-token
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GCS_BUCKET_NAME=your-wedding-photos-bucket
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

### 2.2 Test Locally
```bash
# Install dependencies
npm install

# Test the setup
npm start
```

Visit `http://localhost:3000?token=your-wedding-access-token` to verify everything works.

## ☁️ Step 3: Deploy Backend API

### Option A: Deploy to Heroku

1. **Install Heroku CLI**
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Login
heroku login
```

2. **Create Heroku App**
```bash
heroku create your-wedding-api
```

3. **Set Environment Variables**
```bash
heroku config:set ACCESS_TOKEN=your-wedding-access-token
heroku config:set GOOGLE_CLOUD_PROJECT=your-gcp-project-id
heroku config:set GCS_BUCKET_NAME=your-wedding-photos-bucket
```

4. **Upload Service Account Key**
```bash
# Convert JSON to base64 and set as env var
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat service-account-key.json | base64)"
```

5. **Deploy**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### Option B: Deploy to Railway

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

2. **Initialize Project**
```bash
railway init
railway link
```

3. **Set Environment Variables**
```bash
railway variables set ACCESS_TOKEN=your-wedding-access-token
railway variables set GOOGLE_CLOUD_PROJECT=your-gcp-project-id
railway variables set GCS_BUCKET_NAME=your-wedding-photos-bucket
```

4. **Deploy**
```bash
railway up
```

## 📄 Step 4: Deploy Frontend to GitHub Pages

### 4.1 Update Configuration
1. Edit `dist-static/index.html` after running `npm run build:static`
2. Update `window.WEDDING_APP_CONFIG.API_BASE_URL` with your backend URL
3. Update `window.WEDDING_APP_CONFIG.GCS_BUCKET` with your bucket name

### 4.2 Configure GitHub Repository
1. Push your code to GitHub
2. Go to repository Settings > Pages
3. Set Source to "GitHub Actions"

### 4.3 Configure GitHub Secrets
Go to Settings > Secrets and Variables > Actions and add:
- `ACCESS_TOKEN`: Your wedding access token
- Any other production secrets needed

### 4.4 Deploy
The GitHub Actions workflow will automatically deploy when you push to the main branch.

## 🔒 Step 5: Security Configuration

### 5.1 Update CORS Settings
Update your backend to allow requests from your GitHub Pages domain:

```javascript
// In server/index.ts or index.cjs
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-username.github.io'
  ]
}));
```

### 5.2 Secure Access Token
- Use a strong, unique access token
- Don't commit tokens to version control
- Consider token rotation for long-term use

## 🧪 Step 6: Testing Deployment

### 6.1 Test Backend API
```bash
# Health check
curl https://your-api-domain.herokuapp.com/health

# Test photos endpoint (replace TOKEN)
curl "https://your-api-domain.herokuapp.com/api/photos?token=TOKEN"
```

### 6.2 Test Frontend
1. Visit your GitHub Pages URL
2. Verify photo upload works
3. Test face detection and filtering
4. Check mobile responsiveness

## 📊 Step 7: Monitoring and Maintenance

### 7.1 Monitor Usage
- Check Google Cloud Storage usage and billing
- Monitor your hosting platform metrics
- Set up alerts for errors or high usage

### 7.2 Backup Strategy
- Google Cloud Storage provides built-in redundancy
- Consider exporting photo metadata periodically
- Keep backups of your service account keys

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify backend CORS configuration
   - Check that domain URLs match exactly

2. **Storage Upload Failures**
   - Verify service account permissions
   - Check bucket exists and is accessible
   - Review storage quotas

3. **Token Authentication Issues**
   - Ensure tokens match between frontend and backend
   - Check token is included in requests
   - Verify environment variables are set

4. **Build/Deploy Failures**
   - Check GitHub Actions logs
   - Verify all dependencies are installed
   - Ensure TypeScript compiles without errors

### Getting Help

- Check server logs for error details
- Use browser developer tools for frontend debugging
- Review cloud platform logs for deployment issues

## 🎉 Success!

Once deployed, share your wedding photo gallery URL with guests:
`https://your-username.github.io?token=your-wedding-access-token`

Guests can now upload photos, use face detection, and enjoy your beautiful wedding photo gallery!