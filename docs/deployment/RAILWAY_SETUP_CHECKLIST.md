# Railway Setup Checklist for GCS

## ⚠️ BEFORE YOU PUSH - Set Up Railway Environment Variables

**You MUST add these environment variables to Railway BEFORE pushing the code, or deployment will fail!**

### 1. Go to Railway Dashboard
- URL: https://railway.app/
- Select your project
- Click on the service
- Go to **Variables** tab

### 2. Add These Variables

Copy and paste each variable exactly as shown:

```
STORAGE_TYPE=gcs
```

```
GCS_BUCKET_NAME=group-image-share
```

```
GCS_PROJECT_ID=group-image-share-473717
```

```
GCS_SERVICE_ACCOUNT_KEY_BASE64=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiZ3JvdXAtaW1hZ2Utc2hhcmUtNDczNzE3IiwKICAicHJpdmF0ZV9rZXlfaWQiOiAiMmZmMWM1NzFkYzlkNzE4NjI5ZWIwMGMwNTc1MWVlOGZiOWI1OGRiZSIsCiAgInByaXZhdGVfa2V5IjogIi0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxuTUlJRXZBSUJBREFOQmdrcWhraUc5dzBCQVFFRkFBU0NCS1l3Z2dTaUFnRUFBb0lCQVFERlUvSGxXM05aOThYQVxuOGJBb2dPczlvWmZpVm1CRkRnUE9ndlNHdUxlalZiNjYwOUFZQjBaaGRKQndxUk1vT2g2SW5IVWttZWZpQjhCSFxuRHpHdWIrQUg4NGhlb0ozdVlmcnBDTVVrdTYvV285TlNndGFxT2lMZTZpNmI2bGRnWmFROFhNcjdpVThqUEV5bVxuZVBEbXQ1MDRXbGJERlA5TXhtNUY4UGhUWjNFdzlyREFNQTJ5M00zRTEzc0E2WCtDYXdqT2NsU0FaRDlUbDY3bVxuSkEzbGd2ZlN1WG5DUmZuaWpMeEliOGZJOHZxaXJZTGhqRVZFdXp4NHF2RGZPa0l2WXhhc2FSZ2Z3ZXBmSlYwdVxuTlRLNDU2N0FrRHdjYTg5SzRFdlB6UmoreGFoOHM5eHh5YnoveGpKNCtUdFdzVm90RWhQdjc5TW5hYUpEbGpVdlxuRnZpM1R2Ty9BZ01CQUFFQ2dnRUFEZlJHUG1SdHIxYU10dnpBYXRUWERkZ3dEL0x3d3VGZlZvcS9OUW01L3NSeFxuQlBBMm5vUmhMMElaZHNZV0V6bXM4QmMwVjM3RXZhQ3pzYks2M2kyT0o3SEttbnA4UUovUUtRdVVPV2xHWVlUYlxuVEZIeFVUOWtPT1JSb0hmOWJ0VXhQSTJKVXlsZUhjMUZWRjVvRnNDMFR3aGdhMUpBVFpNWXVEeDJxeHM5RDJ1NlxucFVsalo2S29uVlV0OS91RXMwckViek5NZTFubEJxbGR2YWlMN3FzWVF5VVFDdnZ6b1lZTXJTM0QvSlB6M2hNdVxuOHJMSE01d0czd3JMMmxlbjR5SnJNb3NiaDdwUSsrenZKSkZ0VVpyNS9zRVBrL0FRR1BWTWRpVXQ5RTR4WXZuVVxuNEpyYmhqZGtBYUhzdjkwaERYM25jTlYzUVpTZjk3cUVVZzMyTnRHcUlRS0JnUUQwTURqbE9GTlBYd1NJNWZFRFxuWTd6bk9iNVpxWTA3ODN4OXpzODA3TmxidG9sN0lDcWM5dVZvZkJBMWZzc3hrV09MelZyeERPOW9BUEtsYjRKV1xuMkNLb3NuWDBDY2xxWU40Q1NQemt4RkdDTUMrSzNoUnFLNlpVYmJNNDc2azhqa1IvVnpkUmN6MzJoMjJRLzBncVxudStuSTZOMkFTRWw1WktyaWVneXh4RENBWVFLQmdRRE8zM051eTVGTHpPRzBpS1Zzc1ByQzRKWkhoMXdCVkJrU1xuQzh4bnFxTTB2eTB4M1NEOXFnVmk2OEJzQkxtSW1uZ3JuZHhTeWJqYlYwazNraHFCbVhjS29oTzZMUisxQ1RGV1xueDdFQmErbHBlb2Nzd1duQ2VReUpvTzBubDhuKy9qR0JYdmlhWXZobzlnMGZOWGxSeEFSQkMwWmFVMzJscVVpNlxuUmplajVraG9Id0tCZ0J4M1lxcVdIbUFxVzRUNkNWYXowZG5DeVlYNlZoU2ZGZXcwcDhNcnVVc1B4SWN1QU1tN1xubnBMSG83d1l3K2RMWTZkd2tTRjR1SkFQVERvcy9helNGWGhGRmFzVldQMmx2VHZXOW1SVTNvdW13bVFWNzV0UVxuNjFyOFR1QmNVQVpYTDNVSTNkSUk5VGhBSVcyOTFOUG1oQ0ovd3hLcFdxZGtMT2VxQXNEV2RqRUJBb0dBUEJIYVxuWFBPemJ3VkJETUVZOStTMEM5NVhCTklqUHllQ1dDRWc2NEU2L3RmOGNadzZOaTRtZmtEaWtQc1dQTHBONXF4aVxuQzVBVG8yMUhEMkhYWElhSmNJYjduM1gyM1FTY1ZReUxNMVI0Wkc1MXplTWpxSnFwcjFVUlNBdmxWYXZPQ0RqaFxuaTBMdHl0eVhsdFphTWdudkNrd1IwNnltc1hIa2NtSnRTYVJXcGhVQ2dZQVRra1l2NXBvMU1kV01Kc1E3UHN4NVxuRW8vc0xJN0IxUnJwYWRmdkNQNUtTM1ZWQmFvSG9xVEtuZWh6L2ozYUUxS0FPcUIydnVsMUtQbVJkbkVPM3VNV1xueWZyMnFZZlgvRVZMRXc1TExrcENrWWVKN2YySVY4TnZ2SVVXVEdMRFFaZEw4VWl4RG5tNnZiS1c0bVo5VVVNNlxuRjMxQzZjWlZSazlXWG5HZDJjWTluQT09XG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLAogICJjbGllbnRfZW1haWwiOiAid2VkZGluZy1waG90by11cGxvYWRlckBncm91cC1pbWFnZS1zaGFyZS00NzM3MTcuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJjbGllbnRfaWQiOiAiMTE4MTA2MjkzMTIzMzU3MDE3Njg1IiwKICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLAogICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLAogICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwKICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS93ZWRkaW5nLXBob3RvLXVwbG9hZGVyJTQwZ3JvdXAtaW1hZ2Utc2hhcmUtNDczNzE3LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAidW5pdmVyc2VfZG9tYWluIjogImdvb2dsZWFwaXMuY29tIgp9Cg==
```

