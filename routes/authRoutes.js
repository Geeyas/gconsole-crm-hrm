// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { 
  login, 
  refreshToken, 
  register, 
  createClientShiftRequest, 
  linkClientUserToLocation, 
  updatePassword, 
  updateUserProfile, 
  getUsertypeByPersonId, 
  getAllTables, 
  getAvailableClientShifts, 
  acceptClientStaffShift, 
  approveClientStaffShift, 
  rejectClientStaffShift 
} = require('../controllers/authController');
const { 
  authenticate, 
  authorizeManager, 
  authorizeClient, 
  authorizeStaffOrAdmin, 
  authorizeAdmin 
} = require('../middleware/authMiddleware');

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
router.post('/clientshiftrequests', authenticate, authorizeClient, authController.createClientShiftRequest);
router.post('/link-client-user-location', authenticate, authorizeStaffOrAdmin, authController.linkClientUserToLocation);


router.put('/update-password', authenticate, authController.updatePassword);
router.put('/people/:id', authenticate, authorizeManager, authController.updateUserProfile);


router.get('/user/:id/usertype', authController.getUsertypeByPersonId);
router.get('/tables', authController.getAllTables);

// Staff: View available client shifts
router.get('/available-client-shifts', authenticate, authorizeStaffOrAdmin, authController.getAvailableClientShifts);

// Staff: Accept a client staff shift
router.post('/clientstaffshifts/:id/accept', authenticate, authorizeEmployeeOrStaffOrAdmin, authController.acceptClientStaffShift);

// Staff or Admin: Approve a client staff shift
router.post('/clientstaffshifts/:id/approve', authenticate, authorizeStaffOrAdmin, authController.approveClientStaffShift);

// Staff or Admin: Reject a client staff shift
router.post('/clientstaffshifts/:id/reject', authenticate, authorizeStaffOrAdmin, authController.rejectClientStaffShift);

module.exports = router;

