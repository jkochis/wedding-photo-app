#!/bin/bash

# Google Cloud Storage CORS Setup Script
# This script configures CORS on your GCS bucket to allow access from your deployment domains

BUCKET_NAME="group-image-share"

echo "🔧 Setting up CORS for Google Cloud Storage bucket: $BUCKET_NAME"

# Create CORS configuration file
echo "📝 Creating CORS configuration..."
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

echo "✅ CORS configuration created"
echo ""

# Check if gcloud is installed and authenticated
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil not found. Please install Google Cloud SDK:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Apply CORS configuration
echo "🚀 Applying CORS configuration to gs://$BUCKET_NAME..."
if gsutil cors set cors.json gs://$BUCKET_NAME; then
    echo "✅ CORS configuration applied successfully"
else
    echo "❌ Failed to apply CORS configuration"
    echo "💡 Make sure you're authenticated with gcloud:"
    echo "   gcloud auth login"
    echo "   gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo ""

# Verify configuration
echo "🔍 Verifying CORS configuration..."
if gsutil cors get gs://$BUCKET_NAME; then
    echo "✅ CORS configuration verified"
else
    echo "❌ Failed to verify CORS configuration"
fi

echo ""

# Test CORS from GitHub Pages domain
echo "🧪 Testing CORS from GitHub Pages domain..."
curl -s -H "Origin: https://jkochis.github.io" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     "https://storage.googleapis.com/$BUCKET_NAME/" | \
     grep -i "access-control" || echo "⚠️  CORS test inconclusive - check manually"

echo ""
echo "🎉 CORS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Wait 1-2 minutes for changes to propagate"
echo "2. Test your app at https://jkochis.github.io/wedding-photo-app"
echo "3. Check browser console for CORS errors"
echo ""
echo "🔧 If issues persist:"
echo "1. Verify bucket name is correct: $BUCKET_NAME"
echo "2. Check you have storage.admin permissions"
echo "3. Try running: gcloud auth application-default login"
echo ""
echo "📚 For more help, see: docs/gcs/CORS_CONFIG.md"

# Clean up
rm -f cors.json