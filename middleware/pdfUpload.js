// middleware/pdfUpload.js
// Multer middleware for handling PDF file uploads

const multer = require('multer');
const { validatePDFFile } = require('../utils/gcsUtils');

// Configure multer for in-memory storage (since we're uploading to GCS)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Only accept PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Create multer instance with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB limit
    files: 1, // Only one file at a time
  }
});

// Middleware for handling single PDF upload
const uploadSinglePDF = upload.single('pdf');

// Enhanced middleware with error handling and validation
const handlePDFUpload = (req, res, next) => {
  uploadSinglePDF(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size allowed is 6MB.',
          code: 'FILE_TOO_LARGE'
        });
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one PDF file is allowed.',
          code: 'TOO_MANY_FILES'
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field. Use "pdfAttachment" as the field name.',
          code: 'UNEXPECTED_FILE_FIELD'
        });
      }
      
      // Generic multer error
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
        code: 'UPLOAD_ERROR'
      });
    }
    
    if (err) {
      // Non-multer errors (like file type validation)
      return res.status(400).json({
        success: false,
        message: err.message,
        code: 'FILE_VALIDATION_ERROR'
      });
    }
    
    // If file was uploaded, perform additional validation
    if (req.file) {
      const validation = validatePDFFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
          code: 'PDF_VALIDATION_ERROR'
        });
      }
      
      // Add file metadata to request for logging
      req.fileMetadata = {
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      };
    }
    
    // Continue to next middleware
    next();
  });
};

// Middleware for handling PDF replacement on existing shifts
const handlePDFReplacement = (req, res, next) => {
  // Same as handlePDFUpload but for PUT/POST requests on existing resources
  handlePDFUpload(req, res, next);
};

module.exports = {
  handlePDFUpload,
  handlePDFReplacement,
  uploadSinglePDF
};
