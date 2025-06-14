// Centralized validation middleware for shift creation and other endpoints
const { body } = require('express-validator');

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
    .matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)
    .withMessage('starttime must be in YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS format'),
  body('endtime')
    .notEmpty().withMessage('endtime is required')
    .matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)
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
  body('qualificationid')
    .notEmpty().withMessage('qualificationid is required')
    .isInt({ min: 1 }).withMessage('qualificationid must be a positive integer'),
  body('totalrequiredstaffnumber')
    .notEmpty().withMessage('totalrequiredstaffnumber is required')
    .isInt({ min: 1 }).withMessage('totalrequiredstaffnumber must be a positive integer'),
];

module.exports = {
  createShiftValidation,
};
