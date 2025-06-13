// Validation middleware for linkClientUserToLocation endpoint
const { body } = require('express-validator');

const linkClientUserValidation = [
  body('emailaddress')
    .notEmpty().withMessage('emailaddress is required')
    .isEmail().withMessage('emailaddress must be a valid email'),
  body('clientid')
    .notEmpty().withMessage('clientid is required')
    .isInt({ gt: 0 }).withMessage('clientid must be a positive integer'),
];

module.exports = {
  linkClientUserValidation,
};
