// Validation middleware for linkClientUserToLocation endpoint
const { body } = require('express-validator');

const linkClientUserValidation = [
  body('emailaddress')
    .notEmpty().withMessage('emailaddress is required')
    .isEmail().withMessage('emailaddress must be a valid email'),
  body('clientlocationid')
    .notEmpty().withMessage('clientlocationid is required')
    .isInt({ min: 1 }).withMessage('clientlocationid must be a positive integer'),
];

module.exports = {
  linkClientUserValidation,
};
