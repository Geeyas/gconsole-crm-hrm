const { pool } = require('./config/db');

async function checkAndFixCorruptedAttachments() {
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
          THEN 'TIMESTAMP_CORRUPTED'
          ELSE 'VALID_PATH'
        END as status
      FROM Attachments a
      LEFT JOIN Shiftattachments sa ON a.ID = sa.Attachmentid
      WHERE a.ID >= 30
      ORDER BY a.ID DESC
    `);
    
    console.log('\n📋 Recent Attachments Status:');
    console.log('=' .repeat(120));
    console.log(sprintf('%-4s | %-8s | %-50s | %-30s | %-8s', 'ID', 'Shift', 'Filename', 'Filestoreid (truncated)', 'Status'));
    console.log('=' .repeat(120));
    
    results.forEach(row => {
      const truncatedPath = row.Filestoreid ? row.Filestoreid.substring(0, 30) : 'NULL';
      const status = row.status === 'TIMESTAMP_CORRUPTED' ? '❌ CORRUPTED' : '✅ VALID';
      console.log(sprintf('%-4s | %-8s | %-50s | %-30s | %-8s', 
        row.ID, 
        row.Clientshiftrequestid || 'NULL', 
        row.Filename ? row.Filename.substring(0, 48) : 'NULL',
        truncatedPath,
        status
      ));
    });

    console.log('=' .repeat(120));
    
    const corruptedRecords = results.filter(row => row.status === 'TIMESTAMP_CORRUPTED');
    console.log(`\n🚨 Found ${corruptedRecords.length} corrupted records with timestamp Filestoreid values`);
    
    if (corruptedRecords.length > 0) {
      console.log('\n💡 These records need to be mapped to their corresponding GCS files:');
      corruptedRecords.forEach(record => {
        console.log(`   • ID ${record.ID} (Shift ${record.Clientshiftrequestid}): "${record.Filestoreid}"`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

// Simple sprintf function
function sprintf(format, ...args) {
  return format.replace(/%-?(\d+)s/g, (match, width) => {
    const arg = args.shift() || '';
    const isLeftAlign = match.startsWith('%-');
    return isLeftAlign ? arg.padEnd(parseInt(width)) : arg.padStart(parseInt(width));
  });
}

checkAndFixCorruptedAttachments();
