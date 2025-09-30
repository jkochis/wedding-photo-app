#!/bin/bash

# Clear Production Data Script
# This script clears all photos and database from Railway production

set -e

echo "🚨 WARNING: This will DELETE ALL production data!"
echo "   - All uploaded photos will be removed"
echo "   - The photos database will be cleared"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted. No data was deleted."
    exit 0
fi

echo ""
echo "🔍 Checking Railway connection..."
railway status

echo ""
echo "📋 Current data status:"
railway run bash -c "ls -lh /app/data/uploads/ 2>/dev/null | wc -l || echo 'No uploads directory'"
railway run bash -c "wc -l /app/data/photos.json 2>/dev/null || echo 'No database file'"

echo ""
read -p "Really delete all this data? (type 'DELETE' to confirm): " final_confirm

if [ "$final_confirm" != "DELETE" ]; then
    echo "❌ Aborted. No data was deleted."
    exit 0
fi

echo ""
echo "🗑️  Deleting production data..."

# Clear uploads directory
echo "   Removing uploaded photos..."
railway run bash -c "rm -rf /app/data/uploads/*"

# Clear database
echo "   Clearing database..."
railway run bash -c "echo '[]' > /app/data/photos.json"

echo ""
echo "✅ Production data cleared successfully!"
echo ""
echo "📊 Verification:"
railway run bash -c "ls -lh /app/data/uploads/ 2>/dev/null | wc -l || echo 'Uploads empty'"
railway run bash -c "cat /app/data/photos.json"

echo ""
echo "🔄 Server will reload automatically with empty database."