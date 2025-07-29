const express = require('express');
const router = express.Router();

// Import authentication and authorization middleware
const { authenticate, authorizeStaffOrAdmin } = require('../middleware/authMiddleware');

// Import timesheet controller
const timesheetController = require('../controllers/timesheetController');

// Import timesheet validation middleware
const {
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
} = require('../middleware/timesheetValidation');

// ================== EMPLOYEE TIMESHEET ROUTES ==================

// 1. Get Employee's Timesheet for a Week
// GET /api/timesheets/my-week?week_start={YYYY-MM-DD}
router.get('/my-week', 
  authenticate,
  weeklyTimesheetValidation,
  handleValidationErrors,
  timesheetController.getMyWeekTimesheet
);

// 2. Create New Timesheet Entry
// POST /api/timesheets/entries
router.post('/entries',
  authenticate,
  createTimesheetValidation,
  handleValidationErrors,
  timesheetController.createTimesheetEntry
);

// 3. Update Timesheet Entry
// PUT /api/timesheets/entries/{entry_id}
router.put('/entries/:entry_id',
  authenticate,
  updateTimesheetValidation,
  handleValidationErrors,
  timesheetController.updateTimesheetEntry
);

// 4. Delete Timesheet Entry
// DELETE /api/timesheets/entries/{entry_id}
router.delete('/entries/:entry_id',
  authenticate,
  entryIdValidation,
  handleValidationErrors,
  timesheetController.deleteTimesheetEntry
);

// 5. Submit Weekly Timesheet
// POST /api/timesheets/submit-week
router.post('/submit-week',
  authenticate,
  weeklySubmissionValidation,
  handleValidationErrors,
  timesheetController.submitWeeklyTimesheet
);

// ================== ADMIN TIMESHEET ROUTES ==================

// 6. Get All Employee Timesheets (Admin/Staff)
// GET /api/admin/timesheets?page=1&limit=50&status=submitted&employee_id=123&week_start=2024-01-15&week_end=2024-01-29&search=john
router.get('/admin/timesheets',
  authenticate,
  authorizeStaffOrAdmin,
  adminQueryValidation,
  handleValidationErrors,
  timesheetController.getAllTimesheets
);

// 7. Get Specific Employee's Timesheet Details
// GET /api/admin/timesheets/employee/{employee_id}/week/{week_start_date}
router.get('/admin/timesheets/employee/:employee_id/week/:week_start_date',
  authenticate,
  authorizeStaffOrAdmin,
  employeeTimesheetValidation,
  handleValidationErrors,
  timesheetController.getEmployeeTimesheetDetails
);

// 8. Approve Weekly Timesheet
// POST /api/admin/timesheets/{timesheet_id}/approve
router.post('/admin/timesheets/:timesheet_id/approve',
  authenticate,
  authorizeStaffOrAdmin,
  approvalValidation,
  handleValidationErrors,
  timesheetController.approveTimesheet
);

// 9. Reject Weekly Timesheet
// POST /api/admin/timesheets/{timesheet_id}/reject
router.post('/admin/timesheets/:timesheet_id/reject',
  authenticate,
  authorizeStaffOrAdmin,
  rejectionValidation,
  handleValidationErrors,
  timesheetController.rejectTimesheet
);

// 10. Admin Edit Timesheet Entry
// PUT /api/admin/timesheets/entries/{entry_id}
router.put('/admin/timesheets/entries/:entry_id',
  authenticate,
  authorizeStaffOrAdmin,
  updateTimesheetValidation,
  handleValidationErrors,
  timesheetController.updateTimesheetEntryAdmin
);

// 11. Export Timesheets to CSV
// GET /api/admin/timesheets/export?format=csv&week_start=2024-01-15&week_end=2024-01-29&status=approved
router.get('/admin/timesheets/export',
  authenticate,
  authorizeStaffOrAdmin,
  exportValidation,
  handleValidationErrors,
  timesheetController.exportTimesheets
);

// 12. Get Client Signature for Timesheet Entry
// GET /api/admin/timesheets/entries/{entry_id}/client-signature
router.get('/admin/timesheets/entries/:entry_id/client-signature',
  authenticate,
  authorizeStaffOrAdmin,
  entryIdValidation,
  handleValidationErrors,
  timesheetController.getClientSignature
);

// 13. Get Client Signature Image (for direct image display)
// GET /api/admin/timesheets/entries/{entry_id}/client-signature-image
router.get('/admin/timesheets/entries/:entry_id/client-signature-image',
  authenticate,
  authorizeStaffOrAdmin,
  entryIdValidation,
  handleValidationErrors,
  timesheetController.getClientSignatureImage
);

// ================== ADDITIONAL HELPER ROUTES ==================

// Get timesheet statistics (bonus endpoint)
router.get('/admin/timesheets/stats',
  authenticate,
  authorizeStaffOrAdmin,
  async (req, res) => {
    try {
      const { pool: db } = require('../config/db');
      
      // Get basic statistics
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN Status = 'draft' THEN 1 END) as draft_entries,
          COUNT(CASE WHEN Status = 'submitted' THEN 1 END) as submitted_entries,
          COUNT(CASE WHEN Status = 'approved' THEN 1 END) as approved_entries,
          COUNT(CASE WHEN Status = 'rejected' THEN 1 END) as rejected_entries,
          SUM(CASE WHEN Status = 'approved' THEN CAST(Hours AS DECIMAL(10,2)) ELSE 0 END) as total_approved_hours,
          COUNT(DISTINCT Userid) as active_employees
        FROM Staffshifts 
        WHERE Deletedat IS NULL 
          AND DATE(Signintime) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `);

      res.json({
        data: {
          period: 'Last 30 days',
          statistics: stats[0]
        }
      });
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch statistics', error: err.message });
    }
  }
);

// Health check endpoint for timesheet system
router.get('/health',
  (req, res) => {
    res.json({
      status: 'healthy',
      service: 'timesheet-api',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }
);

module.exports = router; 