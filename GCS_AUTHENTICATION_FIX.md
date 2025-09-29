# Google Cloud Storage Authentication Fix Guide

## Problem: GCS not initialized - PDF upload failed

The Google Cloud Storage is failing to authenticate. You have several options to fix this:

## Option 1: Service Account Key File (Recommended for development)

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Navigate to IAM & Admin > Service Accounts
3. Find or create a service account with Storage Admin permissions
4. Create a new key (JSON format)
5. Download the key file and place it in your project root (e.g., `gcs-key.json`)
6. Add to your .env file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./gcs-key.json
   ```

## Option 2: Environment Variables
Set these in your .env file:
```
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

## Option 3: Modify gcsUtils.js to use explicit credentials
Update the Storage initialization in utils/gcsUtils.js:

```javascript
storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: './path/to/your/service-account-key.json' // Add this line
});
```

## Test the fix:
After setting up authentication, run:
```bash
node test-gcs-upload.js
```

## Current Status:
- GCS_PROJECT_ID: rostermatic-b2ae0 ✓
- GCS_BUCKET_NAME: nurselink-byshiftly-shiftsattachments ✓  
- Authentication: ❌ Missing (causing uploads to fail)

## Next Steps:
1. Fix the database trigger first (run fix-attachment-trigger.sql)
2. Set up GCS authentication using one of the options above
3. Test with a new file upload
