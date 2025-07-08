// utils/hashUtils.js
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = 12; // Industry standard for bcrypt

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash (supports both bcrypt and legacy SHA-256)
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Stored password hash
 * @param {string} salt - Legacy salt (only needed for SHA-256 hashes)
 * @returns {Promise<boolean>} - True if password matches
 */
async function verifyPassword(password, hash, salt = null) {
  if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }

  // First try bcrypt verification
  try {
    const bcryptResult = await bcrypt.compare(password, hash);
    if (bcryptResult) {
      return true;
    }
  } catch (error) {
    // If bcrypt fails, it might be a legacy hash
    console.log('Bcrypt verification failed, trying legacy SHA-256...');
  }

  // If bcrypt failed and we have a salt, try legacy SHA-256 verification
  if (salt) {
    try {
      const legacyHash = crypto.createHmac('sha256', salt).update(password).digest('hex');
      return legacyHash === hash;
    } catch (error) {
      console.error('Legacy hash verification failed:', error);
      return false;
    }
  }

  return false;
}

/**
 * Migrate a legacy SHA-256 hash to bcrypt
 * @param {string} password - Plain text password
 * @param {string} legacyHash - Old SHA-256 hash
 * @param {string} salt - Legacy salt
 * @returns {Promise<string>} - New bcrypt hash
 */
async function migrateLegacyHash(password, legacyHash, salt) {
  // Verify the legacy password first
  const isValid = await verifyPassword(password, legacyHash, salt);
  if (!isValid) {
    throw new Error('Invalid legacy password');
  }
  
  // Generate new bcrypt hash
  return await hashPassword(password);
}

/**
 * Generate a random salt (legacy function for compatibility)
 * @deprecated Use bcrypt's built-in salt generation
 * @returns {string} - Random hex string
 */
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { 
  hashPassword, 
  verifyPassword, 
  migrateLegacyHash,
  generateSalt // Keep for backward compatibility
};
