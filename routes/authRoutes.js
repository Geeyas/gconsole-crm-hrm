// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { createShiftValidation } = require('../middleware/validation');
const { linkClientUserValidation } = require('../middleware/validationLinkClientUser');
const { validationResult } = require('express-validator');
console.log('authController object in authRoutes immediately after require:', authController);
console.log('Type of authController.getAllClientLocations in authRoutes immediately after require:', typeof authController.getAllClientLocations);

const { 
  authenticate, 
  authorizeManager, 
  authorizeClient, 
  authorizeStaffOrAdmin, 
  authorizeAdmin 
} = require('../middleware/authMiddleware');

// Sanity check for middleware imports
[
  ['authenticate', authenticate],
  ['authorizeManager', authorizeManager],
  ['authorizeClient', authorizeClient],
  ['authorizeStaffOrAdmin', authorizeStaffOrAdmin],
  ['authorizeAdmin', authorizeAdmin]
].forEach(([name, fn]) => {
  if (typeof fn !== 'function') {
    console.error(`FATAL: Middleware '${name}' is not a function. Check your import/export in authMiddleware.js.`);
    throw new Error(`FATAL: Middleware '${name}' is not a function. Check your import/export in authMiddleware.js.`);
  }
});

// Custom middleware to allow Employee, Staff, or System Admin to accept shifts
function authorizeEmployeeOrStaffOrAdmin(req, res, next) {
  const type = req.user?.usertype;
  if (type === 'Employee - Standard User' || type === 'Staff - Standard User' || type === 'System Admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Only employees, staff, or admin can accept shifts.' });
}

router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/register', authenticate, authController.register);
router.post('/clientshiftrequests', authenticate, authorizeClient, createShiftValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  return authController.createClientShiftRequest(req, res, next);
});
// Route to link a client user to a location
router.post('/link-client-user-location', authenticate, authorizeStaffOrAdmin, linkClientUserValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  return authController.linkClientUserToLocation(req, res, next);
});

// Client: View only their assigned locations
router.get('/my-client-locations', authenticate, authController.getMyClientLocations);

router.put('/update-password', authenticate, authController.updatePassword);
router.put('/people/:id', authenticate, authorizeManager, authController.updateUserProfile);


router.get('/user/:id/usertype', authController.getUsertypeByPersonId);
router.get('/tables', authController.getAllTables);

// Staff: View available client shifts
// Allow all authenticated users to access available-client-shifts, controller will handle role-based logic
router.get('/available-client-shifts', authenticate, authController.getAvailableClientShifts);

// Staff: Accept a client staff shift
// The following handlers are missing in authController and will cause Express to throw an error if used.
// Commenting out these routes until implemented to prevent 'argument handler must be a function' error.
// router.post('/clientstaffshifts/:id/accept', authenticate, authorizeEmployeeOrStaffOrAdmin, authController.acceptClientStaffShift);

// Staff or Admin: Approve a client staff shift
// router.post('/clientstaffshifts/:id/approve', authenticate, authorizeStaffOrAdmin, authController.approveClientStaffShift);

// Staff or Admin: Reject a client staff shift
// router.post('/clientstaffshifts/:id/reject', authenticate, authorizeStaffOrAdmin, authController.rejectClientStaffShift);

// Staff/Admin: Get all clients and their linked locations
router.get('/all-client-locations', authenticate, authorizeStaffOrAdmin, authController.getAllClientLocations); // Changed to use authController prefix

// Soft-delete a person (People table) by setting deletedat and deletedbyid
router.delete('/People/:id', authenticate, authController.softDeletePerson);

console.log('authController:', authController);
console.log('authController keys:', Object.keys(authController));
console.log('authController.getAllClientLocations:', typeof authController.getAllClientLocations);

module.exports = router;

