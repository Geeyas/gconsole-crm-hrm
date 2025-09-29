const { uploadPDFToGCS } = require('./utils/gcsUtils');
const fs = require('fs');
const path = require('path');

async function testGCSUpload() {
  try {
    console.log('Testing GCS upload function...');
    
    // Create a simple test PDF buffer
    const testPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF');
    const testFilename = 'test-upload.pdf';
    const testShiftId = 198;
    const testMimeType = 'application/pdf';
    const testShiftDate = new Date('2025-09-29');
    
    console.log('Upload parameters:');
    console.log('- Filename:', testFilename);
    console.log('- ShiftID:', testShiftId);
    console.log('- Buffer size:', testPdfBuffer.length);
    console.log('- MIME type:', testMimeType);
    console.log('- Shift date:', testShiftDate);
    
    const result = await uploadPDFToGCS(testPdfBuffer, testFilename, testShiftId, testMimeType, testShiftDate);
    
    console.log('\nUpload successful!');
    console.log('Result object:', JSON.stringify(result, null, 2));
    console.log('GCS Path (what should go in Filestoreid):', result.gcsPath);
    
  } catch (error) {
    console.error('\n❌ Upload failed!');
    console.error('Error:', error.message);
    console.error('Full error:', error);
    
    // This might explain why timestamps are being stored instead of GCS paths
    console.log('\nThis could explain why Filestoreid contains timestamps instead of GCS paths');
  }
}

testGCSUpload();
