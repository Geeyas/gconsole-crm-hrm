// scripts/scheduledExport.js
// Scheduled task to automatically export AI training data

const cron = require('node-cron');
const { exportAllFormats } = require('./exportAITrainingData');
const fs = require('fs').promises;
const path = require('path');

console.log('🕒 AI Training Data Export Scheduler Started');

// Schedule daily export at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🌙 Starting scheduled AI training data export...');
  
  try {
    const exports = await exportAllFormats();
    
    // Log successful export
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'scheduled_export',
      success: true,
      exports: exports
    };
    
    await logExportActivity(logEntry);
    console.log('✅ Scheduled export completed successfully');
    
  } catch (error) {
    console.error('❌ Scheduled export failed:', error);
    
    // Log failed export
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'scheduled_export',
      success: false,
      error: error.message
    };
    
    await logExportActivity(logEntry);
  }
}, {
  timezone: "Australia/Melbourne"
});

// Schedule weekly analytics export on Sundays at 3 AM
cron.schedule('0 3 * * 0', async () => {
  console.log('📊 Starting weekly analytics export...');
  
  try {
    const { exportAnalytics } = require('./exportAITrainingData');
    const analyticsFile = await exportAnalytics();
    
    console.log('✅ Weekly analytics export completed:', analyticsFile);
    
  } catch (error) {
    console.error('❌ Weekly analytics export failed:', error);
  }
}, {
  timezone: "Australia/Melbourne"
});

async function logExportActivity(logEntry) {
  try {
    const AI_TRAINING_DIR = path.join(__dirname, '..', 'ai-training-data');
    const logFile = path.join(AI_TRAINING_DIR, 'export-log.jsonl');
    
    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(logFile, logLine);
    
  } catch (error) {
    console.error('Failed to log export activity:', error);
  }
}

console.log('⏰ Scheduled exports configured:');
console.log('  📅 Daily export: 2:00 AM Australia/Melbourne');
console.log('  📊 Weekly analytics: 3:00 AM Sundays Australia/Melbourne');
