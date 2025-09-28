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

// Create multer instance with configuration for single file
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB limit per file
    files: 1, // Only one file at a time
  }
});

// Create multer instance for multiple files
const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB limit per file
    files: 10, // Maximum 10 files at a time
  }
});

// Middleware for handling single PDF upload
const uploadSinglePDF = upload.single('pdf');

// Middleware for handling multiple PDF uploads
const uploadMultiplePDFs = uploadMultiple.array('pdfs', 10); // 'pdfs' field name, max 10 files

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

// Enhanced middleware for handling multiple PDF uploads with validation
const handleMultiplePDFUploads = (req, res, next) => {
  uploadMultiplePDFs(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'One or more files too large. Maximum size allowed per file is 6MB.',
          code: 'FILE_TOO_LARGE'
        });
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 10 PDF files allowed per upload.',
          code: 'TOO_MANY_FILES'
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field. Use "pdfs" as the field name.',
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
    
    // If files were uploaded, perform additional validation
    if (req.files && req.files.length > 0) {
      // Calculate total size
      const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
      const maxTotalSize = 6 * 1024 * 1024; // 6MB total
      
      if (totalSize > maxTotalSize) {
        return res.status(400).json({
          success: false,
          message: `Total file size exceeds 6MB limit. Current total: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
          code: 'TOTAL_SIZE_EXCEEDED'
        });
      }
      
      // Validate each PDF file
      for (let i = 0; i < req.files.length; i++) {
        const validation = validatePDFFile(req.files[i]);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: `Invalid PDF file "${req.files[i].originalname}": ${validation.error}`,
            code: 'PDF_VALIDATION_ERROR'
          });
        }
      }
      
      // Add files metadata to request for logging
      req.filesMetadata = req.files.map(file => ({
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString()
      }));
    }
    
    // Continue to next middleware
    next();
  });
};

module.exports = {
  handlePDFUpload,
  handlePDFReplacement,
  handleMultiplePDFUploads,
  uploadSinglePDF,
  uploadMultiplePDFs
};
