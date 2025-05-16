// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/register', authenticate, authController.register);

router.put('/update-password', authenticate, authController.updatePassword);

router.get('/user/:id/usertype', authController.getUsertypeByPersonId);
router.get('/tables', authController.getAllTables);

module.exports = router;
