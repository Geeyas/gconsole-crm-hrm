// routes/clientRoutes.js
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateJWT);

// Clients
router.post('/clients', clientController.createClient);
router.put('/clients/:id', clientController.updateClient);
router.delete('/clients/:id', clientController.deleteClient);

// Client Locations
router.post('/clientlocations', clientController.createClientLocation);
router.put('/clientlocations/:id', clientController.updateClientLocation);
router.delete('/clientlocations/:id', clientController.deleteClientLocation);

module.exports = router;
