// scripts/env-check.js
// Check environment configuration for API issues

require('dotenv').config();

function checkEnvironment() {
  console.log('🔧 Environment Configuration Check\n');

  const requiredEnvVars = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'GCS_PROJECT_ID',
    'GCS_BUCKET_NAME'
  ];

  const optionalEnvVars = [
    'PORT',
    'NODE_ENV',
    'GOOGLE_APPLICATION_CREDENTIALS'
  ];

  console.log('📋 Required Environment Variables:');
  let missingRequired = 0;
  
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      // Hide sensitive values
      const displayValue = ['JWT_SECRET', 'DB_PASSWORD'].includes(varName) 
        ? '***[HIDDEN]***' 
        : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    } else {
      console.log(`❌ ${varName}: MISSING`);
      missingRequired++;
    }
  });

  console.log('\n📋 Optional Environment Variables:');
  optionalEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value}`);
    } else {
      console.log(`⚠️ ${varName}: Not set (using default)`);
    }
  });

  // GCS Configuration Check
  console.log('\n☁️ Google Cloud Storage Configuration:');
  const gcsProjectId = process.env.GCS_PROJECT_ID;
  const gcsBucket = process.env.GCS_BUCKET_NAME;
  const gcsCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (gcsProjectId && gcsBucket) {
    console.log('✅ GCS basic configuration present');
    if (gcsCredentials) {
      console.log('✅ GCS credentials path configured');
      // Check if credentials file exists
      const fs = require('fs');
      if (fs.existsSync(gcsCredentials)) {
        console.log('✅ GCS credentials file exists');
      } else {
        console.log('❌ GCS credentials file not found at specified path');
      }
    } else {
      console.log('⚠️ GCS credentials not explicitly set (may use default service account)');
    }
  } else {
    console.log('❌ GCS configuration incomplete - PDF attachments will be disabled');
  }

  // Database Configuration Check
  console.log('\n🗄️ Database Configuration:');
  const dbHost = process.env.DB_HOST;
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;

  if (dbHost && dbName && dbUser) {
    console.log('✅ Database connection parameters present');
    console.log(`  Host: ${dbHost}`);
    console.log(`  Database: ${dbName}`);
    console.log(`  User: ${dbUser}`);
  } else {
    console.log('❌ Database configuration incomplete');
  }

  // Security Check
  console.log('\n🔐 Security Configuration:');
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length >= 32) {
      console.log('✅ JWT secret has adequate length');
    } else {
      console.log('⚠️ JWT secret should be at least 32 characters for security');
    }
  }

  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    console.log('✅ Production environment detected');
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('⚠️ Production should have explicit GCS credentials');
    }
  } else {
    console.log(`ℹ️ Environment: ${nodeEnv || 'development'}`);
  }

  console.log('\n📊 Summary:');
  if (missingRequired === 0) {
    console.log('✅ All required environment variables are configured');
  } else {
    console.log(`❌ ${missingRequired} required environment variables are missing`);
  }

  return missingRequired === 0;
}

// Run the check
const isHealthy = checkEnvironment();
process.exit(isHealthy ? 0 : 1);
