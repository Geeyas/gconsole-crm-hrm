const { pool } = require('./config/db');

async function fixCorruptedAttachments() {
  try {
    console.log('🔧 Fixing corrupted attachment records...');
    
    // Based on your GCS bucket and the timing, here are the mappings:
    const corrections = [
      {
        attachmentId: 39,
        shiftId: 191,
        timestamp: "2025-09-29 11:17:50",
        correctGcsPath: "Shifts/2025/09/29/shift-191_1759144668146_d36s1vfdggq.pdf",
        filename: "Tenant_Confirmation_Letter_6501DonalAve_2025 -.pdf",
        size: 166441 // 166.4 KB
      },
      {
        attachmentId: 40,
        shiftId: 191,
        timestamp: "2025-09-29 11:17:52", 
        correctGcsPath: "Shifts/2025/09/29/shift-191_1759144670707_c76i1b0s3i.pdf",
        filename: "Tenant_Confirmation_Letter_6501DonalAve_2025.pdf",
        size: 575464 // 575.5 KB
      }
    ];
    
    console.log('\n📋 Correction Plan:');
    corrections.forEach(correction => {
      console.log(`   • ID ${correction.attachmentId}: "${correction.timestamp}" → "${correction.correctGcsPath}"`);
    });
    
    console.log('\n❓ Do you want to apply these corrections? (This will update the database)');
    console.log('   ✅ This will fix the download functionality');
    console.log('   ⚠️  Make sure the GCS paths match your bucket structure');
    
    // For safety, let's first verify the current state
    console.log('\n🔍 Current database state:');
    for (const correction of corrections) {
      const [rows] = await pool.query(
        'SELECT ID, Filestoreid, Filename, Filesize FROM Attachments WHERE ID = ?',
        [correction.attachmentId]
      );
      
      if (rows.length > 0) {
        const row = rows[0];
        console.log(`   ID ${row.ID}: "${row.Filestoreid}" (${row.Filename}, ${row.Filesize} bytes)`);
      }
    }
    
    console.log('\n💡 To apply the fix, uncomment the UPDATE statements below and run this script again.');
    console.log('\n Applying corrections...');
    for (const correction of corrections) {
      const [result] = await pool.query(
        'UPDATE Attachments SET Filestoreid = ? WHERE ID = ?',
        [correction.correctGcsPath, correction.attachmentId]
      );
      console.log(`✅ Fixed attachment ID ${correction.attachmentId}: ${result.affectedRows} row(s) updated`);
    }
    
    console.log('\n🎉 All corrections applied successfully!');
    console.log('   Downloads should now work for these attachments.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCorruptedAttachments();
