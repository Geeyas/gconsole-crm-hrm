const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSyncIDDefault() {
  console.log('=== Checking SyncID Default Value ===\n');
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('1. Checking table structure for SyncID:');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE, DATA_TYPE, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Users' 
      AND COLUMN_NAME = 'SyncID'
    `);
    
    console.log('SyncID column info:', columns);
    
    console.log('\n2. Checking current SyncID values:');
    const [syncIds] = await connection.execute(`
      SELECT id, username, SyncID 
      FROM Users 
      WHERE SyncID IS NOT NULL 
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    console.log('Recent SyncID values:');
    syncIds.forEach(row => {
      console.log(`ID: ${row.id}, Username: ${row.username}, SyncID: ${row.SyncID}`);
    });
    
    console.log('\n3. Checking if UUID() function is available:');
    const [uuidTest] = await connection.execute('SELECT UUID() as test_uuid');
    console.log('UUID() test result:', uuidTest[0]);
    
    console.log('\n4. Suggested fixes:');
    console.log('Option A: Let database handle it (recommended)');
    console.log('ALTER TABLE Users MODIFY COLUMN SyncID VARCHAR(36) DEFAULT (UUID());');
    
    console.log('\nOption B: Remove SyncID from INSERT (if default exists)');
    console.log('Remove SyncID from the INSERT statement in authController.js');
    
    console.log('\nOption C: Use database UUID function in INSERT');
    console.log('INSERT INTO Users (fullname, username, email, passwordhash, SyncID, ...)');
    console.log('VALUES (?, ?, ?, ?, UUID(), ...)');
    
    await connection.end();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSyncIDDefault(); 