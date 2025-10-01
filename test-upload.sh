#!/bin/bash

# Test photo upload to wedding photo app
# This script creates a test image and uploads it to the server

echo "🧪 Testing photo upload to GCS..."

# Create a simple test image (1x1 pixel PNG)
echo "Creating test image..."
TEST_IMAGE="/tmp/test-photo.png"
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > "$TEST_IMAGE"

# Upload the image
echo "Uploading image to server..."
RESPONSE=$(curl -s -X POST \
  -F "photo=@${TEST_IMAGE}" \
  -F "tag=wedding" \
  "http://localhost:3000/api/upload?token=wedding-photo-gallery-2025")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Check if upload was successful
if echo "$RESPONSE" | grep -q '"id"'; then
    echo "✅ Upload successful!"
    
    # Extract the photo ID and URL
    PHOTO_ID=$(echo "$RESPONSE" | jq -r '.id' 2>/dev/null)
    PHOTO_URL=$(echo "$RESPONSE" | jq -r '.url' 2>/dev/null)
    
    echo "📷 Photo ID: $PHOTO_ID"
    echo "🔗 Photo URL: $PHOTO_URL"
    
    # Test fetching all photos
    echo ""
    echo "Fetching all photos..."
    curl -s "http://localhost:3000/api/photos?token=wedding-photo-gallery-2025" | jq '.'
else
    echo "❌ Upload failed!"
    exit 1
fi

# Cleanup
rm -f "$TEST_IMAGE"

echo ""
echo "✅ Test complete!"
