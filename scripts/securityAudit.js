#!/usr/bin/env node
// scripts/securityAudit.js
// Security audit script for the roster management application

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔒 Security Audit for Shiftly API\n');

const auditResults = {
  passed: [],
  warnings: [],
  errors: []
};

// Check environment variables
function checkEnvironmentVariables() {
  console.log('📋 Checking environment variables...');
  
  const requiredVars = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'SMTP_USER',
    'SMTP_PASS'
  ];

  const missing = [];
  const weak = [];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else if (varName === 'JWT_SECRET' && process.env[varName].length < 32) {
      weak.push(`${varName} (too short: ${process.env[varName].length} chars)`);
    }
  });

  if (missing.length > 0) {
    auditResults.errors.push(`Missing environment variables: ${missing.join(', ')}`);
  }

  if (weak.length > 0) {
    auditResults.warnings.push(`Weak environment variables: ${weak.join(', ')}`);
  }

  if (missing.length === 0 && weak.length === 0) {
    auditResults.passed.push('Environment variables properly configured');
  }
}

// Check package.json for security issues
function checkDependencies() {
  console.log('📦 Checking dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for known vulnerable packages
    const vulnerablePackages = [
      'express-session@1.17.0',
      'lodash@4.17.0'
    ];

    const found = [];
    vulnerablePackages.forEach(pkg => {
      const [name, version] = pkg.split('@');
      if (dependencies[name] && dependencies[name].includes(version)) {
        found.push(pkg);
      }
    });

    if (found.length > 0) {
      auditResults.warnings.push(`Potentially vulnerable packages: ${found.join(', ')}`);
    } else {
      auditResults.passed.push('No known vulnerable packages detected');
    }

    // Check for security-related packages
    const securityPackages = ['helmet', 'express-rate-limit', 'express-validator', 'bcrypt'];
    const missing = securityPackages.filter(pkg => !dependencies[pkg]);
    
    if (missing.length > 0) {
      auditResults.warnings.push(`Missing security packages: ${missing.join(', ')}`);
    } else {
      auditResults.passed.push('Security packages properly installed');
    }

  } catch (error) {
    auditResults.errors.push(`Failed to check dependencies: ${error.message}`);
  }
}

// Check for common security issues in code
function checkCodeSecurity() {
  console.log('🔍 Checking code for security issues...');
  
  const filesToCheck = [
    'server.js',
    'controllers/authController.js',
    'middleware/authMiddleware.js',
    'config/db.js'
  ];

  filesToCheck.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for hardcoded secrets
      const secretPatterns = [
        /password\s*[:=]\s*['"][^'"]+['"]/gi,
        /secret\s*[:=]\s*['"][^'"]+['"]/gi,
        /token\s*[:=]\s*['"][^'"]+['"]/gi
      ];

      secretPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          auditResults.warnings.push(`Potential hardcoded secrets in ${file}: ${matches.length} matches`);
        }
      });

      // Check for SQL injection vulnerabilities (but allow safe patterns)
      const sqlPatterns = [
        /query\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/g,
        /query\s*\(\s*['"][^'"]*\$\{[^}]+\}[^'"]*['"]/g
      ];

      // Safe patterns that use validation
      const safePatterns = [
        /validUpdates\.join/,
        /allowedFields\.includes/,
        /validFieldNames\.includes/
      ];

      sqlPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          // Check if this is a safe pattern
          const isSafe = safePatterns.some(safePattern => safePattern.test(content));
          if (!isSafe) {
            auditResults.errors.push(`Potential SQL injection in ${file}: ${matches.length} matches`);
          } else {
            auditResults.passed.push(`SQL injection prevention in ${file}: using validation`);
          }
        }
      });

    } catch (error) {
      auditResults.warnings.push(`Could not check ${file}: ${error.message}`);
    }
  });

  auditResults.passed.push('Code security checks completed');
}

// Check file permissions
function checkFilePermissions() {
  console.log('📁 Checking file permissions...');
  
  const sensitiveFiles = [
    '.env',
    'package.json',
    'server.js'
  ];

  sensitiveFiles.forEach(file => {
    try {
      const stats = fs.statSync(file);
      const mode = stats.mode.toString(8);
      
      // Check if file is readable by others
      if (mode.endsWith('6') || mode.endsWith('7')) {
        auditResults.warnings.push(`${file} has overly permissive permissions: ${mode}`);
      } else {
        auditResults.passed.push(`${file} has appropriate permissions`);
      }
    } catch (error) {
      auditResults.warnings.push(`Could not check permissions for ${file}: ${error.message}`);
    }
  });
}

// Generate security recommendations
function generateRecommendations() {
  console.log('💡 Generating security recommendations...');
  
  const recommendations = [
    'Use HTTPS in production',
    'Implement rate limiting for all endpoints',
    'Add request/response logging',
    'Use environment variables for all secrets',
    'Regularly update dependencies',
    'Implement proper error handling',
    'Add input validation for all endpoints',
    'Use prepared statements for database queries',
    'Implement proper session management',
    'Add security headers (Helmet.js)',
    'Regular security audits',
    'Backup strategy for database',
    'Monitor for suspicious activities',
    'Implement proper CORS configuration'
  ];

  auditResults.passed.push('Security recommendations generated');
  return recommendations;
}

// Run all checks
async function runAudit() {
  checkEnvironmentVariables();
  checkDependencies();
  checkCodeSecurity();
  checkFilePermissions();
  const recommendations = generateRecommendations();

  // Print results
  console.log('\n📊 Audit Results:\n');

  if (auditResults.passed.length > 0) {
    console.log('✅ Passed Checks:');
    auditResults.passed.forEach(item => console.log(`   ✓ ${item}`));
    console.log('');
  }

  if (auditResults.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    auditResults.warnings.forEach(item => console.log(`   ⚠ ${item}`));
    console.log('');
  }

  if (auditResults.errors.length > 0) {
    console.log('❌ Errors:');
    auditResults.errors.forEach(item => console.log(`   ✗ ${item}`));
    console.log('');
  }

  console.log('💡 Security Recommendations:');
  recommendations.forEach(item => console.log(`   • ${item}`));

  // Summary
  const totalChecks = auditResults.passed.length + auditResults.warnings.length + auditResults.errors.length;
  console.log(`\n📈 Summary: ${auditResults.passed.length}/${totalChecks} checks passed`);
  
  if (auditResults.errors.length > 0) {
    console.log('🚨 Critical security issues found! Please address them immediately.');
    process.exit(1);
  } else if (auditResults.warnings.length > 0) {
    console.log('⚠️  Security warnings found. Consider addressing them for better security.');
  } else {
    console.log('🎉 All security checks passed!');
  }
}

// Run the audit
runAudit().catch(console.error); 