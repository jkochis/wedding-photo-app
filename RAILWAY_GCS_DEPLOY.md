# Railway Deployment with Google Cloud Storage

## ✅ Local Testing Complete

The GCS integration has been tested locally and is working correctly:
- ✅ Photo uploads to GCS bucket `group-image-share`
- ✅ Signed URLs generated (7-day expiration)
- ✅ API endpoints functional
- ✅ Database metadata persistence

## 🚀 Deploy to Railway

### Step 1: Add Environment Variables to Railway

You need to add these environment variables in your Railway project dashboard:

1. Go to your Railway project: https://railway.app/
2. Select your project: `wedding-photo-app`
3. Click on the **Variables** tab
4. Add the following variables:

```bash
# Storage Configuration
STORAGE_TYPE=gcs
GCS_BUCKET_NAME=group-image-share
GCS_PROJECT_ID=group-image-share-473717

# GCS Service Account Credentials (Base64 encoded)
GCS_SERVICE_ACCOUNT_KEY_BASE64=<paste_from_file_below>

# Keep your existing variables
ACCESS_TOKEN=wedding-photo-gallery-2025
NODE_ENV=production
PORT=3000
```

**To get the base64 encoded key:**
```bash
cat /tmp/gcs-key-base64.txt
```

Copy the entire output (it's a long string) and paste it as the value for `GCS_SERVICE_ACCOUNT_KEY_BASE64`.

### Step 2: Commit and Push Changes

```bash
# Check git status
git status

# Add all changes
git add server/

# Commit changes
git commit -m "Add GCS storage integration"

# Push to Railway (assuming 'main' branch)
git push origin main
```

Railway will automatically detect the push and start a new deployment.

### Step 3: Verify Deployment

1. **Check Railway logs** for successful deployment:
   - Look for: `☁️  Storage Type: gcs`
   - Look for: `📦 GCS Bucket: group-image-share`

2. **Test the health endpoint:**
   ```bash
   curl https://group-images-production.up.railway.app/health
   ```

3. **Test photo upload from your app:**
   - Open: https://jkochis.github.io/wedding-photo-app?token=wedding-photo-gallery-2025
   - Try uploading a photo
   - Verify it appears in the gallery

### Step 4: Verify GCS Bucket

Check your GCS bucket to confirm photos are being uploaded:

```bash
# List files in bucket
gcloud storage ls gs://group-image-share/

# Or via GCP Console
# https://console.cloud.google.com/storage/browser/group-image-share
```

## 🔄 Migration (Optional)

If you have existing photos on Railway's volume that you want to migrate to GCS, you'll need to:

1. Download photos from Railway volume
2. Upload them to GCS
3. Update the database URLs

Would you like me to create a migration script for this?

## 🎯 Expected Behavior

### Before (Railway Volume):
- Photos stored at: `/app/data/uploads/`
- URLs like: `https://group-images-production.up.railway.app/uploads/photo-123.jpg?token=...`
- Requires volume (costs extra)

### After (GCS):
- Photos stored in: `gs://group-image-share/`
- URLs like: `https://storage.googleapis.com/group-image-share/photo-123.jpg?X-Goog-Algorithm=...`
- No volume needed
- Signed URLs (expire after 7 days)

## 🔧 Troubleshooting

### If deployment fails:

1. **Check Railway logs** for error messages
2. **Verify environment variables** are set correctly (especially the base64 key)
3. **Verify GCS permissions:**
   ```bash
   # Test service account permissions
   gcloud auth activate-service-account --key-file=config/gcs-key.json
   gcloud storage ls gs://group-image-share/
   ```

### If uploads fail:

1. Check Railway logs for GCS error messages
2. Verify the service account has `Storage Object Admin` role
3. Confirm bucket name is correct in environment variables

## 📊 Cost Comparison

### Railway Volume (Current):
- $5/month for 1GB volume
- Storage limited to volume size

### GCS (New):
- $0.02/GB/month for Standard storage
- $0.12/GB for bandwidth (first 1GB free monthly)
- Much more scalable
- Better reliability

For a typical wedding (500 photos @ 3MB each = 1.5GB):
- Railway: $5/month
- GCS: ~$0.03/month storage + minimal bandwidth
- **Savings: ~$4.97/month**

## ✅ Next Steps After Deployment

1. Monitor the first few photo uploads
2. Verify signed URLs are working in the frontend
3. Consider removing the Railway volume (if migration complete)
4. Update documentation with new architecture

---

**Ready to deploy?** Follow Step 1 above to add environment variables to Railway!
