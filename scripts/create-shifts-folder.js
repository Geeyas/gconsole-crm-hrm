const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize GCS client
const storage = new Storage({
  keyFilename: path.join(__dirname, '..', 'config', 'gcs-key.json'),
  projectId: 'nurselink-byshiftly'
});

const bucketName = 'nurselink-byshiftly-shiftsattachments';

async function createShiftsFolder() {
  try {
    console.log('🚀 Creating Shifts root folder in GCS...');
    
    const bucket = storage.bucket(bucketName);
    
    // Create a placeholder file in the Shifts folder to ensure it exists
    // GCS doesn't have true "folders", but this creates the folder structure
    const fileName = 'Shifts/.folder-placeholder';
    const file = bucket.file(fileName);
    
    // Upload a small placeholder file
    await file.save('This folder contains shift-related PDF attachments organized by date.', {
      metadata: {
        contentType: 'text/plain',
        customMetadata: {
          purpose: 'folder-structure-placeholder',
          createdBy: 'gconsole-crm-hrm-system',
          createdAt: new Date().toISOString()
        }
      }
    });
    
    console.log('✅ Successfully created Shifts/ root folder');
    console.log(`📁 Folder structure ready at: gs://${bucketName}/Shifts/`);
    console.log('🎉 Future PDF uploads will automatically organize under this folder!');
    
  } catch (error) {
    console.error('❌ Error creating Shifts folder:', error.message);
    
    if (error.code === 'ENOENT') {
      console.log('💡 Make sure the GCS key file exists at: config/gcs-key.json');
    }
  }
}

// Run the script
createShiftsFolder();
