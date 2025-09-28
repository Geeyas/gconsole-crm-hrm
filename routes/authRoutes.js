// ...existing code...
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { 
  createShiftValidation, 
  registerValidation, 
  loginValidation, 
  passwordUpdateValidation, 
  profileUpdateValidation,
  idParamValidation,
  handleValidationErrors 
} = require('../middleware/validation');
const { linkClientUserValidation } = require('../middleware/validationLinkClientUser');
const { handlePDFUpload, handleMultiplePDFUploads } = require('../middleware/pdfUpload'); // Import PDF upload middleware

const {
  authenticate,
  authorizeManager,
  authorizeClient,
  authorizeStaffOrAdmin,
  authorizeAdmin,
  authorizeClientOrStaffOrAdmin
} = require('../middleware/authMiddleware');

// Sanity check for middleware imports
[
  ['authenticate', authenticate],
  ['authorizeManager', authorizeManager],
  ['authorizeClient', authorizeClient],
  ['authorizeStaffOrAdmin', authorizeStaffOrAdmin],
  ['authorizeAdmin', authorizeAdmin]
].forEach(([name, fn]) => {
  if (typeof fn !== 'function') {
    console.error(`FATAL: Middleware '${name}' is not a function. Check your import/export in authMiddleware.js.`);
    throw new Error(`FATAL: Middleware '${name}' is not a function. Check your import/export in authMiddleware.js.`);
  }
});

// Custom middleware to allow Employee, Staff, or System Admin to accept shifts
function authorizeEmployeeOrStaffOrAdmin(req, res, next) {
  const type = req.user?.usertype;
  if (type === 'Employee - Standard User' || type === 'Staff - Standard User' || type === 'System Admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Only employees, staff, or admin can accept shifts.' });
}

// Custom middleware to allow Staff, Client, or System Admin to assign employees to shifts
function authorizeStaffClientOrAdmin(req, res, next) {
  const type = req.user?.usertype;
  if (type === 'Staff - Standard User' || type === 'System Admin' || type === 'Client - Standard User') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Only staff, client, or admin can assign employees.' });
}

router.post('/login', loginValidation, handleValidationErrors, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/register', authenticate, registerValidation, handleValidationErrors, authController.register);
router.post('/clientshiftrequests', 
  authenticate, 
  authorizeClientOrStaffOrAdmin, 
  handleMultiplePDFUploads, // Support multiple PDF attachments on shift creation
  createShiftValidation, 
  handleValidationErrors, 
  authController.createClientShiftRequest
);
// Edit a client shift request
router.put('/clientshiftrequests/:id', authenticate, (req, res, next) => {
  // Only creator or staff/admin can edit; logic enforced in controller
  return authController.updateClientShiftRequest(req, res, next);
});
// Delete (soft-delete) a client shift request
router.delete('/clientshiftrequests/:id', authenticate, (req, res, next) => {
  // Only creator or staff/admin can delete; logic enforced in controller
  return authController.deleteClientShiftRequest(req, res, next);
});
// Remove a qualification from an employee (self or staff/admin)
router.delete('/people/:id/qualifications/:qualificationId', authenticate, (req, res, next) => {
  // Only self or staff/admin can remove; logic enforced in controller
  return authController.removeQualificationFromEmployee(req, res, next);
});

// Route to link a client user to a location
router.post('/link-client-user-location', authenticate, authorizeStaffOrAdmin, linkClientUserValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  return authController.linkClientUserToLocation(req, res, next);
});

// Get registration details for a staff qualification (self or staff/admin)
router.get(
  '/people/:id/qualifications/:qualificationId/registration-details',
  authenticate,
  authController.getStaffQualificationRegistrationDetails
);

// Staff/Admin: Link a client user to a specific location (by email and locationid)
router.post('/link-client-user-specific-location', authenticate, authorizeStaffOrAdmin, (req, res, next) => {
  // Optionally, add validation here if needed
  return authController.linkClientUserToSpecificLocationByEmail(req, res, next);
});

// Staff/Admin: Unlink a client user from a specific location (by email and locationid)
router.post('/unlink-client-user-specific-location', authenticate, authorizeStaffOrAdmin, (req, res, next) => {
  // Optionally, add validation here if needed
  return authController.unlinkClientUserFromSpecificLocationByEmail(req, res, next);
});

// Client: View only their assigned locations
router.get('/my-client-locations', authenticate, authController.getMyClientLocations);

// Get People info for the logged-in user (from JWT)
router.get('/people/me', authenticate, authController.getMyPeopleInfo);

router.put('/update-password', authenticate, passwordUpdateValidation, handleValidationErrors, authController.updatePassword);


// Add qualification to an employee (self or staff/admin)

// Set registration details for a staff qualification (self or staff/admin)
router.put(
  '/people/:id/qualifications/:qualificationId/registration-details',
  authenticate,
  authController.setStaffQualificationRegistrationDetails
);

router.post('/people/:id/qualifications', authenticate, authController.addQualificationToEmployee);

// Get all qualifications assigned to a person (People.ID)
router.get('/people/:id/qualifications', authenticate, authController.getQualificationsForEmployee);

router.put('/people/:id', authenticate, idParamValidation, profileUpdateValidation, handleValidationErrors, authController.updateUserProfile);


