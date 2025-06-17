// routes/crudRoutes.js
const express = require('express');
const router = express.Router();
const crudController = require('../controllers/crudController');
const authController = require('../controllers/authController');
const { body, validationResult } = require('express-validator');

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
