// routes/crudRoutes.js
const express = require('express');
const router = express.Router();
const crudController = require('../controllers/crudController');
const authController = require('../controllers/authController');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { contactAdminValidation, handleValidationErrors } = require('../middleware/validation');

// Validation middleware for create/update
function validateCrudFields(req, res, next) {
  // Only basic check: all fields must be non-empty (customize as needed)
  const errors = [];
  Object.entries(req.body).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim() === '') {
      errors.push({ msg: `${key} cannot be empty`, param: key });
    }
  });
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation error', errors, code: 'VALIDATION_ERROR' });
  }
  next();
}

// Rate limiter for contact-admin (5 requests per 10 minutes per IP)
const contactAdminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// router.post('/contact-admin', contactAdminLimiter, contactAdminValidation, handleValidationErrors, crudController.contactAdmin);

// router.get('/:table/paginated', crudController.getAllPaginated);
router.get('/:table/paginated', crudController.getAllPaginated);
// GET /clientLocation - get all clients with their locations (no auth required)
router.get('/clientLocation', authController.getClientLocations);
router.get('/:table', crudController.getAll);
router.get('/:table/:id', crudController.getOne);
router.post('/:table', validateCrudFields, crudController.create);
router.put('/:table/:id', validateCrudFields, crudController.update);
router.delete('/:table/:id', crudController.remove);

module.exports = router;
