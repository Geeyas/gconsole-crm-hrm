// routes/crudRoutes.js
const express = require('express');
const router = express.Router();
const crudController = require('../controllers/crudController');

router.get('/:table', crudController.getAll);
router.get('/:table/:id', crudController.getOne);
router.post('/:table', crudController.create);
router.put('/:table/:id', crudController.update);
router.delete('/:table/:id', crudController.remove);

module.exports = router;
