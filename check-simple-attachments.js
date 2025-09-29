const { pool } = require('./config/db');

async function checkCorruptedAttachments() {
  try {
    console.log('🔍 Checking ALL recent attachments...');
    const [results] = await pool.query(`
      SELECT 
        a.ID, 
        a.Filename, 
        a.Filestoreid, 
        a.Filesize,
        a.Createdat,
        sa.Clientshiftrequestid,
        CASE 
          WHEN a.Filestoreid REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
          THEN 'CORRUPTED'
          ELSE 'VALID'
        END as status
      FROM Attachments a
      LEFT JOIN Shiftattachments sa ON a.ID = sa.Attachmentid
      WHERE a.ID >= 30
      ORDER BY a.ID DESC
    `);
    
    console.log('\n📋 Recent Attachments Status:');
    console.log('====================================================================');
    
    results.forEach(row => {
      const status = row.status === 'CORRUPTED' ? '❌ TIMESTAMP' : '✅ VALID';
      const filestoreid = row.Filestoreid ? row.Filestoreid.substring(0, 40) : 'NULL';
      
      console.log(`ID ${row.ID.toString().padEnd(3)} | Shift ${(row.Clientshiftrequestid || 'NULL').toString().padEnd(3)} | ${status} | ${filestoreid}`);
      console.log(`      | File: ${row.Filename || 'NULL'}`);
      console.log('--------------------------------------------------------------------');
    });
    
    const corruptedRecords = results.filter(row => row.status === 'CORRUPTED');
    console.log(`\n🚨 SUMMARY: ${corruptedRecords.length} corrupted records found`);
    
    if (corruptedRecords.length > 0) {
      console.log('\n💡 The downloads fail because these records have timestamps instead of GCS paths:');
      corruptedRecords.forEach(record => {
        console.log(`   • Attachment ID ${record.ID} (Shift ${record.Clientshiftrequestid}): "${record.Filestoreid}"`);
      });
      
      console.log('\n🔧 These need to be mapped to the corresponding GCS files you showed me:');
      console.log('   • shift-191_1759144668146_d36s1vfdggq.pdf');
      console.log('   • shift-191_1759144670707_c76i1b0s3i.pdf');
      console.log('   • shift-198_1759143879169_kv1odn...');
      console.log('   • etc...');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

checkCorruptedAttachments();
