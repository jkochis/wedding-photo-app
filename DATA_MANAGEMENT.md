# Data Management Guide

This guide explains how to manage and delete production data for the Wedding Photo App.

## 🗑️ Deleting All Production Data

You have **3 methods** to delete all photos and data from production:

### Method 1: Using the API Script (Recommended)

The simplest and fastest method:

```bash
./scripts/clear-data-api.sh
```

**What it does:**
- Shows current photo count and stats
- Asks for confirmation (type `DELETE`)
- Deletes all photos and database via API
- Shows success/failure status

**Requirements:**
- `curl` and `jq` installed

---

### Method 2: Using Railway CLI Script

For more detailed control:

```bash
./scripts/clear-production-data.sh
```

**What it does:**
- Shows current data status on Railway
- Asks for double confirmation (`yes` then `DELETE`)
- Directly clears files on Railway server
- Verifies deletion

**Requirements:**
- Railway CLI installed and logged in

---

### Method 3: Manual API Call

For programmatic access or custom scripts:

```bash
curl -X DELETE \
  "https://group-images-production.up.railway.app/api/admin/clear-all?token=wedding-photo-gallery-2025" \
  -H "Content-Type: application/json" \
  -d '{"confirm": "DELETE_ALL_DATA"}'
```

**Response:**
```json
{
  "success": true,
  "message": "All photos and data deleted successfully",
  "stats": {
    "photosCleared": 5,
    "filesDeleted": 5,
    "fileErrors": 0
  }
}
```

---

## 📊 Checking Data Status

### View Photo Count
```bash
curl -s "https://group-images-production.up.railway.app/api/stats?token=wedding-photo-gallery-2025" | jq '.'
```

### View All Photos
```bash
curl -s "https://group-images-production.up.railway.app/api/photos?token=wedding-photo-gallery-2025" | jq '.'
```

### Check Railway Storage
```bash
railway volume list
```

---

## 🔐 Security Features

### Access Token Required
All admin operations require the access token:
- Current token: `wedding-photo-gallery-2025`
- Set in `.env` file and Railway environment variables

### Confirmation Required
The API endpoint requires explicit confirmation:
```json
{"confirm": "DELETE_ALL_DATA"}
```

This prevents accidental deletions.

### Logging
All deletion operations are logged:
```
⚠️  ADMIN: Clearing all photos and data...
✅ ADMIN: Cleared 5 photos from database, deleted 5 files
```

---

## 💾 Backup Before Deletion

### Backup via Railway CLI
```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup database
railway run cat /app/data/photos.json > backups/$(date +%Y%m%d)/photos.json

# Backup photos (if needed - this may take a while)
railway run tar -czf - /app/data/uploads | cat > backups/$(date +%Y%m%d)/uploads.tar.gz
```

### Backup via API
```bash
# Download database
curl -s "https://group-images-production.up.railway.app/api/photos?token=wedding-photo-gallery-2025" \
  > backups/$(date +%Y%m%d)/photos-backup.json
```

---

## 🔄 Restoring Data

### Restore Database
```bash
# Upload backup
railway run bash -c "cat > /app/data/photos.json" < backups/20250930/photos.json

# Restart server to reload
railway restart
```

### Restore Photos
```bash
# Extract backup
railway run bash -c "cd /app/data && tar -xzf -" < backups/20250930/uploads.tar.gz
```

---

## 📝 Common Operations

### Delete a Single Photo
```bash
PHOTO_ID="your-photo-id-here"
curl -X DELETE \
  "https://group-images-production.up.railway.app/api/photos/${PHOTO_ID}?token=wedding-photo-gallery-2025"
```

### Check Server Health
```bash
curl "https://group-images-production.up.railway.app/health"
```

### View Server Logs
```bash
railway logs
```

---

## ⚠️ Important Notes

1. **Deletion is Permanent**: Once deleted, data cannot be recovered unless you have backups
2. **Server Continues Running**: Deleting data doesn't stop the server
3. **Volume Persists**: The Railway volume stays mounted (just empty)
4. **New Uploads Still Work**: After deletion, users can immediately upload new photos
5. **No Downtime**: Deletion happens instantly without service interruption

---

## 🆘 Troubleshooting

### "Access denied" Error
- Check that your access token is correct
- Verify token is set in Railway environment variables

### "Confirmation required" Error
- Make sure you're sending `{"confirm": "DELETE_ALL_DATA"}` in the request body
- Check Content-Type header is set to `application/json`

### Files Not Deleted
- Check Railway logs: `railway logs`
- Verify volume is mounted: `railway volume list`
- Files may be locked or have permission issues

### Script Won't Run
```bash
# Make script executable
chmod +x scripts/clear-data-api.sh

# Check if jq is installed
which jq || brew install jq
```

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Delete all data (simple) | `./scripts/clear-data-api.sh` |
| Delete all data (CLI) | `./scripts/clear-production-data.sh` |
| View stats | `curl ".../api/stats?token=..."` |
| Check storage | `railway volume list` |
| Backup database | `railway run cat /app/data/photos.json > backup.json` |
| View logs | `railway logs` |

---

## 📞 Need Help?

If you encounter issues:
1. Check the server logs: `railway logs`
2. Verify the API is running: `curl .../health`
3. Check your access token is correct
4. Ensure Railway volume is mounted