// utils/gcsUtils.js
// Google Cloud Storage utilities for PDF attachments

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const winston = require('winston');

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

let storage = null;
let bucket = null;

// Initialize GCS client
function initializeGCS() {
  if (!process.env.GCS_PROJECT_ID || !process.env.GCS_BUCKET_NAME) {
    logger.warn('GCS not configured - PDF attachments will be disabled');
    return false;
  }

  try {
    storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID
    });
    
    bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    logger.info('✅ GCS initialized successfully', {
      projectId: process.env.GCS_PROJECT_ID,
      bucketName: process.env.GCS_BUCKET_NAME
    });
    return true;
  } catch (error) {
    logger.error('❌ Failed to initialize GCS:', error);
    return false;
  }
}

/**
 * Generate unique filename for GCS storage
 * @param {number} shiftRequestId - ID of the shift request
 * @param {string} originalFilename - Original filename from user
 * @returns {string} - Unique filename for GCS
 */
function generateGCSFilename(shiftRequestId, originalFilename) {
  const timestamp = Date.now();
  const uuid = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalFilename);
  
  // Format: shift-123_1695808800000_abc123def456.pdf
  return `shift-${shiftRequestId}_${timestamp}_${uuid}${extension}`;
}

/**
 * Generate GCS file path with date organization
 * @param {string} filename - Generated filename
 * @returns {string} - Full GCS path
 */
function generateGCSPath(filename) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Format: 2025/09/27/shift-123_1695808800000_abc123def456.pdf
  return `${year}/${month}/${day}/${filename}`;
}

/**
 * Upload PDF file to Google Cloud Storage
 * @param {Buffer} fileBuffer - PDF file buffer
 * @param {string} originalFilename - Original filename
 * @param {number} shiftRequestId - ID of shift request
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} - Upload result with GCS path and metadata
 */
async function uploadPDFToGCS(fileBuffer, originalFilename, shiftRequestId, mimeType) {
  if (!bucket) {
    throw new Error('GCS not initialized - PDF upload failed');
  }

  try {
    // Generate unique filename and path
    const filename = generateGCSFilename(shiftRequestId, originalFilename);
    const gcsPath = generateGCSPath(filename);
    
    // Create GCS file object
    const file = bucket.file(gcsPath);
    
    // Upload metadata
    const metadata = {
      metadata: {
        originalName: originalFilename,
        shiftRequestId: shiftRequestId.toString(),
        uploadedAt: new Date().toISOString(),
        contentType: mimeType
      },
      contentType: mimeType,
      cacheControl: 'private, max-age=86400' // Cache for 24 hours
    };
    
    // Upload the file
    await file.save(fileBuffer, metadata);
    
    logger.info('✅ PDF uploaded to GCS successfully', {
      originalFilename,
      gcsPath,
      shiftRequestId,
      fileSize: fileBuffer.length
    });
    
    return {
      success: true,
      gcsPath,
      filename: originalFilename,
      fileSize: fileBuffer.length,
      mimeType,
      uploadedAt: new Date()
    };
    
  } catch (error) {
    logger.error('❌ Failed to upload PDF to GCS:', {
      error: error.message,
      originalFilename,
      shiftRequestId
    });
    
    throw new Error(`PDF upload failed: ${error.message}`);
  }
}

/**
 * Download PDF file from Google Cloud Storage
 * @param {string} gcsPath - Path to file in GCS
 * @returns {Promise<Buffer>} - File buffer
 */
async function downloadPDFFromGCS(gcsPath) {
  if (!bucket) {
    throw new Error('GCS not initialized - PDF download failed');
  }

  try {
    const file = bucket.file(gcsPath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error('PDF file not found in storage');
    }
    
    // Download file
    const [buffer] = await file.download();
    
    logger.info('✅ PDF downloaded from GCS successfully', {
      gcsPath,
      fileSize: buffer.length
    });
    
    return buffer;
    
  } catch (error) {
    logger.error('❌ Failed to download PDF from GCS:', {
      error: error.message,
      gcsPath
    });
    
    throw new Error(`PDF download failed: ${error.message}`);
  }
}

/**
 * Delete PDF file from Google Cloud Storage
 * @param {string} gcsPath - Path to file in GCS
 * @returns {Promise<boolean>} - Success status
 */
async function deletePDFFromGCS(gcsPath) {
  if (!bucket) {
    throw new Error('GCS not initialized - PDF deletion failed');
  }

  try {
    const file = bucket.file(gcsPath);
    
    // Check if file exists before trying to delete
    const [exists] = await file.exists();
    if (!exists) {
      logger.warn('PDF file not found in GCS, skipping deletion', { gcsPath });
      return true; // Consider it successful since file doesn't exist
    }
    
    // Delete the file
    await file.delete();
    
    logger.info('✅ PDF deleted from GCS successfully', { gcsPath });
    return true;
    
  } catch (error) {
    logger.error('❌ Failed to delete PDF from GCS:', {
      error: error.message,
      gcsPath
    });
    
    throw new Error(`PDF deletion failed: ${error.message}`);
  }
}

/**
 * Get PDF file metadata from GCS
 * @param {string} gcsPath - Path to file in GCS
 * @returns {Promise<Object>} - File metadata
 */
async function getPDFMetadata(gcsPath) {
  if (!bucket) {
    throw new Error('GCS not initialized');
  }

  try {
    const file = bucket.file(gcsPath);
    const [metadata] = await file.getMetadata();
    
    return {
      name: metadata.name,
      size: parseInt(metadata.size),
      contentType: metadata.contentType,
      created: metadata.timeCreated,
      updated: metadata.updated,
      originalName: metadata.metadata?.originalName,
      shiftRequestId: metadata.metadata?.shiftRequestId
    };
    
  } catch (error) {
    logger.error('❌ Failed to get PDF metadata from GCS:', {
      error: error.message,
      gcsPath
    });
    
    throw new Error(`Failed to get PDF metadata: ${error.message}`);
  }
}

/**
 * Validate PDF file before upload
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
function validatePDFFile(file) {
  const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
  const ALLOWED_MIME_TYPES = ['application/pdf'];
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size of 6MB`
    };
  }
  
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Only PDF files are allowed. Received: ${file.mimetype}`
    };
  }
  
  // Check file extension
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension !== '.pdf') {
    return {
      valid: false,
      error: `Invalid file extension. Only .pdf files are allowed. Received: ${extension}`
    };
  }
  
  // Additional PDF validation - check file signature
  if (file.buffer) {
    const pdfSignature = file.buffer.slice(0, 4).toString();
    if (!pdfSignature.includes('%PDF')) {
      return {
        valid: false,
        error: 'File does not appear to be a valid PDF document'
      };
    }
  }
  
  return { valid: true };
}

// Initialize GCS on module load
const gcsInitialized = initializeGCS();

module.exports = {
  uploadPDFToGCS,
  downloadPDFFromGCS,
  deletePDFFromGCS,
  getPDFMetadata,
  validatePDFFile,
  generateGCSFilename,
  generateGCSPath,
  gcsInitialized
};
