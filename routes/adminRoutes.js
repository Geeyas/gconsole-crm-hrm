// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { adminStaffEmailValidation, handleValidationErrors } = require('../middleware/validation');
const { authenticate } = require('../middleware/authMiddleware');

// Debug: Check what we got from middleware
console.log('adminStaffEmailValidation type:', typeof adminStaffEmailValidation);
console.log('handleValidationErrors type:', typeof handleValidationErrors);
console.log('authenticate type:', typeof authenticate);
const crudController = require('../controllers/crudController');

// Debug: Check what we got from crudController
console.log('crudController in adminRoutes:', crudController);
console.log('crudController.sendEmail type:', typeof crudController.sendEmail);
console.log('crudController keys:', Object.keys(crudController));

// Middleware to check if user is admin or staff
const requireAdminOrStaff = (req, res, next) => {
  const userType = req.user?.usertype;
  
  // Allow System Admin and Staff users
  if (userType === 'System Admin' || userType === 'Staff - Standard User') {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. Admin or Staff privileges required.' 
  });
};

// Admin/Staff Email endpoint (requires authentication and admin/staff privileges)
router.post('/send-email', 
  authenticate, 
  requireAdminOrStaff, 
  adminStaffEmailValidation, 
  handleValidationErrors, 
  crudController.sendEmail
);

module.exports = router; 