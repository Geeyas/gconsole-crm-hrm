// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.put('/update-password', authController.updatePassword);
router.get('/tables', authController.getAllTables);
router.get('/tableInfo/:tab', authController.getFullTableInfo);

module.exports = router;
