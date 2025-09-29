const { pool } = require('./config/db');

async function fixDatabaseTrigger() {
  try {
    console.log('🔧 Fixing the database trigger to prevent future corruption...');
    
    // Drop the problematic trigger
    await pool.query('DROP TRIGGER IF EXISTS Attachments_BEFORE_INSERT');
    console.log('✅ Dropped problematic trigger');
    
    // Create new trigger without the Filestoreid corruption
    const newTrigger = `
      CREATE TRIGGER Attachments_BEFORE_INSERT
      BEFORE INSERT ON Attachments
      FOR EACH ROW
      BEGIN
          SET new.Sysstarttime = current_timestamp();
      END
    `;
    
    await pool.query(newTrigger);
    console.log('✅ Created new trigger without Filestoreid corruption');
    
    // Verify the trigger
    const [triggers] = await pool.query("SHOW TRIGGERS LIKE 'Attachments'");
    console.log('\n📋 Current triggers:');
    triggers.forEach(trigger => {
      console.log(`   • ${trigger.Trigger}: ${trigger.Event} ${trigger.Timing}`);
    });
    
    console.log('\n🎉 Database trigger fixed successfully!');
    console.log('   Future uploads will now store proper GCS paths instead of timestamps.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing trigger:', error);
    process.exit(1);
  }
}

fixDatabaseTrigger();
