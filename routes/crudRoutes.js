// routes/crudRoutes.js
const express = require('express');
const router = express.Router();
const crudController = require('../controllers/crudController');
const authController = require('../controllers/authController');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { contactAdminValidation, handleValidationErrors } = require('../middleware/validation');
const { authenticate, authorizeStaffOrAdmin } = require('../middleware/authMiddleware');

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

// Custom middleware to authorize only System Admin and Staff - Standard User for People paginated
function authorizePeoplePaginated(req, res, next) {
  const userType = req.user?.usertype;
  if (userType === 'System Admin' || userType === 'Staff - Standard User') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Only System Admin or Staff can access this endpoint.' });
}

// router.post('/contact-admin', contactAdminLimiter, contactAdminValidation, handleValidationErrors, crudController.contactAdmin);

// Add authentication and authorization for People paginated endpoint
// router.get('/People/paginated', authenticate, authorizePeoplePaginated, crudController.getAllPaginated);
// Generic paginated route for other tables (requires authentication)
router.get('/:table/paginated', authenticate, crudController.getAllPaginated);
// GET /clientLocation - get all clients with their locations (no auth required)
router.get('/clientLocation', authController.getClientLocations);
// Add authentication to other CRUD routes
router.get('/:table', authenticate, crudController.getAll);
router.get('/:table/:id', authenticate, crudController.getOne);
router.post('/:table', authenticate, validateCrudFields, crudController.create);
router.put('/:table/:id', authenticate, validateCrudFields, crudController.update);
router.delete('/:table/:id', authenticate, crudController.remove);

module.exports = router;
