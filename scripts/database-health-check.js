// scripts/database-health-check.js
// Check database schema and attachment table structure

const { pool: db } = require('../config/db');

async function checkDatabaseHealth() {
  try {
    console.log('🔍 Checking database health and schema...\n');

    // 1. Check if required tables exist
    const requiredTables = [
      'Attachments',
      'Shiftattachments',
      'Clientshiftrequests',
      'Users',
      'People'
    ];

    console.log('📋 Checking required tables:');
    for (const table of requiredTables) {
      try {
        const [rows] = await db.query(`SHOW TABLES LIKE '${table}'`);
        if (rows.length > 0) {
          console.log(`✅ ${table} - EXISTS`);
        } else {
          console.log(`❌ ${table} - MISSING`);
        }
      } catch (err) {
        console.log(`❌ ${table} - ERROR: ${err.message}`);
      }
    }

    // 2. Check Attachments table structure
    console.log('\n📊 Attachments table structure:');
    try {
      const [columns] = await db.query('DESCRIBE Attachments');
      columns.forEach(col => {
        console.log(`  ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULLABLE' : 'NOT NULL'}${col.Key ? ` [${col.Key}]` : ''}`);
      });
    } catch (err) {
      console.log(`❌ Error describing Attachments table: ${err.message}`);
    }

    // 3. Check Shiftattachments table structure
    console.log('\n🔗 Shiftattachments table structure:');
    try {
      const [columns] = await db.query('DESCRIBE Shiftattachments');
      columns.forEach(col => {
        console.log(`  ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULLABLE' : 'NOT NULL'}${col.Key ? ` [${col.Key}]` : ''}`);
      });
    } catch (err) {
      console.log(`❌ Error describing Shiftattachments table: ${err.message}`);
    }

    // 4. Check for sample data
    console.log('\n📈 Data counts:');
    const dataTables = ['Attachments', 'Shiftattachments', 'Clientshiftrequests'];
    for (const table of dataTables) {
      try {
        const [result] = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: ${result[0].count} records`);
      } catch (err) {
        console.log(`  ${table}: ERROR - ${err.message}`);
      }
    }

    // 5. Check for orphaned attachments
    console.log('\n🔍 Checking for data integrity issues:');
    try {
      const [orphanedAttachments] = await db.query(`
        SELECT COUNT(*) as count 
        FROM Attachments a 
        LEFT JOIN Shiftattachments sa ON a.ID = sa.Attachmentid 
        WHERE sa.Attachmentid IS NULL AND a.Deletedat IS NULL
      `);
      console.log(`  Orphaned attachments (no shift link): ${orphanedAttachments[0].count}`);
    } catch (err) {
      console.log(`  Orphaned attachments check: ERROR - ${err.message}`);
    }

    try {
      const [missingFiles] = await db.query(`
        SELECT COUNT(*) as count 
        FROM Attachments a
        INNER JOIN Shiftattachments sa ON a.ID = sa.Attachmentid
        WHERE (a.Filestoreid IS NULL OR a.Filestoreid = '') 
        AND a.Deletedat IS NULL AND sa.Deletedat IS NULL
      `);
      console.log(`  Attachments with missing file storage IDs: ${missingFiles[0].count}`);
    } catch (err) {
      console.log(`  Missing files check: ERROR - ${err.message}`);
    }

    // 6. Sample attachment data
    console.log('\n🎯 Sample attachment data (last 5 records):');
    try {
      const [samples] = await db.query(`
        SELECT a.ID, a.Filename, a.Filestoreid, sa.Clientshiftrequestid, 
               a.Createdat, a.Deletedat 
        FROM Attachments a
        LEFT JOIN Shiftattachments sa ON a.ID = sa.Attachmentid
        ORDER BY a.ID DESC 
        LIMIT 5
      `);
      
      if (samples.length === 0) {
        console.log('  No attachment records found.');
      } else {
        samples.forEach(sample => {
          console.log(`  ID: ${sample.ID}, File: ${sample.Filename}, Shift: ${sample.Clientshiftrequestid || 'NONE'}, StorageID: ${sample.Filestoreid || 'MISSING'}`);
        });
      }
    } catch (err) {
      console.log(`  Sample data query: ERROR - ${err.message}`);
    }

    console.log('\n✅ Database health check completed.');

  } catch (error) {
    console.error('❌ Database health check failed:', error);
    process.exit(1);
  } finally {
    await db.end();
    process.exit(0);
  }
}

// Run the health check
checkDatabaseHealth();