router.get('/user/:id/usertype', authController.getUsertypeByPersonId);
router.get('/tables', authController.getAllTables);

// Staff: View available client shifts
// Allow all authenticated users to access available-client-shifts, controller will handle role-based logic
router.get('/available-client-shifts', authenticate, authController.getAvailableClientShifts);

// Alternative route for clientshiftrequests (GET) - redirects to available-client-shifts
router.get('/clientshiftrequests', authenticate, authController.getAvailableClientShifts);

// Simple compatibility endpoint that returns just the array
router.get('/clientshiftrequests-simple', authenticate, (req, res) => {
  authController.getAvailableClientShifts(req, res).then(() => {
    // If the response was successful, modify it to return just the array
    if (res.statusCode === 200 && res.locals && res.locals.data) {
      const data = res.locals.data;
      res.json(data.availableShifts || []); // Return just the array
    }
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// Staff: Accept a client staff shift
router.post('/clientstaffshifts/:id/accept', authenticate, authorizeEmployeeOrStaffOrAdmin, authController.acceptClientStaffShift);

// Staff or Admin: Approve a client staff shift
router.post('/clientstaffshifts/:id/approve', authenticate, authorizeStaffOrAdmin, authController.approveClientStaffShift);

// Staff or Admin: Reject a client staff shift
router.post('/clientstaffshifts/:id/reject', authenticate, authorizeStaffOrAdmin, authController.rejectClientStaffShift);

// Assign employee to staff shift slot by email (admin/staff/client only)
router.post('/clientstaffshifts/:id/assign-employee', authenticate, authorizeStaffClientOrAdmin, authController.assignEmployeeToStaffShift);

// Remove employee from a staff shift slot (Staff, Client, or Admin)
// router.post('/clientstaffshifts/:id/remove-employee', authenticate, authorizeStaffClientOrAdmin, authController.removeEmployeeFromStaffShift);
router.post('/clientstaffshifts/:id/remove-employee', authenticate, authController.removeEmployeeFromStaffShift);

// Staff/Admin: Get all clients and their linked locations
router.get('/all-client-locations', authenticate, authorizeStaffOrAdmin, authController.getAllClientLocations); // Changed to use authController prefix

// Admin staff: Get all client locations linked to a client user by email address
router.get('/client-user-locations', authenticate, authorizeStaffOrAdmin, authController.getClientUserLocationsByEmail);

// Admin staff: Unlink a client user from a client by email and clientid
router.post('/unlink-client-user', authenticate, authorizeStaffOrAdmin, authController.unlinkClientUserFromClient);

// Soft-delete a person (People table) by setting deletedat and deletedbyid
router.delete('/People/:id', authenticate, authController.softDeletePerson);

// Route to get shifts for the logged-in employee
router.get('/my-shifts', authenticate, authController.getMyShifts);

// Route to get shifts for the logged-in employee WITH attachment information
router.get('/my-shifts-with-attachments', authenticate, authController.getMyShiftsWithAttachments);

// Route to get qualifications for the logged-in employee
router.get('/my-qualifications', authenticate, authController.getMyQualifications);

// ================== PDF Attachment Management Routes ==================
// View/download PDF attachment for a shift request (only assigned employees can access)
router.get('/clientshiftrequests/:id/attachment', authenticate, authController.getShiftRequestAttachment);

// Create/Add PDF attachment for a shift request (only creator or staff/admin)
router.post('/clientshiftrequests/:id/attachment', 
  authenticate, 
  handlePDFUpload, 
  authController.updateShiftRequestAttachment
);

// Replace PDF attachment for a shift request (only creator or staff/admin)
router.put('/clientshiftrequests/:id/attachment', 
  authenticate, 
  handlePDFUpload, 
  authController.updateShiftRequestAttachment
);

// Delete PDF attachment for a shift request (only creator or staff/admin)
router.delete('/clientshiftrequests/:id/attachment', authenticate, authController.deleteShiftRequestAttachment);

// Get attachment info for a shift request (metadata only)
router.get('/clientshiftrequests/:id/attachment/info', authenticate, authController.getShiftRequestAttachmentInfo);

// ================== Multiple PDF Attachments Management Routes ==================
// Add multiple PDF attachments to a shift request
router.post('/clientshiftrequests/:id/attachments', 
  authenticate, 
  handleMultiplePDFUploads, 
  authController.addMultipleShiftAttachments
);

// Get all PDF attachments for a shift request
router.get('/clientshiftrequests/:id/attachments', authenticate, authController.getAllShiftAttachments);

// Download a specific PDF attachment
router.get('/clientshiftrequests/:id/attachments/:attachmentId/download', authenticate, authController.downloadShiftAttachment);

// Alternative download route (for frontend compatibility)
router.get('/clientshiftrequests/attachments/:attachmentId/download', authenticate, (req, res, next) => {
  // Extract attachmentId and find the shift ID from database
  return authController.downloadShiftAttachment(req, res, next);
});

// Delete a specific PDF attachment
router.delete('/clientshiftrequests/:id/attachments/:attachmentId', authenticate, authController.deleteShiftAttachment);
// ================== End Multiple PDF Attachments Management Routes ==================

// ================== End PDF Attachment Management Routes ==================

module.exports = router;

