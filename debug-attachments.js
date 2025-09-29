const { pool } = require('./config/db');

async function checkLatestAttachments() {
  try {
    const [results] = await pool.query(`
      SELECT 
        a.ID, 
        a.Filename, 
        a.Filestoreid, 
        a.Filesize,
        a.Createdat,
        sa.Clientshiftrequestid,
        LENGTH(a.Filestoreid) as filestoreid_length
      FROM Attachments a
      LEFT JOIN Shiftattachments sa ON a.ID = sa.Attachmentid
      WHERE a.ID IN (37, 38)
      ORDER BY a.ID
    `);
    
    console.log('Latest Attachments (37,38):');
    results.forEach(row => {
      console.log('---');
      console.log(`ID: ${row.ID}`);
      console.log(`Filename: ${row.Filename}`);
      console.log(`Filestoreid: "${row.Filestoreid}"`);
      console.log(`Filestoreid Length: ${row.filestoreid_length}`);
      console.log(`Filesize: ${row.Filesize}`);
      console.log(`Created: ${row.Createdat}`);
      console.log(`ShiftRequestId: ${row.Clientshiftrequestid}`);
    });
    
    console.log('\nExpected Filestoreid format should be: shifts/2025/01/shift_198_filename_timestamp.pdf');
    
    // Also check what the GCS upload function parameters would be
    console.log('\nFor comparison, checking a few recent attachments:');
    const [recent] = await pool.query(`
      SELECT ID, Filename, Filestoreid, Createdat 
      FROM Attachments 
      WHERE ID > 30 
      ORDER BY ID DESC 
      LIMIT 10
    `);
    
    recent.forEach(row => {
      console.log(`ID ${row.ID}: "${row.Filestoreid}" (${row.Filename})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

checkLatestAttachments();
