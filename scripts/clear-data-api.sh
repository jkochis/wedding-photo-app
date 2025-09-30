#!/bin/bash

# Clear Production Data via API
# Simple script using the API endpoint

TOKEN="wedding-photo-gallery-2025"
API_URL="https://group-images-production.up.railway.app"

echo "🚨 WARNING: This will DELETE ALL production data!"
echo ""
echo "📊 Checking current data..."
curl -s "${API_URL}/api/stats?token=${TOKEN}" | jq '.'

echo ""
read -p "Type 'DELETE' to delete all photos: " confirm

if [ "$confirm" != "DELETE" ]; then
    echo "❌ Aborted."
    exit 0
fi

echo ""
echo "🗑️  Deleting all data..."

response=$(curl -s -X DELETE \
  "${API_URL}/api/admin/clear-all?token=${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"confirm": "DELETE_ALL_DATA"}')

echo "$response" | jq '.'

if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
    echo ""
    echo "✅ All data cleared successfully!"
else
    echo ""
    echo "❌ Failed to clear data. Check the response above."
fi