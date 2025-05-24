// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorizeManager } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/register', authenticate, authController.register);

router.put('/update-password', authenticate, authController.updatePassword);
router.put('/people/:id', authenticate, authorizeManager, authController.updateUserProfile);


router.get('/user/:id/usertype', authController.getUsertypeByPersonId);
router.get('/tables', authController.getAllTables);

module.exports = router;


