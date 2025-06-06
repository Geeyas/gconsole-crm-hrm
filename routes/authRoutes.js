// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorizeManager, authorizeClient, authorizeStaffOrAdmin } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/register', authenticate, authController.register);
router.post('/clientshiftrequests', authenticate, authorizeClient, authController.createClientShiftRequest);
router.post('/link-client-user-location', authenticate, authorizeStaffOrAdmin, authController.linkClientUserToLocation);


router.put('/update-password', authenticate, authController.updatePassword);
router.put('/people/:id', authenticate, authorizeManager, authController.updateUserProfile);


router.get('/user/:id/usertype', authController.getUsertypeByPersonId);
router.get('/tables', authController.getAllTables);

module.exports = router;

