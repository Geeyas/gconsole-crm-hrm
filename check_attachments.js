const { pool: db } = require('./config/db');

async function checkAttachments() {
    try {
        console.log('Checking existing attachments...');
        const [rows] = await db.query('SELECT * FROM Attachments LIMIT 5');
        console.log('Sample attachments:', rows);
        
        // Check if there are any foreign key relationships
        const [fkInfo] = await db.query(`
            SELECT 
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = 'Attachments' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        console.log('Foreign key relationships:', fkInfo);
        
        // Check if there's a way to link to shift requests
        const [shiftrequests] = await db.query('DESCRIBE Clientshiftrequests');
        console.log('Clientshiftrequests table exists and has columns:', shiftrequests.length);
        if (shiftrequests.length > 0) {
            console.log('First few columns:', shiftrequests.slice(0, 5).map(col => col.Field));
        }
        
        await db.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        try { await db.end(); } catch(e) {}
        process.exit(1);
    }
}

checkAttachments();
