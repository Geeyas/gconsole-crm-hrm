const { pool: db } = require('./config/db');

async function checkReferences() {
    try {
        // Check if Importreference is being used
        const [importRef] = await db.query('SELECT Importreference, COUNT(*) as count FROM Attachments WHERE Importreference IS NOT NULL GROUP BY Importreference LIMIT 10');
        console.log('Current Importreference usage:', importRef);
        
        // Check if we can add EntityID column
        const [columns] = await db.query("SHOW COLUMNS FROM Attachments LIKE '%entity%'");
        console.log('Existing entity-related columns:', columns);
        
        // Let's also check what Sourcetype values exist
        const [sourceTypes] = await db.query('SELECT Sourcetype, COUNT(*) as count FROM Attachments WHERE Sourcetype IS NOT NULL GROUP BY Sourcetype');
        console.log('Current Sourcetype values:', sourceTypes);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkReferences();
