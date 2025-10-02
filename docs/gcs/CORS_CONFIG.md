# Google Cloud Storage CORS Configuration

## Problem
When accessing GCS images from GitHub Pages (jkochis.github.io), you'll get CORS errors:
```
Access to image from origin 'https://jkochis.github.io' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution
Configure CORS on your GCS bucket to allow access from your deployment domains.

## 🔧 Step 1: Create CORS Configuration File

Create `cors.json`:

```json
[
  {
    "origin": [
      "https://jkochis.github.io",
      "https://group-images-production.up.railway.app",
      "http://localhost:3000",
      "https://localhost:3000"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers"
    ],
    "maxAgeSeconds": 3600
  }
]
```

## 🚀 Step 2: Apply CORS Configuration

### Using gsutil CLI:
```bash
# Apply CORS configuration to your bucket
gsutil cors set cors.json gs://group-image-share

# Verify CORS configuration
gsutil cors get gs://group-image-share
```

### Using Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Storage** > **Buckets**
3. Click on your bucket name (`group-image-share`)
4. Go to **Permissions** tab
5. Scroll down to **CORS** section
6. Click **Edit**
7. Add the configuration:
   - **Origin**: `https://jkochis.github.io, https://group-images-production.up.railway.app, http://localhost:3000`
   - **Method**: `GET, HEAD`
   - **Response Header**: `Content-Type, Access-Control-Allow-Origin`
   - **Max Age**: `3600`

## 🔍 Step 3: Test CORS Configuration

```bash
# Test CORS from your domain
curl -H "Origin: https://jkochis.github.io" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     "https://storage.googleapis.com/group-image-share/"
```

Expected response should include:
```
Access-Control-Allow-Origin: https://jkochis.github.io
Access-Control-Allow-Methods: GET, HEAD
```

## 🛠️ Complete Script

Save this as `setup-cors.sh`:

```bash
#!/bin/bash

# Google Cloud Storage CORS Setup
# Replace 'group-image-share' with your bucket name

BUCKET_NAME="group-image-share"

# Create CORS configuration
cat > cors.json << 'EOF'
[
  {
    "origin": [
      "https://jkochis.github.io",
      "https://group-images-production.up.railway.app",
      "http://localhost:3000",
      "https://localhost:3000"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers"
    ],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS configuration
echo "Applying CORS configuration to gs://$BUCKET_NAME..."
gsutil cors set cors.json gs://$BUCKET_NAME

# Verify configuration
echo "Verifying CORS configuration..."
gsutil cors get gs://$BUCKET_NAME

# Test CORS
echo "Testing CORS from GitHub Pages..."
curl -H "Origin: https://jkochis.github.io" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     "https://storage.googleapis.com/$BUCKET_NAME/"

echo "CORS setup complete!"
```

## 🔧 Alternative: Use Proxy for Images

If you can't modify GCS CORS, you can proxy images through your backend:

```javascript
// Add to your Express server
app.get('/api/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    const response = await fetch(url);
    const buffer = await response.buffer();

    res.set({
      'Content-Type': response.headers.get('content-type'),
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000'
    });

    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});
```

Then update your frontend to use proxied URLs:
```javascript
const proxiedUrl = `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
```

## 📋 Troubleshooting

### CORS Still Not Working?
1. **Clear browser cache** - CORS headers are cached
2. **Check bucket permissions** - Ensure bucket is readable
3. **Verify bucket name** - Make sure you're configuring the right bucket
4. **Wait for propagation** - CORS changes can take a few minutes

### Permission Denied?
```bash
# Authenticate with gcloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Try again
gsutil cors set cors.json gs://group-image-share
```

### Verification Failed?
```bash
# Check current CORS configuration
gsutil cors get gs://group-image-share

# Should return your CORS configuration
```