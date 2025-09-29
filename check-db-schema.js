const { pool } = require('./config/db');

async function checkAttachmentsSchema() {
  try {
    console.log('Checking Attachments table schema...');
    const [schema] = await pool.query('DESCRIBE Attachments');
    
    console.log('\nAttachments table structure:');
    schema.forEach(col => {
      console.log(`${col.Field}: ${col.Type} | Null: ${col.Null} | Default: ${col.Default} | Extra: ${col.Extra}`);
    });
    
    // Check for triggers on Attachments table
    console.log('\nChecking for triggers on Attachments table...');
    const [triggers] = await pool.query(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING, ACTION_STATEMENT 
      FROM information_schema.TRIGGERS 
      WHERE EVENT_OBJECT_TABLE = 'Attachments' 
      AND EVENT_OBJECT_SCHEMA = DATABASE()
    `);
    
    if (triggers.length > 0) {
      console.log('Found triggers:');
      triggers.forEach(trigger => {
        console.log(`- ${trigger.TRIGGER_NAME} (${trigger.ACTION_TIMING} ${trigger.EVENT_MANIPULATION})`);
        console.log(`  Action: ${trigger.ACTION_STATEMENT}`);
      });
    } else {
      console.log('No triggers found on Attachments table.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

checkAttachmentsSchema();
