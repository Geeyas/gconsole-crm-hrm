const { body, param, query, validationResult } = require('express-validator');

// Common validation patterns
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

// Timesheet entry validation for create and update
const timesheetEntryValidation = [
  body('date')
    .optional()
    .matches(datePattern)
    .withMessage('Date must be in YYYY-MM-DD format')
    .custom((value) => {
      if (value) {
        // Get today's date in the server's local timezone
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Compare dates as strings to avoid timezone issues
        if (value > todayStr) {
          throw new Error('Date cannot be in the future');
        }
      }
      return true;
    }),
    
  body('location_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Location name must be 1-255 characters'),
    
  body('start_time')
    .optional()
    .matches(timePattern)
    .withMessage('Start time must be in HH:MM format'),
    
  body('end_time')
    .optional()
    .matches(timePattern)
    .withMessage('End time must be in HH:MM format')
    .custom((value, { req }) => {
      if (value && req.body.start_time) {
        const startTime = req.body.start_time;
        if (value <= startTime) {
          throw new Error('End time must be after start time');
        }
      }
      return true;
    }),
    
  body('break_time_minutes')
    .optional()
    .isInt({ min: 0, max: 480 })
    .withMessage('Break time must be between 0 and 480 minutes (8 hours)'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be 1000 characters or less'),
    
  body('client_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Client name must be 1-50 characters'),
    
  body('client_signature')
    .optional()
    .isString()
    .withMessage('Client signature must be a string'),
    
  body('client_signature_date')
    .optional()
    .isISO8601()
    .withMessage('Client signature date must be a valid ISO 8601 date'),
    
  body('client_notes')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Client notes must be 255 characters or less')
];

// Create timesheet entry validation (requires all fields)
const createTimesheetValidation = [
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .matches(datePattern)
    .withMessage('Date must be in YYYY-MM-DD format')
    .custom((value) => {
      // Get today's date in the server's local timezone
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Compare dates as strings to avoid timezone issues
      if (value > todayStr) {
        throw new Error('Date cannot be in the future');
      }
      
      // Don't allow entries older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      if (value < thirtyDaysAgoStr) {
        throw new Error('Cannot create timesheet entries older than 30 days');
      }
      return true;
    }),
    
  body('location_name')
    .notEmpty()
    .withMessage('Location name is required')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Location name must be 1-255 characters'),
    
  body('start_time')
    .notEmpty()
    .withMessage('Start time is required')
    .matches(timePattern)
    .withMessage('Start time must be in HH:MM format'),
    
  body('end_time')
    .notEmpty()
    .withMessage('End time is required')
    .matches(timePattern)
    .withMessage('End time must be in HH:MM format')
    .custom((value, { req }) => {
      const startTime = req.body.start_time;
      if (value <= startTime) {
        throw new Error('End time must be after start time');
      }
      
      // Calculate duration and check maximum hours (16 hours)
      const start = new Date(`2000-01-01 ${startTime}:00`);
      const end = new Date(`2000-01-01 ${value}:00`);
      const diffHours = (end - start) / (1000 * 60 * 60);
      const breakHours = (parseInt(req.body.break_time_minutes) || 0) / 60;
      const workHours = diffHours - breakHours;
      
      if (workHours > 16) {
        throw new Error('Maximum 16 working hours per shift allowed');
      }
      
      return true;
    }),
    
  body('break_time_minutes')
    .optional()
    .isInt({ min: 0, max: 480 })
    .withMessage('Break time must be between 0 and 480 minutes (8 hours)'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be 1000 characters or less'),
    
  body('client_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Client name must be 1-50 characters'),
    
  body('client_signature')
    .optional()
    .isString()
    .withMessage('Client signature must be a string'),
    
  body('client_signature_date')
    .optional()
    .isISO8601()
    .withMessage('Client signature date must be a valid ISO 8601 date'),
    
  body('client_notes')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Client notes must be 255 characters or less')
];

// Update timesheet entry validation (all fields optional)
const updateTimesheetValidation = [
  param('entry_id')
    .isInt({ min: 1 })
    .withMessage('Entry ID must be a positive integer'),
    
  ...timesheetEntryValidation
];

// Weekly submission validation
const weeklySubmissionValidation = [
  body('week_start_date')
    .notEmpty()
    .withMessage('Week start date is required')
    .matches(datePattern)
    .withMessage('Week start date must be in YYYY-MM-DD format')
    .custom((value) => {
      // Parse the date in the server's local timezone
      const date = new Date(value + 'T00:00:00');
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 1) { // Monday = 1
        throw new Error('Week start date must be a Monday');
      }
      return true;
    })
];

// Admin query parameters validation
const adminQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('status')
    .optional()
    .isIn(['draft', 'submitted', 'approved', 'rejected'])
    .withMessage('Status must be draft, submitted, approved, or rejected'),
    
  query('employee_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Employee ID must be a positive integer'),
    
  query('week_start')
    .optional()
    .matches(datePattern)
    .withMessage('Week start must be in YYYY-MM-DD format'),
    
  query('week_end')
    .optional()
    .matches(datePattern)
    .withMessage('Week end must be in YYYY-MM-DD format'),
    
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be 1-100 characters')
];

// Employee timesheet detail validation
const employeeTimesheetValidation = [
  param('employee_id')
    .isInt({ min: 1 })
    .withMessage('Employee ID must be a positive integer'),
    
  param('week_start_date')
    .matches(datePattern)
    .withMessage('Week start date must be in YYYY-MM-DD format')
];

// Timesheet approval validation
const approvalValidation = [
  param('timesheet_id')
    .isInt({ min: 1 })
    .withMessage('Timesheet ID must be a positive integer'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be 500 characters or less')
];

// Timesheet rejection validation
const rejectionValidation = [
  param('timesheet_id')
    .isInt({ min: 1 })
    .withMessage('Timesheet ID must be a positive integer'),
    
  body('reason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be 1-500 characters'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be 500 characters or less')
];

// Export validation
const exportValidation = [
  query('format')
    .optional()
    .isIn(['csv'])
    .withMessage('Only CSV format is currently supported'),
    
  query('week_start')
    .optional()
    .matches(datePattern)
    .withMessage('Week start must be in YYYY-MM-DD format'),
    
  query('week_end')
    .optional()
    .matches(datePattern)
    .withMessage('Week end must be in YYYY-MM-DD format'),
    
  query('status')
    .optional()
    .isIn(['draft', 'submitted', 'approved', 'rejected'])
    .withMessage('Status must be draft, submitted, approved, or rejected')
];

// Weekly timesheet query validation
const weeklyTimesheetValidation = [
  query('week_start')
    .optional()
    .matches(datePattern)
    .withMessage('Week start must be in YYYY-MM-DD format')
];

// Entry ID parameter validation
const entryIdValidation = [
  param('entry_id')
    .isInt({ min: 1 })
    .withMessage('Entry ID must be a positive integer')
];

// Generic validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The provided data is invalid',
        details: errors.array().map(error => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value
        }))
      }
    });
  }
  next();
};

module.exports = {
  createTimesheetValidation,
  updateTimesheetValidation,
  weeklySubmissionValidation,
  adminQueryValidation,
  employeeTimesheetValidation,
  approvalValidation,
  rejectionValidation,
  exportValidation,
  weeklyTimesheetValidation,
  entryIdValidation,
  handleValidationErrors
}; 