// scripts/fix-corrupted-attachments.js
// Fix corrupted Filestoreid entries in the Attachments table

const { pool: db } = require('../config/db');

async function fixCorruptedAttachments() {
  try {
    console.log('🔍 Checking for corrupted attachment entries...\n');

    // Find attachments with timestamp-format Filestoreid (corrupted entries)
    const [corruptedAttachments] = await db.query(`
      SELECT a.ID, a.Filename, a.Filestoreid, a.Createdat, sa.Clientshiftrequestid
      FROM Attachments a
      INNER JOIN Shiftattachments sa ON a.ID = sa.Attachmentid
      WHERE a.Filestoreid REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
      AND a.Deletedat IS NULL AND sa.Deletedat IS NULL
    `);

    if (corruptedAttachments.length === 0) {
      console.log('✅ No corrupted attachments found. All Filestoreid entries appear to be valid GCS paths.');
      return;
    }

    console.log(`❌ Found ${corruptedAttachments.length} corrupted attachment(s):`);
    corruptedAttachments.forEach((att, index) => {
      console.log(`  ${index + 1}. ID: ${att.ID}, Shift: ${att.Clientshiftrequestid}, File: ${att.Filename}`);
      console.log(`      Corrupted Filestoreid: "${att.Filestoreid}"`);
    });

    console.log('\n🔧 Attempting to generate correct GCS paths...\n');

    const { generateGCSFilename, generateGCSPath } = require('../utils/gcsUtils');
    
    for (const attachment of corruptedAttachments) {
      try {
        // Generate what the correct GCS path should be
        const correctFilename = generateGCSFilename(attachment.Clientshiftrequestid, attachment.Filename);
        
        // Use the attachment's creation date for folder organization
        const shiftDate = new Date(attachment.Createdat);
        const correctGCSPath = generateGCSPath(correctFilename, shiftDate);
        
        console.log(`📝 Attachment ID ${attachment.ID}:`);
        console.log(`   Current (corrupted): ${attachment.Filestoreid}`);
        console.log(`   Should be: ${correctGCSPath}`);
        
        // Check if a file with this path might exist in GCS
        // Note: We can't easily check GCS without proper credentials setup
        // So we'll generate the path and let the admin verify
        
        console.log(`   ⚠️  Manual verification needed: Check if file exists in GCS at path: ${correctGCSPath}`);
        console.log('');
        
      } catch (err) {
        console.error(`❌ Error processing attachment ${attachment.ID}: ${err.message}`);
      }
    }

    console.log('🛠️  MANUAL FIX REQUIRED:');
    console.log('1. Verify which files actually exist in your GCS bucket');
    console.log('2. For files that exist, update the Filestoreid in the database');
    console.log('3. For files that don\'t exist, consider marking them as deleted or requesting re-upload\n');

    // Provide SQL statements for manual fixes
    console.log('📋 SQL statements to fix existing attachments (verify GCS paths first):');
    corruptedAttachments.forEach((attachment, index) => {
      const correctFilename = generateGCSFilename(attachment.Clientshiftrequestid, attachment.Filename);
      const shiftDate = new Date(attachment.Createdat);
      const correctGCSPath = generateGCSPath(correctFilename, shiftDate);
      
      console.log(`-- Attachment ID ${attachment.ID} (${attachment.Filename})`);
      console.log(`UPDATE Attachments SET Filestoreid = '${correctGCSPath}' WHERE ID = ${attachment.ID};`);
      console.log('');
    });

    console.log('⚠️  IMPORTANT: Only run the SQL updates after verifying the files exist in GCS!');
    console.log('⚠️  Files that don\'t exist in GCS should be marked as deleted or require re-upload.');

  } catch (error) {
    console.error('❌ Error fixing corrupted attachments:', error);
    process.exit(1);
  } finally {
    await db.end();
    process.exit(0);
  }
}

// Run the fix
fixCorruptedAttachments();
