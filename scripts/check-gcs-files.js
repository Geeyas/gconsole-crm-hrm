// scripts/check-gcs-files.js
// Check what files actually exist in GCS for a specific shift

require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

async function checkGCSFiles(shiftId = 201) {
  try {
    console.log('☁️ Checking GCS bucket for files...\n');
    
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID
    });
    
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    
    // List all files
    console.log('📋 All files in bucket:');
    const [files] = await bucket.getFiles();
    
    if (files.length === 0) {
      console.log('  (No files found in bucket)');
    } else {
      files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.metadata.size} bytes)`);
      });
    }
    
    // Check specifically for shift 201 files
    console.log(`\n🎯 Files related to shift ${shiftId}:`);
    const shiftFiles = files.filter(file => 
      file.name.includes(`shift-${shiftId}`) || 
      file.name.includes('Tenant_Confirmation_Letter')
    );
    
    if (shiftFiles.length === 0) {
      console.log('  (No files found for this shift)');
    } else {
      shiftFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name}`);
        console.log(`      Size: ${file.metadata.size} bytes`);
        console.log(`      Created: ${file.metadata.timeCreated}`);
        console.log(`      Content Type: ${file.metadata.contentType}`);
        console.log('');
      });
    }
    
    console.log('✅ GCS check completed.');
    
  } catch (error) {
    console.error('❌ Error checking GCS:', error.message);
    if (error.message.includes('authentication')) {
      console.log('\n💡 Tip: Make sure your GCS credentials are properly configured.');
      console.log('   You can set GOOGLE_APPLICATION_CREDENTIALS environment variable');
      console.log('   or use gcloud auth application-default login');
    }
  }
}

// Run with shift ID from command line or default to 201
const shiftId = process.argv[2] ? parseInt(process.argv[2]) : 201;
checkGCSFiles(shiftId);
