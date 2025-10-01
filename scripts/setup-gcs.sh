#!/bin/bash

# Automated GCS Setup Script for Wedding Photo App
set -e

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
BUCKET_NAME="wedding-photos-${PROJECT_ID}"
SERVICE_ACCOUNT_NAME="wedding-photo-uploader"
KEY_FILE="config/gcs-key.json"

echo "🚀 Setting up Google Cloud Storage for Wedding Photo App"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Bucket Name: $BUCKET_NAME"
echo ""

# Create config directory
mkdir -p config

# Step 1: Create GCS Bucket
echo "📦 Step 1: Creating GCS bucket..."
if gsutil ls "gs://${BUCKET_NAME}" 2>/dev/null; then
    echo "✅ Bucket already exists: gs://${BUCKET_NAME}"
else
    gsutil mb -l us-central1 "gs://${BUCKET_NAME}"
    echo "✅ Bucket created: gs://${BUCKET_NAME}"
fi

# Step 2: Set bucket to private (we'll use signed URLs)
echo ""
echo "🔒 Step 2: Configuring bucket access..."
gsutil uniformbucketlevelaccess set on "gs://${BUCKET_NAME}"
echo "✅ Uniform bucket-level access enabled"

# Step 3: Create Service Account
echo ""
echo "👤 Step 3: Creating service account..."
if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1; then
    echo "✅ Service account already exists"
else
    gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
        --display-name="Wedding Photo Uploader" \
        --description="Service account for wedding photo uploads"
    echo "✅ Service account created"
fi

# Step 4: Grant permissions
echo ""
echo "🔑 Step 4: Granting permissions..."

# Grant Storage Object Creator role
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.objectCreator" \
    --condition=None \
    >/dev/null 2>&1 || echo "Already has Storage Object Creator role"

# Grant Storage Object Viewer role
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer" \
    --condition=None \
    >/dev/null 2>&1 || echo "Already has Storage Object Viewer role"

echo "✅ Permissions granted"

# Step 5: Create and download key
echo ""
echo "🔐 Step 5: Creating service account key..."
if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Key file already exists: $KEY_FILE"
    read -p "Overwrite? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo "Skipping key creation"
    else
        rm "$KEY_FILE"
        gcloud iam service-accounts keys create "$KEY_FILE" \
            --iam-account="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
        echo "✅ New key created: $KEY_FILE"
    fi
else
    gcloud iam service-accounts keys create "$KEY_FILE" \
        --iam-account="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    echo "✅ Key created: $KEY_FILE"
fi

# Step 6: Update .env file
echo ""
echo "📝 Step 6: Updating .env file..."

# Create or update .env
if ! grep -q "STORAGE_TYPE" .env 2>/dev/null; then
    echo "" >> .env
    echo "# Google Cloud Storage Configuration" >> .env
    echo "STORAGE_TYPE=gcs" >> .env
    echo "GCS_BUCKET_NAME=${BUCKET_NAME}" >> .env
    echo "GCS_KEYFILE=./config/gcs-key.json" >> .env
    echo "GCS_PROJECT_ID=${PROJECT_ID}" >> .env
    echo "✅ Added GCS config to .env"
else
    echo "⚠️  GCS config already in .env"
fi

# Add to .gitignore
if ! grep -q "config/gcs-key.json" .gitignore 2>/dev/null; then
    echo "config/gcs-key.json" >> .gitignore
    echo "✅ Added key file to .gitignore"
fi

# Step 7: Setup Railway environment variables
echo ""
echo "🚂 Step 7: Railway configuration..."
echo ""
echo "To configure Railway, run these commands:"
echo ""
echo "  # Base64 encode credentials"
echo "  base64 -i $KEY_FILE | pbcopy"
echo ""
echo "  # Set Railway variables"
echo "  railway variables --set STORAGE_TYPE=gcs"
echo "  railway variables --set GCS_BUCKET_NAME=${BUCKET_NAME}"
echo "  railway variables --set GCS_PROJECT_ID=${PROJECT_ID}"
echo "  railway variables --set GCS_CREDENTIALS_BASE64=\"<paste from clipboard>\""
echo ""

# Step 8: Test connection
echo "🧪 Step 8: Testing GCS connection..."

cat > test-gcs-temp.js << 'TESTEOF'
const {Storage} = require('@google-cloud/storage');
const keyFile = process.argv[2];
const bucketName = process.argv[3];

const storage = new Storage({ keyFilename: keyFile });
const bucket = storage.bucket(bucketName);

async function test() {
    try {
        const [exists] = await bucket.exists();
        if (exists) {
            console.log('✅ GCS connection successful!');
            const [files] = await bucket.getFiles();
            console.log(`📁 Files in bucket: ${files.length}`);
            process.exit(0);
        } else {
            console.log('❌ Bucket not found');
            process.exit(1);
        }
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

test();
TESTEOF

node test-gcs-temp.js "$KEY_FILE" "$BUCKET_NAME"
TEST_RESULT=$?
rm test-gcs-temp.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ GCS Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Summary:"
echo "  • Bucket: gs://${BUCKET_NAME}"
echo "  • Service Account: ${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "  • Key File: $KEY_FILE"
echo "  • Project: $PROJECT_ID"
echo ""
echo "🔧 Next Steps:"
echo "  1. Install GCS dependency: npm install @google-cloud/storage"
echo "  2. Test locally: npm run dev"
echo "  3. Configure Railway (see commands above)"
echo "  4. Deploy: railway up"
echo ""

exit $TEST_RESULT