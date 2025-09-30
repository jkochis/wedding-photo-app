# Google Cloud Storage Setup Guide

This guide walks you through configuring Google Cloud Storage (GCS) for photo uploads.

## 📋 Prerequisites

1. Google Cloud account
2. Project created in Google Cloud Console
3. Billing enabled on your project

---

## 🔧 Step 1: Create GCS Bucket

### Option A: Using Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Storage** > **Buckets**
3. Click **Create Bucket**
4. Configure:
   - **Name**: `your-wedding-photos` (must be globally unique)
   - **Location**: Choose region closest to your users
   - **Storage class**: Standard
   - **Access control**: Uniform
   - **Protection tools**: None (or enable as needed)
5. Click **Create**

### Option B: Using gcloud CLI

```bash
# Install gcloud CLI (if not installed)
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Create bucket
gsutil mb -l us-central1 gs://your-wedding-photos

# Set uniform access control
gsutil uniformbucketlevelaccess set on gs://your-wedding-photos

# Make bucket private (we'll use signed URLs)
gsutil iam ch allUsers:objectViewer gs://your-wedding-photos -d
```

---

## 🔑 Step 2: Create Service Account

### Using Google Cloud Console

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Configure:
   - **Name**: `wedding-photo-uploader`
   - **Description**: `Service account for wedding photo uploads`
4. Click **Create and Continue**
5. Add roles:
   - **Storage Object Creator**
   - **Storage Object Viewer**
6. Click **Done**
7. Click on the service account
8. Go to **Keys** tab
9. Click **Add Key** > **Create New Key**
10. Select **JSON** format
11. Download the key file (keep it safe!)

### Using gcloud CLI

```bash
# Create service account
gcloud iam service-accounts create wedding-photo-uploader \
  --display-name="Wedding Photo Uploader"

# Get project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:wedding-photo-uploader@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:wedding-photo-uploader@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Create and download key
gcloud iam service-accounts keys create gcs-key.json \
  --iam-account=wedding-photo-uploader@${PROJECT_ID}.iam.gserviceaccount.com
```

---

## 📦 Step 3: Install Dependencies

```bash
npm install @google-cloud/storage multer-cloud-storage
```

---

## 🔐 Step 4: Configure Credentials

### For Local Development

```bash
# Place your key file in the project
cp ~/Downloads/gcs-key-xxxxx.json ./config/gcs-key.json

# Add to .gitignore (important!)
echo "config/gcs-key.json" >> .gitignore

# Set environment variable
echo "GCS_KEYFILE=./config/gcs-key.json" >> .env
```

### For Railway Production

```bash
# Base64 encode your key file
base64 -i gcs-key.json | pbcopy

# Set in Railway
railway variables --set GCS_CREDENTIALS_BASE64="<paste-base64-here>"
railway variables --set GCS_BUCKET_NAME="your-wedding-photos"
railway variables --set STORAGE_TYPE="gcs"
```

---

## 💾 Step 5: Update Environment Variables

Add to your `.env` file:

```bash
# Storage Configuration
STORAGE_TYPE=gcs                           # Options: local, gcs
GCS_BUCKET_NAME=your-wedding-photos
GCS_KEYFILE=./config/gcs-key.json         # Local only
GCS_CREDENTIALS_BASE64=                    # Railway only (base64 encoded)
GCS_PROJECT_ID=your-project-id
```

---

## ⚙️ Step 6: Implementation Options

You have two implementation options:

### Option A: Simple Migration (Recommended)
Use the pre-built GCS storage module I'll create

### Option B: Custom Implementation
Integrate GCS directly into your server code

**Recommendation**: Use Option A - it's cleaner, easier to maintain, and supports both local and GCS storage.

---

## 🧪 Step 7: Testing

### Test GCS Connection

```bash
# Create test script
cat > test-gcs.js << 'EOF'
const {Storage} = require('@google-cloud/storage');

const storage = new Storage({
  keyFilename: process.env.GCS_KEYFILE
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

async function testConnection() {
  try {
    await bucket.exists();
    console.log('✅ GCS connection successful!');
    
    const [files] = await bucket.getFiles();
    console.log(`📁 Files in bucket: ${files.length}`);
  } catch (error) {
    console.error('❌ GCS connection failed:', error.message);
  }
}

testConnection();
EOF

node test-gcs.js
```

---

## 🔄 Migration from Local Storage

If you have existing photos on Railway volume:

```bash
# 1. Backup existing photos
railway run tar -czf - /app/data/uploads > local-photos-backup.tar.gz

# 2. Extract locally
tar -xzf local-photos-backup.tar.gz

# 3. Upload to GCS
gsutil -m cp -r app/data/uploads/* gs://your-wedding-photos/

# 4. Update database URLs
# This will be handled automatically by the new storage system
```

---

## 💰 Cost Estimation

### GCS Pricing (as of 2024)

**Storage:**
- Standard storage: $0.020 per GB/month
- 10GB = ~$0.20/month
- 100GB = ~$2.00/month

**Operations:**
- Class A (writes): $0.05 per 10,000 operations
- Class B (reads): $0.004 per 10,000 operations
- 1,000 photos uploaded: ~$0.005
- 10,000 photo views: ~$0.004

**Network:**
- Egress (downloads): $0.12 per GB (first 1GB free)

**Example Wedding App:**
- 500 photos @ 5MB each = 2.5GB storage = **$0.05/month**
- 1,000 uploads = **$0.005**
- 10,000 views @ 5MB each = 50GB egress = **$6.00**
- **Total: ~$6/month during active use**

**After wedding (storage only):**
- **$0.05/month** for 2.5GB of photos

---

## 🎯 Benefits of GCS vs Local Storage

| Feature | Local (Railway Volume) | GCS |
|---------|----------------------|-----|
| **Cost** | $10-20/month | $0.05-2/month |
| **Storage Limit** | 500MB-100GB | Unlimited |
| **Scalability** | Limited | Infinite |
| **Redundancy** | Single region | Multi-region |
| **Backup** | Manual | Automatic |
| **CDN** | Need setup | Built-in |
| **External Access** | Difficult | Easy |
| **Portability** | Locked to Railway | Platform independent |

---

## 📊 Configuration Summary

### Recommended Setup

```bash
# Production (Railway)
STORAGE_TYPE=gcs
GCS_BUCKET_NAME=your-wedding-photos
GCS_CREDENTIALS_BASE64=<base64-encoded-key>

# Development (Local)
STORAGE_TYPE=local
# OR
STORAGE_TYPE=gcs
GCS_KEYFILE=./config/gcs-key.json
```

---

## 🔒 Security Best Practices

1. **Service Account Permissions**: Only grant necessary roles
2. **Key File Security**: Never commit to git
3. **Use Signed URLs**: Don't make bucket public
4. **Rotate Keys**: Rotate service account keys periodically
5. **Enable Versioning**: Keep photo history (optional)
6. **Set Lifecycle Rules**: Auto-delete old versions (optional)

---

## 🆘 Troubleshooting

### "Permission Denied" Error
```bash
# Check service account has correct roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:wedding-photo-uploader"
```

### "Bucket Not Found" Error
```bash
# Verify bucket exists
gsutil ls gs://your-wedding-photos
```

### "Invalid Credentials" Error
```bash
# Test credentials
gcloud auth activate-service-account --key-file=gcs-key.json
```

---

## 📞 Next Steps

Ready to implement? I can:

1. Create the GCS storage module
2. Update server.js to use GCS
3. Add fallback to local storage for development
4. Create migration scripts
5. Add photo cleanup scripts

Which would you like me to do first?