// config/envValidation.js
// Environment variable validation for security and configuration

const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_USER', 
  'DB_PASSWORD',
  'DB_NAME',
  'SMTP_USER',
  'SMTP_PASS'
];

const optionalEnvVars = [
  'PORT',
  'NODE_ENV',
  'JWT_REFRESH_SECRET',
  'GCS_PROJECT_ID',
  'GCS_BUCKET_NAME'
];

function validateEnvironment() {
  const missing = [];
  const warnings = [];

  // Check required environment variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check optional but recommended variables
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long for security');
    }
  }

  // Validate database configuration
  if (process.env.DB_HOST && process.env.DB_HOST === 'localhost') {
    warnings.push('Using localhost for database in production is not recommended');
  }

  // Validate SMTP configuration
  if (process.env.SMTP_USER && !process.env.SMTP_USER.includes('@')) {
    warnings.push('SMTP_USER should be a valid email address');
  }

  // Validate Google Cloud Storage configuration
  if (process.env.GCS_PROJECT_ID && process.env.GCS_BUCKET_NAME) {
    console.log('✅ GCS configuration found - PDF attachments will be enabled');
  } else if (process.env.GCS_PROJECT_ID || process.env.GCS_BUCKET_NAME) {
    warnings.push('GCS configuration incomplete - both GCS_PROJECT_ID and GCS_BUCKET_NAME are required for PDF attachments');
  }

  // Report issues
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment configuration warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  console.log('✅ Environment variables validated successfully');
}

module.exports = { validateEnvironment }; 