### 3. Keep Your Existing Variables
Make sure these are still set:
- `ACCESS_TOKEN=wedding-photo-gallery-2025`
- `NODE_ENV=production`
- `PORT=3000`

### 4. Verify All Variables Are Set
After adding, you should see:
- ✅ STORAGE_TYPE
- ✅ GCS_BUCKET_NAME
- ✅ GCS_PROJECT_ID
- ✅ GCS_SERVICE_ACCOUNT_KEY_BASE64
- ✅ ACCESS_TOKEN
- ✅ NODE_ENV
- ✅ PORT

### 5. Now You Can Push!
```bash
git push origin main
```

Railway will automatically detect the push and deploy.

### 6. Monitor Deployment
Watch the Railway logs for:
- `☁️  Storage Type: gcs`
- `📦 GCS Bucket: group-image-share`
- `🎉 Wedding Photo App server running on port 3000`

### 7. Test
Once deployed, test at:
https://jkochis.github.io/wedding-photo-app?token=wedding-photo-gallery-2025

Upload a photo and verify it works!

---

## 🔍 What Changed?

### Before:
- Photos stored in Railway volume (`/app/data/uploads/`)
- URLs: `https://...up.railway.app/uploads/photo.jpg?token=...`
- Cost: $5/month for volume

### After:
- Photos stored in Google Cloud Storage
- URLs: `https://storage.googleapis.com/group-image-share/photo.jpg?X-Goog-Algorithm=...`
- Cost: ~$0.03/month (99% savings!)
- Signed URLs expire after 7 days (auto-regenerated)

---

**Ready? Add the variables to Railway, then push!**
