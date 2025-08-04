#!/usr/bin/env node
// scripts/ai-training-control.js
// Control AI Training Data Collection Settings

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');

function updateEnvVariable(key, value) {
  let envContent = '';
  
  // Read existing .env file if it exists
  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf8');
  }
  
  // Check if the variable already exists
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}=${value}`;
  
  if (regex.test(envContent)) {
    // Replace existing variable
    envContent = envContent.replace(regex, newLine);
  } else {
    // Add new variable
    envContent += envContent.endsWith('\n') ? '' : '\n';
    envContent += newLine + '\n';
  }
  
  fs.writeFileSync(ENV_FILE, envContent);
  console.log(`✅ Updated ${key}=${value} in .env file`);
}

function showCurrentSettings() {
  console.log('\n📊 Current AI Training Settings:');
  console.log('─'.repeat(50));
  
  const saveToFiles = process.env.AI_SAVE_TO_FILES !== 'false';
  const saveIndividual = process.env.AI_SAVE_INDIVIDUAL !== 'false';
  const logToConsole = process.env.AI_LOG_TO_CONSOLE === 'true';
  
  console.log(`🗂️  Save to JSONL files: ${saveToFiles ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`📁 Save individual JSON files: ${saveIndividual ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`🖥️  Log to console: ${logToConsole ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log('─'.repeat(50));
}

function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'disable-files':
      console.log('🛑 Disabling AI file exports (keeping data collection active)...');
      updateEnvVariable('AI_SAVE_TO_FILES', 'false');
      updateEnvVariable('AI_SAVE_INDIVIDUAL', 'false');
      updateEnvVariable('AI_LOG_TO_CONSOLE', 'true');
      console.log('✅ AI file exports disabled! Data will only show in console.');
      console.log('💡 Restart your server with: npm start');
      break;
      
    case 'enable-files':
      console.log('✅ Enabling AI file exports...');
      updateEnvVariable('AI_SAVE_TO_FILES', 'true');
      updateEnvVariable('AI_SAVE_INDIVIDUAL', 'true');
      updateEnvVariable('AI_LOG_TO_CONSOLE', 'false');
      console.log('✅ AI file exports enabled! Data will be saved to files.');
      console.log('💡 Restart your server with: npm start');
      break;
      
    case 'testing-mode':
      console.log('🧪 Enabling testing mode (console only, no files)...');
      updateEnvVariable('AI_SAVE_TO_FILES', 'false');
      updateEnvVariable('AI_SAVE_INDIVIDUAL', 'false');
      updateEnvVariable('AI_LOG_TO_CONSOLE', 'true');
      console.log('✅ Testing mode enabled! Data will only show in console.');
      console.log('💡 Restart your server with: npm start');
      break;
      
    case 'production-mode':
      console.log('🚀 Enabling production mode (files only, no console spam)...');
      updateEnvVariable('AI_SAVE_TO_FILES', 'true');
      updateEnvVariable('AI_SAVE_INDIVIDUAL', 'true');
      updateEnvVariable('AI_LOG_TO_CONSOLE', 'false');
      console.log('✅ Production mode enabled! Data will be saved to files silently.');
      console.log('💡 Restart your server with: npm start');
      break;
      
    case 'status':
    case undefined:
      showCurrentSettings();
      break;
      
    default:
      console.log('❌ Unknown command. Available commands:');
      console.log('  node scripts/ai-training-control.js status           # Show current settings');
      console.log('  node scripts/ai-training-control.js disable-files   # Disable file exports (testing)');
      console.log('  node scripts/ai-training-control.js enable-files    # Enable file exports');
      console.log('  node scripts/ai-training-control.js testing-mode    # Console only mode');
      console.log('  node scripts/ai-training-control.js production-mode # Files only mode');
      break;
  }
  
  if (command && command !== 'status') {
    console.log('\n📋 Quick Commands:');
    console.log('  npm run ai-testing    # Switch to testing mode');
    console.log('  npm run ai-production # Switch to production mode');
    console.log('  npm run ai-status     # Check current settings');
  }
}

main();
