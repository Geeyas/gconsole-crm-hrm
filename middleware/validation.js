// Centralized validation middleware for shift creation and other endpoints
const { body, param, query, validationResult } = require('express-validator');

// Common validation patterns
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const datetimePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

// Sanitize and validate common fields
const sanitizeEmail = body('email').trim().toLowerCase();
const sanitizeUsername = body('username').trim().toLowerCase();
const sanitizePhone = body('phone').trim().replace(/[^\d+]/g, '');

const createShiftValidation = [
  body('clientlocationid')
    .notEmpty().withMessage('clientlocationid is required')
    .isInt({ min: 1 }).withMessage('clientlocationid must be a positive integer'),
  body('shiftdate')
    .notEmpty().withMessage('shiftdate is required')
    .isISO8601().withMessage('shiftdate must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const shiftDate = new Date(value);
      if (shiftDate < today) {
        throw new Error('shiftdate cannot be in the past');
      }
      return true;
    }),
  body('starttime')
    .notEmpty().withMessage('starttime is required')
    .matches(datetimePattern)
    .withMessage('starttime must be in YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS format'),
  body('endtime')
    .notEmpty().withMessage('endtime is required')
    .matches(datetimePattern)
    .withMessage('endtime must be in YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS format')
    .custom((value, { req }) => {
      const start = new Date(req.body.starttime);
      const end = new Date(value);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid datetime format for starttime or endtime');
      }
      if (end <= start) {
        throw new Error('endtime must be after starttime');
      }
      return true;
    }),
  body('qualificationgroupid')
    .notEmpty().withMessage('qualificationgroupid is required')
    .isInt({ min: 1 }).withMessage('qualificationgroupid must be a positive integer'),
  body('totalrequiredstaffnumber')
    .notEmpty().withMessage('totalrequiredstaffnumber is required')
    .isInt({ min: 1 }).withMessage('totalrequiredstaffnumber must be a positive integer'),
];

// User registration validation
const registerValidation = [
  sanitizeEmail,
  body('email')
    .isEmail().withMessage('Invalid email format')
    .isLength({ max: 255 }).withMessage('Email too long'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/).withMessage('Password must include uppercase, lowercase, number, and special character'),
  body('firstname')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name contains invalid characters'),
  body('lastname')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name contains invalid characters'),
  body('usertype_id')
    .isInt({ min: 1, max: 4 }).withMessage('Invalid usertype_id'),
];

// Login validation
const loginValidation = [
  sanitizeUsername,
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ max: 255 }).withMessage('Username too long'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 255 }).withMessage('Password too long'),
];

// Password update validation
const passwordUpdateValidation = [
  sanitizeUsername,
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ max: 255 }).withMessage('Username too long'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/).withMessage('Password must include uppercase, lowercase, number, and special character'),
];

// User profile update validation
const profileUpdateValidation = [
  body('Firstname')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name contains invalid characters'),
  body('Lastname')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name contains invalid characters'),
  body('Emailaddress')
    .optional()
    .trim()
    .toLowerCase()
    .isEmail().withMessage('Invalid email format')
    .isLength({ max: 255 }).withMessage('Email too long'),
  body('Phonemobile')
    .optional()
    .trim()
    .matches(phonePattern).withMessage('Invalid phone number format'),
  body('Postcode')
    .optional()
    .trim()
    .isLength({ min: 4, max: 10 }).withMessage('Postcode must be 4-10 characters'),
  body('TFN')
    .optional()
    .trim()
    .isLength({ min: 9, max: 9 }).withMessage('TFN must be exactly 9 digits')
    .isNumeric().withMessage('TFN must contain only numbers'),
];

// ID parameter validation
const idParamValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
];

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// Generic validation handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

module.exports = {
  createShiftValidation,
  registerValidation,
  loginValidation,
  passwordUpdateValidation,
  profileUpdateValidation,
  idParamValidation,
  paginationValidation,
  handleValidationErrors,
  sanitizeEmail,
  sanitizeUsername,
  sanitizePhone
};
