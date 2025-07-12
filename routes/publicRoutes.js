// routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const { contactAdminValidation, handleValidationErrors } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');
const crudController = require('../controllers/crudController');

// Rate limiter for contact-admin (5 requests per 10 minutes per IP)
const contactAdminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public Contact Admin endpoint (no auth)
router.post('/contact-admin', contactAdminLimiter, contactAdminValidation, handleValidationErrors, crudController.contactAdmin);

module.exports = router; 