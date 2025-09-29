// middleware/attachmentValidation.js
// Validation middleware for PDF attachment routes

const { body, param, validationResult } = require('express-validator');

// Validate attachment ID parameter
const validateAttachmentId = param('attachmentId')
  .isInt({ min: 1 })
  .withMessage('Attachment ID must be a positive integer');

// Validate shift request ID parameter
const validateShiftRequestId = param('id')
  .isInt({ min: 1 })
  .withMessage('Shift request ID must be a positive integer');

// Handle validation errors
const handleAttachmentValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

module.exports = {
  validateAttachmentId,
  validateShiftRequestId,
  handleAttachmentValidationErrors
};
