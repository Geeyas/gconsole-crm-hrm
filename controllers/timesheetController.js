const { pool: db } = require('../config/db');
const winston = require('winston');
const { 
  toUTC, 
  formatForMySQL, 
  utcToMelbourneForAPI, 
  formatDate, 
  formatDateTime,
  utcToMelbourne
} = require('../utils/timezoneUtils');
const { sendMail } = require('../mailer/mailer');
const { timesheetSubmissionNotification, timesheetSubmissionConfirmation } = require('../mailer/templates');

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

// Helper function to calculate duration in hours
function calculateDurationHours(signintime, signouttime, breakMinutes) {
  if (!signintime || !signouttime) return 0;
  
  const start = new Date(signintime);
  const end = new Date(signouttime);
  const diffMs = end - start;
  const diffHours = diffMs / (1000 * 60 * 60);
  const breakHours = (parseInt(breakMinutes) || 0) / 60;
  
  return Math.max(0, diffHours - breakHours);
}

// Helper function to format timesheet entry for API response
function formatTimesheetEntry(staffshift) {
  const signinDate = new Date(staffshift.Signintime);
  const signoutDate = new Date(staffshift.Signouttime);
  
  // Convert BLOB to base64 if signature exists
  let signatureBase64 = null;
  if (staffshift.Clientpersonalsignature) {
    try {
      // Convert Buffer to base64 string
      signatureBase64 = staffshift.Clientpersonalsignature.toString('base64');
    } catch (err) {
      logger.error('Error converting signature BLOB to base64 in formatTimesheetEntry', { 
        error: err, 
        entryId: staffshift.ID 
      });
      signatureBase64 = null;
    }
  }
  
  return {
    id: staffshift.ID,
    employee_id: staffshift.Userid,
    date: formatDate(staffshift.Signintime),
    location_name: staffshift.Signinlocation || '',
    start_time: signinDate.toTimeString().substring(0, 5), // HH:MM format
    end_time: signoutDate.toTimeString().substring(0, 5), // HH:MM format
    break_time_minutes: parseInt(staffshift.Break) || 0,
    duration_hours: parseFloat(staffshift.Hours) || calculateDurationHours(
      staffshift.Signintime, 
      staffshift.Signouttime, 
      staffshift.Break
    ),
    notes: staffshift.Shiftnotes || '',
    status: staffshift.Status || 'draft',
    created_at: staffshift.Createdat,
    updated_at: staffshift.Updatedat,
    submitted_at: staffshift.Submitted_at,
    reviewed_at: staffshift.Reviewed_at,
    reviewed_by: staffshift.Reviewed_by,
    // Client information
    client_name: staffshift.Clientpersonalname || '',
    client_signature: signatureBase64, // Return actual base64 signature data
    client_signature_date: staffshift.Clientpersonalsignaturedate || null,
    client_notes: staffshift.Clientpersonalshiftnotes || ''
  };
}

// Helper function to get week start date (Monday)
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Helper function to get week end date (Sunday)
function getWeekEndDate(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}

// ================== EMPLOYEE TIMESHEET APIs ==================

// 1. Get Employee's Timesheet for a Week
exports.getMyWeekTimesheet = async (req, res) => {
  const userId = req.user?.id;
  const weekStartParam = req.query.week_start;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
  }

  try {
    // Determine week start date
    const weekStart = weekStartParam ? new Date(weekStartParam) : getWeekStartDate(new Date());
    const weekEnd = getWeekEndDate(weekStart);
    
    // Format dates for SQL
    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(weekEnd);

    // Get timesheet entries for the week
    const [entries] = await db.query(`
      SELECT * FROM Staffshifts 
      WHERE Userid = ? 
        AND DATE(Signintime) BETWEEN ? AND ?
        AND Deletedat IS NULL
      ORDER BY Signintime ASC
    `, [userId, weekStartStr, weekEndStr]);

    // Calculate total hours
    const totalHours = entries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.Hours) || calculateDurationHours(entry.Signintime, entry.Signouttime, entry.Break));
    }, 0);

    // Determine overall status (if any entry is submitted/approved, show that status)
    let overallStatus = 'draft';
    if (entries.some(e => e.Status === 'approved')) {
      overallStatus = 'approved';
    } else if (entries.some(e => e.Status === 'submitted')) {
      overallStatus = 'submitted';
    } else if (entries.some(e => e.Status === 'rejected')) {
      overallStatus = 'rejected';
    }

    const response = {
      data: {
        week_start_date: weekStartStr,
        week_end_date: weekEndStr,
        total_hours: parseFloat(totalHours.toFixed(2)),
        status: overallStatus,
        entries: entries.map(formatTimesheetEntry)
      }
    };

    res.status(200).json(response);

  } catch (err) {
    logger.error('Get weekly timesheet error', { error: err, userId });
    res.status(500).json({ message: 'Failed to fetch weekly timesheet', error: err.message });
  }
};

// 2. Create New Timesheet Entry
exports.createTimesheetEntry = async (req, res) => {
  const userId = req.user?.id;
  const { 
    date, 
    location_name, 
    start_time, 
    end_time, 
    break_time_minutes, 
    notes,
    client_name,
    client_signature,
    client_signature_date,
    client_notes
  } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
  }

  // Validation
  if (!date || !start_time || !end_time) {
    return res.status(400).json({ message: 'Date, start_time, and end_time are required' });
  }

  try {
    // Combine date and time for database storage
    const signintime = `${date} ${start_time}:00`;
    const signouttime = `${date} ${end_time}:00`;
    
    // Validate end time is after start time
    if (new Date(signouttime) <= new Date(signintime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Check for overlapping shifts on the same date
    const [existing] = await db.query(`
      SELECT ID FROM Staffshifts 
      WHERE Userid = ? 
        AND DATE(Signintime) = ?
        AND Deletedat IS NULL
        AND (
          (? BETWEEN Signintime AND Signouttime) OR
          (? BETWEEN Signintime AND Signouttime) OR
          (Signintime BETWEEN ? AND ?)
        )
    `, [userId, date, signintime, signouttime, signintime, signouttime]);

    if (existing.length > 0) {
      return res.status(409).json({ 
        message: 'Overlapping shift detected',
        code: 'OVERLAPPING_SHIFT' 
      });
    }

    // Calculate hours
    const breakMins = parseInt(break_time_minutes) || 0;
    const duration = calculateDurationHours(signintime, signouttime, breakMins);
    
    // Validate maximum daily hours (16 hours)
    if (duration > 16) {
      return res.status(400).json({ 
        message: 'Maximum 16 hours per shift allowed',
        code: 'VALIDATION_ERROR' 
      });
    }

    const now = new Date();

    // Insert timesheet entry with FK checks temporarily disabled
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    const [result] = await db.query(`
      INSERT INTO Staffshifts (
        Userid, Clientshiftrequestid, Clientstaffshiftid, Signintime, Signouttime, Break, Signinlocation, 
        Shiftnotes, Hours, Status, Createdat, Createdbyid, 
        Updatedat, Updatedbyid, Sysstarttime,
        Clientpersonalname, Clientpersonalsignature, Clientpersonalsignaturedate, Clientpersonalshiftnotes
      ) VALUES (?, 1, 147, ?, ?, ?, ?, ?, ?, 'draft', NOW(), ?, NOW(), ?, NOW(), ?, ?, ?, ?)
    `, [
      userId, signintime, signouttime, breakMins.toString(), 
      location_name || '', notes || '', duration.toFixed(2), 
      userId, userId,
      client_name || null, client_signature || null, client_signature_date || null, client_notes || null
    ]);
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    // Fetch the created entry
    const [createdEntry] = await db.query(`
      SELECT * FROM Staffshifts WHERE ID = ?
    `, [result.insertId]);

    res.status(201).json({
      data: formatTimesheetEntry(createdEntry[0])
    });

  } catch (err) {
    logger.error('Create timesheet entry error', { error: err, userId });
    res.status(500).json({ message: 'Failed to create timesheet entry', error: err.message });
  }
};

// 3. Update Timesheet Entry
exports.updateTimesheetEntry = async (req, res) => {
  const userId = req.user?.id;
  const entryId = parseInt(req.params.entry_id);
  const { 
    location_name, 
    start_time, 
    end_time, 
    break_time_minutes, 
    notes,
    client_name,
    client_signature,
    client_signature_date,
    client_notes
  } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
  }

  try {
    // Check if entry exists and belongs to user
    const [existing] = await db.query(`
      SELECT * FROM Staffshifts 
      WHERE ID = ? AND Userid = ? AND Deletedat IS NULL
    `, [entryId, userId]);

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Timesheet entry not found' });
    }

    const entry = existing[0];

    // Check if entry can be edited (draft and rejected entries can be edited)
    if (!['draft', 'rejected'].includes(entry.Status)) {
      logger.warn('User attempted to edit non-editable timesheet entry', {
        userId,
        entryId,
        currentStatus: entry.Status,
        requestedChanges: { location_name, start_time, end_time, break_time_minutes, notes: notes ? '[PROVIDED]' : undefined }
      });
      return res.status(409).json({ 
        message: 'Cannot edit approved or submitted timesheet entries',
        code: 'TIMESHEET_ALREADY_PROCESSED' 
      });
    }

    // Log if editing a rejected entry
    if (entry.Status === 'rejected') {
      logger.info('User editing rejected timesheet entry', {
        userId,
        entryId,
        previousStatus: entry.Status,
        requestedChanges: { location_name, start_time, end_time, break_time_minutes, notes: notes ? '[PROVIDED]' : undefined }
      });
    }

    // Prepare update data
    const updateData = {};
    const updateFields = [];
    const updateValues = [];

    // Build dynamic update query
    if (location_name !== undefined) {
      updateFields.push('Signinlocation = ?');
      updateValues.push(location_name);
    }

    if (start_time !== undefined || end_time !== undefined) {
      const date = formatDate(entry.Signintime);
      const newStartTime = start_time || entry.Signintime.toTimeString().substring(0, 5);
      const newEndTime = end_time || entry.Signouttime.toTimeString().substring(0, 5);
      
      const newSignintime = `${date} ${newStartTime}:00`;
      const newSignouttime = `${date} ${newEndTime}:00`;
      
      // Validate times
      if (new Date(newSignouttime) <= new Date(newSignintime)) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }

      updateFields.push('Signintime = ?', 'Signouttime = ?');
      updateValues.push(newSignintime, newSignouttime);

      // Recalculate hours
      const breakMins = break_time_minutes !== undefined ? parseInt(break_time_minutes) : parseInt(entry.Break) || 0;
      const duration = calculateDurationHours(newSignintime, newSignouttime, breakMins);
      
      updateFields.push('Hours = ?');
      updateValues.push(duration.toFixed(2));
    }

    if (break_time_minutes !== undefined) {
      updateFields.push('Break = ?');
      updateValues.push(break_time_minutes.toString());
      
      // Recalculate hours if break time changed
      if (!start_time && !end_time) {
        const duration = calculateDurationHours(entry.Signintime, entry.Signouttime, break_time_minutes);
        updateFields.push('Hours = ?');
        updateValues.push(duration.toFixed(2));
      }
    }

    if (notes !== undefined) {
      updateFields.push('Shiftnotes = ?');
      updateValues.push(notes);
    }

    // Client fields
    if (client_name !== undefined) {
      updateFields.push('Clientpersonalname = ?');
      updateValues.push(client_name);
    }

    if (client_signature !== undefined) {
      updateFields.push('Clientpersonalsignature = ?');
      updateValues.push(client_signature);
    }

    if (client_signature_date !== undefined) {
      updateFields.push('Clientpersonalsignaturedate = ?');
      updateValues.push(client_signature_date);
    }

    if (client_notes !== undefined) {
      updateFields.push('Clientpersonalshiftnotes = ?');
      updateValues.push(client_notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Add update timestamp and user
    updateFields.push('Updatedat = NOW()', 'Updatedbyid = ?');
    updateValues.push(userId);

    // If entry was rejected, reset status to draft so it can be resubmitted
    if (entry.Status === 'rejected') {
      updateFields.push('Status = ?');
      updateValues.push('draft');
    }

    // Perform update
    await db.query(`
      UPDATE Staffshifts SET ${updateFields.join(', ')} 
      WHERE ID = ? AND Userid = ?
    `, [...updateValues, entryId, userId]);

    // Fetch updated entry
    const [updatedEntry] = await db.query(`
      SELECT * FROM Staffshifts WHERE ID = ?
    `, [entryId]);

    res.status(200).json({
      data: formatTimesheetEntry(updatedEntry[0])
    });

  } catch (err) {
    logger.error('Update timesheet entry error', { error: err, userId, entryId });
    res.status(500).json({ message: 'Failed to update timesheet entry', error: err.message });
  }
};

// 4. Delete Timesheet Entry
exports.deleteTimesheetEntry = async (req, res) => {
  const userId = req.user?.id;
  const entryId = parseInt(req.params.entry_id);

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
  }

  try {
    // Check if entry exists and belongs to user
    const [existing] = await db.query(`
      SELECT Status FROM Staffshifts 
      WHERE ID = ? AND Userid = ? AND Deletedat IS NULL
    `, [entryId, userId]);

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Timesheet entry not found' });
    }

    // Check if entry can be deleted (draft and rejected entries can be deleted)
    if (!['draft', 'rejected'].includes(existing[0].Status)) {
      logger.warn('User attempted to delete non-deletable timesheet entry', {
        userId,
        entryId,
        currentStatus: existing[0].Status
      });
      return res.status(409).json({ 
        message: 'Cannot delete approved or submitted timesheet entries',
        code: 'TIMESHEET_ALREADY_PROCESSED' 
      });
    }

    // Log if deleting a rejected entry
    if (existing[0].Status === 'rejected') {
      logger.info('User deleting rejected timesheet entry', {
        userId,
        entryId,
        previousStatus: existing[0].Status
      });
    }

    // Soft delete
    await db.query(`
      UPDATE Staffshifts 
      SET Deletedat = NOW(), Deletedbyid = ?, Updatedat = NOW(), Updatedbyid = ?
      WHERE ID = ? AND Userid = ?
    `, [userId, userId, entryId, userId]);

    res.status(200).json({ message: 'Timesheet entry deleted successfully' });

  } catch (err) {
    logger.error('Delete timesheet entry error', { error: err, userId, entryId });
    res.status(500).json({ message: 'Failed to delete timesheet entry', error: err.message });
  }
};

// 5. Submit Weekly Timesheet
exports.submitWeeklyTimesheet = async (req, res) => {
  const userId = req.user?.id;
  const { week_start_date } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
  }

  if (!week_start_date) {
    return res.status(400).json({ message: 'week_start_date is required' });
  }

  try {
    const weekStart = new Date(week_start_date);
    const weekEnd = getWeekEndDate(weekStart);
    
    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(weekEnd);

    // Get all draft entries for the week
    const [entries] = await db.query(`
      SELECT * FROM Staffshifts 
      WHERE Userid = ? 
        AND DATE(Signintime) BETWEEN ? AND ?
        AND Status = 'draft'
        AND Deletedat IS NULL
    `, [userId, weekStartStr, weekEndStr]);

    if (entries.length === 0) {
      return res.status(400).json({ 
        message: 'No draft timesheet entries found for this week',
        code: 'NO_ENTRIES_TO_SUBMIT' 
      });
    }

    // Update all entries to submitted
    await db.query(`
      UPDATE Staffshifts 
      SET Status = 'submitted', Submitted_at = NOW(), Updatedat = NOW(), Updatedbyid = ?
      WHERE Userid = ? 
        AND DATE(Signintime) BETWEEN ? AND ?
        AND Status = 'draft'
        AND Deletedat IS NULL
    `, [userId, userId, weekStartStr, weekEndStr]);

    // Calculate total hours
    const totalHours = entries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.Hours) || calculateDurationHours(entry.Signintime, entry.Signouttime, entry.Break));
    }, 0);

    // Get employee information for email notification
    const [employeeInfo] = await db.query(`
      SELECT u.email, u.fullname, p.Firstname, p.Lastname
      FROM Users u
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE u.id = ?
    `, [userId]);

    const employee = employeeInfo[0];
    const employeeName = `${employee.Firstname || ''} ${employee.Lastname || ''}`.trim() || employee.fullname || 'Unknown Employee';

    // Get updated entries with employee info for email
    const [updatedEntries] = await db.query(`
      SELECT s.*, u.email, u.fullname, p.Firstname, p.Lastname
      FROM Staffshifts s
      LEFT JOIN Users u ON s.Userid = u.id
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE s.Userid = ? 
        AND DATE(s.Signintime) BETWEEN ? AND ?
        AND s.Status = 'submitted'
        AND s.Deletedat IS NULL
      ORDER BY s.Signintime ASC
    `, [userId, weekStartStr, weekEndStr]);

    // Send email notification to admin/staff
    try {
      const employeeData = {
        name: employeeName,
        email: employee.email
      };

      const weekData = {
        weekStartDate: weekStartStr,
        weekEndDate: weekEndStr,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalEntries: entries.length
      };

      // Send notification asynchronously to avoid blocking the response
      sendTimesheetSubmissionNotification(employeeData, weekData, updatedEntries)
        .catch(err => logger.error('Failed to send timesheet notification email', { error: err }));
        
      logger.info('📋 Timesheet submitted for approval', {
        userId,
        employeeName,
        weekStart: weekStartStr,
        totalHours: totalHours.toFixed(2),
        totalEntries: entries.length
      });
    } catch (emailError) {
      // Don't fail the submission if email fails
      logger.error('Error triggering timesheet submission email', { error: emailError });
    }

    res.status(200).json({
      data: {
        week_start_date: weekStartStr,
        total_entries_submitted: entries.length,
        total_hours: parseFloat(totalHours.toFixed(2)),
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }
    });

  } catch (err) {
    logger.error('Submit weekly timesheet error', { error: err, userId });
    res.status(500).json({ message: 'Failed to submit weekly timesheet', error: err.message });
  }
};

// ================== ADMIN TIMESHEET APIs ==================

// 6. Get All Employee Timesheets (Admin/Staff)
exports.getAllTimesheets = async (req, res) => {
  const userType = req.user?.usertype;
  
  // Check admin/staff permissions
  if (!['Staff - Standard User', 'System Admin'].includes(userType)) {
    return res.status(403).json({ message: 'Access denied: Admin or staff only.' });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
    const offset = (page - 1) * limit;
    
    // Build WHERE conditions
    const conditions = ['s.Deletedat IS NULL'];
    const queryParams = [];

    if (req.query.status) {
      conditions.push('s.Status = ?');
      queryParams.push(req.query.status);
    }

    if (req.query.employee_id) {
      conditions.push('s.Userid = ?');
      queryParams.push(parseInt(req.query.employee_id));
    }

    if (req.query.week_start) {
      conditions.push('DATE(s.Signintime) >= ?');
      queryParams.push(req.query.week_start);
    }

    if (req.query.week_end) {
      conditions.push('DATE(s.Signintime) <= ?');
      queryParams.push(req.query.week_end);
    }

    if (req.query.search) {
      conditions.push('(p.Firstname LIKE ? OR p.Lastname LIKE ? OR u.email LIKE ?)');
      const searchTerm = `%${req.query.search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total 
      FROM Staffshifts s
      LEFT JOIN Users u ON s.Userid = u.id
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE ${whereClause}
    `, queryParams);

    const total = countResult[0].total;

    // Get paginated results with employee information
    const [timesheets] = await db.query(`
      SELECT 
        s.*, 
        u.id as user_id, u.email, u.fullname,
        p.Firstname, p.Lastname,
        reviewer.fullname as reviewer_name, reviewer.email as reviewer_email
      FROM Staffshifts s
      LEFT JOIN Users u ON s.Userid = u.id
      LEFT JOIN People p ON u.id = p.Linkeduserid
      LEFT JOIN Users reviewer ON s.Reviewed_by = reviewer.id
      WHERE ${whereClause}
      ORDER BY s.Signintime DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    // Group timesheets by employee and week
    const groupedTimesheets = {};
    
    timesheets.forEach(timesheet => {
      const weekStart = formatDate(getWeekStartDate(new Date(timesheet.Signintime)));
      const key = `${timesheet.Userid}_${weekStart}`;
      
      if (!groupedTimesheets[key]) {
        groupedTimesheets[key] = {
          id: key,
          employee: {
            id: timesheet.Userid,
            name: `${timesheet.Firstname || ''} ${timesheet.Lastname || ''}`.trim() || timesheet.fullname,
            email: timesheet.email
          },
          week_start_date: weekStart,
          week_end_date: formatDate(getWeekEndDate(new Date(weekStart))),
          total_hours: 0,
          total_entries: 0,
          status: timesheet.Status,
          submitted_at: timesheet.Submitted_at,
          entries: []
        };
      }

      const entry = formatTimesheetEntry(timesheet);
      groupedTimesheets[key].entries.push(entry);
      groupedTimesheets[key].total_hours += entry.duration_hours;
      groupedTimesheets[key].total_entries++;

      // Update overall status (prioritize submitted/approved over draft)
      if (['submitted', 'approved', 'rejected'].includes(timesheet.Status)) {
        groupedTimesheets[key].status = timesheet.Status;
      }
    });

    const response = {
      data: Object.values(groupedTimesheets),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    };

    res.status(200).json(response);

  } catch (err) {
    logger.error('Get all timesheets error', { error: err });
    res.status(500).json({ message: 'Failed to fetch timesheets', error: err.message });
  }
};

// 7. Get Specific Employee's Timesheet Details
exports.getEmployeeTimesheetDetails = async (req, res) => {
  const userType = req.user?.usertype;
  const employeeId = parseInt(req.params.employee_id);
  const weekStartDate = req.params.week_start_date;

  // Check admin/staff permissions
  if (!['Staff - Standard User', 'System Admin'].includes(userType)) {
    return res.status(403).json({ message: 'Access denied: Admin or staff only.' });
  }

  try {
    const weekStart = new Date(weekStartDate);
    const weekEnd = getWeekEndDate(weekStart);
    
    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(weekEnd);

    // Get timesheet entries for the employee and week
    const [entries] = await db.query(`
      SELECT s.*, u.email, u.fullname, p.Firstname, p.Lastname
      FROM Staffshifts s
      LEFT JOIN Users u ON s.Userid = u.id
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE s.Userid = ? 
        AND DATE(s.Signintime) BETWEEN ? AND ?
        AND s.Deletedat IS NULL
      ORDER BY s.Signintime ASC
    `, [employeeId, weekStartStr, weekEndStr]);

    if (entries.length === 0) {
      return res.status(404).json({ message: 'No timesheet entries found for this employee and week' });
    }

    // Calculate total hours
    const totalHours = entries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.Hours) || calculateDurationHours(entry.Signintime, entry.Signouttime, entry.Break));
    }, 0);

    // Determine overall status
    let overallStatus = 'draft';
    if (entries.some(e => e.Status === 'approved')) {
      overallStatus = 'approved';
    } else if (entries.some(e => e.Status === 'submitted')) {
      overallStatus = 'submitted';
    } else if (entries.some(e => e.Status === 'rejected')) {
      overallStatus = 'rejected';
    }

    const response = {
      data: {
        employee: {
          id: employeeId,
          name: `${entries[0].Firstname || ''} ${entries[0].Lastname || ''}`.trim() || entries[0].fullname,
          email: entries[0].email
        },
        week_start_date: weekStartStr,
        week_end_date: weekEndStr,
        total_hours: parseFloat(totalHours.toFixed(2)),
        status: overallStatus,
        entries: entries.map(formatTimesheetEntry)
      }
    };

    res.status(200).json(response);

  } catch (err) {
    logger.error('Get employee timesheet details error', { error: err, employeeId, weekStartDate });
    res.status(500).json({ message: 'Failed to fetch employee timesheet details', error: err.message });
  }
};

// 8. Approve Weekly Timesheet
exports.approveTimesheet = async (req, res) => {
  const userType = req.user?.usertype;
  const adminId = req.user?.id;
  const timesheetId = parseInt(req.params.timesheet_id);
  const { notes } = req.body;

  // Check admin/staff permissions
  if (!['Staff - Standard User', 'System Admin'].includes(userType)) {
    return res.status(403).json({ message: 'Access denied: Admin or staff only.' });
  }

  try {
    // Check if timesheet entry exists and is submitted
    const [existing] = await db.query(`
      SELECT s.*, u.email, u.fullname, p.Firstname, p.Lastname
      FROM Staffshifts s
      LEFT JOIN Users u ON s.Userid = u.id
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE s.ID = ? AND s.Deletedat IS NULL
    `, [timesheetId]);

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Timesheet entry not found' });
    }

    const timesheet = existing[0];

    if (timesheet.Status !== 'submitted') {
      return res.status(409).json({ 
        message: 'Can only approve submitted timesheets',
        code: 'INVALID_STATUS' 
      });
    }

    // Update timesheet to approved
    await db.query(`
      UPDATE Staffshifts 
      SET Status = 'approved', Reviewed_at = NOW(), Reviewed_by = ?, 
          Updatedat = NOW(), Updatedbyid = ?
      WHERE ID = ?
    `, [adminId, adminId, timesheetId]);

    // Get admin details for response
    const [adminDetails] = await db.query(`
      SELECT u.id, u.fullname, u.email, p.Firstname, p.Lastname
      FROM Users u
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE u.id = ?
    `, [adminId]);

    const admin = adminDetails[0];

    res.status(200).json({
      data: {
        id: timesheetId,
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: {
          id: admin.id,
          name: `${admin.Firstname || ''} ${admin.Lastname || ''}`.trim() || admin.fullname,
          email: admin.email
        },
        notes: notes || 'Approved'
      }
    });

  } catch (err) {
    logger.error('Approve timesheet error', { error: err, timesheetId, adminId });
    res.status(500).json({ message: 'Failed to approve timesheet', error: err.message });
  }
};

// 9. Reject Weekly Timesheet
exports.rejectTimesheet = async (req, res) => {
  const userType = req.user?.usertype;
  const adminId = req.user?.id;
  const timesheetId = parseInt(req.params.timesheet_id);
  const { reason, notes } = req.body;

  // Check admin/staff permissions
  if (!['Staff - Standard User', 'System Admin'].includes(userType)) {
    return res.status(403).json({ message: 'Access denied: Admin or staff only.' });
  }

  if (!reason) {
    return res.status(400).json({ message: 'Rejection reason is required' });
  }

  try {
    // Check if timesheet entry exists and is submitted
    const [existing] = await db.query(`
      SELECT s.*, u.email, u.fullname, p.Firstname, p.Lastname
      FROM Staffshifts s
      LEFT JOIN Users u ON s.Userid = u.id
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE s.ID = ? AND s.Deletedat IS NULL
    `, [timesheetId]);

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Timesheet entry not found' });
    }

    const timesheet = existing[0];

    if (timesheet.Status !== 'submitted') {
      return res.status(409).json({ 
        message: 'Can only reject submitted timesheets',
        code: 'INVALID_STATUS' 
      });
    }

    // Update timesheet to rejected
    await db.query(`
      UPDATE Staffshifts 
      SET Status = 'rejected', Reviewed_at = NOW(), Reviewed_by = ?, 
          Updatedat = NOW(), Updatedbyid = ?
      WHERE ID = ?
    `, [adminId, adminId, timesheetId]);

    // Get admin details for response
    const [adminDetails] = await db.query(`
      SELECT u.id, u.fullname, u.email, p.Firstname, p.Lastname
      FROM Users u
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE u.id = ?
    `, [adminId]);

    const admin = adminDetails[0];

    res.status(200).json({
      data: {
        id: timesheetId,
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: {
          id: admin.id,
          name: `${admin.Firstname || ''} ${admin.Lastname || ''}`.trim() || admin.fullname,
          email: admin.email
        },
        reason: reason,
        notes: notes || ''
      }
    });

  } catch (err) {
    logger.error('Reject timesheet error', { error: err, timesheetId, adminId });
    res.status(500).json({ message: 'Failed to reject timesheet', error: err.message });
  }
};

// 10. Admin Edit Timesheet Entry
exports.updateTimesheetEntryAdmin = async (req, res) => {
  const userType = req.user?.usertype;
  const adminId = req.user?.id;
  const adminEmail = req.user?.email;
  const entryId = parseInt(req.params.entry_id);
  const { 
    location_name, 
    start_time, 
    end_time, 
    break_time_minutes, 
    notes,
    client_name,
    client_signature,
    client_signature_date,
    client_notes
  } = req.body;

  // Check admin/staff permissions
  if (!['Staff - Standard User', 'System Admin'].includes(userType)) {
    logger.warn('Admin timesheet edit access denied', { adminId, adminEmail, userType, entryId });
    return res.status(403).json({ message: 'Access denied: Admin or staff only.' });
  }

  try {
    logger.info('Admin attempting to edit timesheet entry', { 
      adminId, 
      adminEmail, 
      entryId, 
      userType,
      changes: { location_name, start_time, end_time, break_time_minutes, notes: notes ? '[PROVIDED]' : undefined }
    });

    // Check if entry exists
    const [existing] = await db.query(`
      SELECT s.*, u.email, u.fullname, p.Firstname, p.Lastname
      FROM Staffshifts s
      LEFT JOIN Users u ON s.Userid = u.id
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE s.ID = ? AND s.Deletedat IS NULL
    `, [entryId]);

    if (existing.length === 0) {
      logger.warn('Admin tried to edit non-existent timesheet entry', { adminId, adminEmail, entryId });
      return res.status(404).json({ message: 'Timesheet entry not found' });
    }

    const entry = existing[0];

    // Check if entry can be edited (only draft and submitted entries)
    if (entry.Status === 'approved' || entry.Status === 'rejected') {
      return res.status(409).json({ 
        message: 'Cannot edit approved or rejected timesheet entries',
        code: 'TIMESHEET_ALREADY_PROCESSED' 
      });
    }

    // Prepare update data
    const updateData = {};
    const updateFields = [];
    const updateValues = [];

    // Build dynamic update query
    if (location_name !== undefined) {
      updateFields.push('Signinlocation = ?');
      updateValues.push(location_name);
    }

    if (start_time !== undefined || end_time !== undefined) {
      const date = formatDate(entry.Signintime);
      const newStartTime = start_time || entry.Signintime.toTimeString().substring(0, 5);
      const newEndTime = end_time || entry.Signouttime.toTimeString().substring(0, 5);
      
      const newSignintime = `${date} ${newStartTime}:00`;
      const newSignouttime = `${date} ${newEndTime}:00`;
      
      // Validate times
      if (new Date(newSignouttime) <= new Date(newSignintime)) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }

      updateFields.push('Signintime = ?', 'Signouttime = ?');
      updateValues.push(newSignintime, newSignouttime);

      // Recalculate hours
      const breakMins = break_time_minutes !== undefined ? parseInt(break_time_minutes) : parseInt(entry.Break) || 0;
      const duration = calculateDurationHours(newSignintime, newSignouttime, breakMins);
      
      updateFields.push('Hours = ?');
      updateValues.push(duration.toFixed(2));
    }

    if (break_time_minutes !== undefined) {
      updateFields.push('Break = ?');
      updateValues.push(break_time_minutes.toString());
      
      // Recalculate hours if break time changed
      if (!start_time && !end_time) {
        const duration = calculateDurationHours(entry.Signintime, entry.Signouttime, break_time_minutes);
        updateFields.push('Hours = ?');
        updateValues.push(duration.toFixed(2));
      }
    }

    if (notes !== undefined) {
      updateFields.push('Shiftnotes = ?');
      updateValues.push(notes);
    }

    // Client fields
    if (client_name !== undefined) {
      updateFields.push('Clientpersonalname = ?');
      updateValues.push(client_name);
    }

    if (client_signature !== undefined) {
      updateFields.push('Clientpersonalsignature = ?');
      updateValues.push(client_signature);
    }

    if (client_signature_date !== undefined) {
      updateFields.push('Clientpersonalsignaturedate = ?');
      updateValues.push(client_signature_date);
    }

    if (client_notes !== undefined) {
      updateFields.push('Clientpersonalshiftnotes = ?');
      updateValues.push(client_notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Add update timestamp and admin user
    updateFields.push('Updatedat = NOW()', 'Updatedbyid = ?');
    updateValues.push(adminId);

    // Perform update
    await db.query(`
      UPDATE Staffshifts SET ${updateFields.join(', ')} 
      WHERE ID = ?
    `, [...updateValues, entryId]);

    // Fetch updated entry
    const [updatedEntry] = await db.query(`
      SELECT s.*, u.email, u.fullname, p.Firstname, p.Lastname
      FROM Staffshifts s
      LEFT JOIN Users u ON s.Userid = u.id
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE s.ID = ?
    `, [entryId]);

    // Get admin details for response
    const [adminDetails] = await db.query(`
      SELECT u.id, u.fullname, u.email, p.Firstname, p.Lastname
      FROM Users u
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE u.id = ?
    `, [adminId]);

    const admin = adminDetails[0];

    logger.info('Admin successfully updated timesheet entry', { 
      adminId, 
      adminEmail, 
      entryId, 
      employeeId: entry.Userid,
      employeeName: `${entry.Firstname || ''} ${entry.Lastname || ''}`.trim() || entry.fullname,
      changes: { location_name, start_time, end_time, break_time_minutes, notes: notes ? '[PROVIDED]' : undefined }
    });

    res.status(200).json({
      data: {
        ...formatTimesheetEntry(updatedEntry[0]),
        updated_by: {
          id: admin.id,
          name: `${admin.Firstname || ''} ${admin.Lastname || ''}`.trim() || admin.fullname,
          email: admin.email
        }
      }
    });

  } catch (err) {
    logger.error('Admin update timesheet entry error', { 
      error: err, 
      entryId, 
      adminId, 
      adminEmail,
      stack: err.stack 
    });
    res.status(500).json({ message: 'Failed to update timesheet entry', error: err.message });
  }
};

// 12. Get Client Signature for Timesheet Entry
exports.getClientSignature = async (req, res) => {
  const userType = req.user?.usertype;
  const adminId = req.user?.id;
  const entryId = parseInt(req.params.entry_id);

  // Check admin/staff permissions
  if (!['Staff - Standard User', 'System Admin'].includes(userType)) {
    return res.status(403).json({ message: 'Access denied: Admin or staff only.' });
  }

  try {
    // Get client signature data
    const [entry] = await db.query(`
      SELECT 
        s.ID,
        s.Clientpersonalname,
        s.Clientpersonalsignature,
        s.Clientpersonalsignaturedate,
        s.Clientpersonalshiftnotes,
        u.email as employee_email,
        p.Firstname, p.Lastname
      FROM Staffshifts s
      LEFT JOIN Users u ON s.Userid = u.id
      LEFT JOIN People p ON u.id = p.Linkeduserid
      WHERE s.ID = ? AND s.Deletedat IS NULL
    `, [entryId]);

    if (entry.length === 0) {
      return res.status(404).json({ message: 'Timesheet entry not found' });
    }

    const timesheetEntry = entry[0];
    
    // Convert BLOB to base64 if signature exists
    let signatureBase64 = null;
    if (timesheetEntry.Clientpersonalsignature) {
      try {
        // Convert Buffer to base64 string
        signatureBase64 = timesheetEntry.Clientpersonalsignature.toString('base64');
      } catch (err) {
        logger.error('Error converting signature BLOB to base64', { error: err, entryId });
        signatureBase64 = null;
      }
    }

    res.status(200).json({
      data: {
        entry_id: timesheetEntry.ID,
        client_name: timesheetEntry.Clientpersonalname || '',
        client_signature: signatureBase64, // Return actual base64 signature data
        client_signature_date: timesheetEntry.Clientpersonalsignaturedate || null,
        client_notes: timesheetEntry.Clientpersonalshiftnotes || '',
        employee_name: `${timesheetEntry.Firstname || ''} ${timesheetEntry.Lastname || ''}`.trim() || 'Unknown Employee',
        employee_email: timesheetEntry.employee_email
      }
    });

  } catch (err) {
    logger.error('Get client signature error', { error: err, entryId, adminId });
    res.status(500).json({ message: 'Failed to get client signature', error: err.message });
  }
};

// 13. Get Client Signature Image (for direct image display)
exports.getClientSignatureImage = async (req, res) => {
  const userType = req.user?.usertype;
  const adminId = req.user?.id;
  const entryId = parseInt(req.params.entry_id);

  // Check admin/staff permissions
  if (!['Staff - Standard User', 'System Admin'].includes(userType)) {
    return res.status(403).json({ message: 'Access denied: Admin or staff only.' });
  }

  try {
    // Get client signature data
    const [entry] = await db.query(`
      SELECT s.Clientpersonalsignature
      FROM Staffshifts s
      WHERE s.ID = ? AND s.Deletedat IS NULL
    `, [entryId]);

    if (entry.length === 0) {
      return res.status(404).json({ message: 'Timesheet entry not found' });
    }

    const timesheetEntry = entry[0];
    
    if (!timesheetEntry.Clientpersonalsignature) {
      return res.status(404).json({ message: 'No signature found for this entry' });
    }

    // Set response headers for image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the BLOB data directly as image
    res.send(timesheetEntry.Clientpersonalsignature);

  } catch (err) {
    logger.error('Get client signature image error', { error: err, entryId, adminId });
    res.status(500).json({ message: 'Failed to get client signature image', error: err.message });
  }
};

// 11. Export Timesheets to CSV
exports.exportTimesheets = async (req, res) => {
  const userType = req.user?.usertype;

  // Check admin/staff permissions
  if (!['Staff - Standard User', 'System Admin'].includes(userType)) {
    return res.status(403).json({ message: 'Access denied: Admin or staff only.' });
  }

  try {
    // Build WHERE conditions for export
    const conditions = ['s.Deletedat IS NULL'];
    const queryParams = [];

    if (req.query.week_start) {
      conditions.push('DATE(s.Signintime) >= ?');
      queryParams.push(req.query.week_start);
    }

    if (req.query.week_end) {
      conditions.push('DATE(s.Signintime) <= ?');
      queryParams.push(req.query.week_end);
    }

    if (req.query.status) {
      conditions.push('s.Status = ?');
      queryParams.push(req.query.status);
    }

    const whereClause = conditions.join(' AND ');

    // Get timesheet data with employee information
    const [timesheets] = await db.query(`
      SELECT 
        s.*,
        u.email, u.fullname,
        p.Firstname, p.Lastname,
        reviewer.fullname as reviewer_name, reviewer.email as reviewer_email
      FROM Staffshifts s
      LEFT JOIN Users u ON s.Userid = u.id
      LEFT JOIN People p ON u.id = p.Linkeduserid
      LEFT JOIN Users reviewer ON s.Reviewed_by = reviewer.id
      WHERE ${whereClause}
      ORDER BY p.Lastname, p.Firstname, s.Signintime
    `, queryParams);

    // Generate CSV content
    const csvHeaders = [
      'Employee Name',
      'Employee Email', 
      'Week Start',
      'Date',
      'Location',
      'Start Time',
      'End Time',
      'Break Minutes',
      'Duration Hours',
      'Status',
      'Notes',
      'Submitted At',
      'Reviewed By',
      'Reviewed At'
    ];

    let csvContent = csvHeaders.join(',') + '\n';

    timesheets.forEach(timesheet => {
      const employeeName = `${timesheet.Firstname || ''} ${timesheet.Lastname || ''}`.trim() || timesheet.fullname;
      const weekStart = formatDate(getWeekStartDate(new Date(timesheet.Signintime)));
      const date = formatDate(timesheet.Signintime);
      const startTime = new Date(timesheet.Signintime).toTimeString().substring(0, 5);
      const endTime = new Date(timesheet.Signouttime).toTimeString().substring(0, 5);
      const duration = parseFloat(timesheet.Hours) || calculateDurationHours(timesheet.Signintime, timesheet.Signouttime, timesheet.Break);

      const row = [
        `"${employeeName}"`,
        `"${timesheet.email || ''}"`,
        `"${weekStart}"`,
        `"${date}"`,
        `"${timesheet.Signinlocation || ''}"`,
        `"${startTime}"`,
        `"${endTime}"`,
        `"${timesheet.Break || '0'}"`,
        `"${duration.toFixed(2)}"`,
        `"${timesheet.Status || 'draft'}"`,
        `"${(timesheet.Shiftnotes || '').replace(/"/g, '""')}"`,
        `"${timesheet.Submitted_at || ''}"`,
        `"${timesheet.reviewer_name || ''}"`,
        `"${timesheet.Reviewed_at || ''}"`
      ];

      csvContent += row.join(',') + '\n';
    });

    // Set headers for file download
    const filename = `timesheets_export_${new Date().toISOString().substring(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.status(200).send(csvContent);

  } catch (err) {
    logger.error('Export timesheets error', { error: err });
    res.status(500).json({ message: 'Failed to export timesheets', error: err.message });
  }
};

// Helper function to get all admin users for notification
async function getAdminUsers() {
  const [admins] = await db.query(`
    SELECT u.id, u.email, u.fullname, p.Firstname, p.Lastname, ut.Name as usertype_name
    FROM Users u
    LEFT JOIN People p ON u.id = p.Linkeduserid
    LEFT JOIN Assignedusertypes au ON au.Userid = u.id
    LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
    WHERE ut.Name IN ('System Admin', 'Staff - Standard User')
      AND u.email IS NOT NULL
      AND u.email != ''
      AND u.Deletedat IS NULL
  `);
  return admins;
}

// Helper function to generate CSV for timesheet submission notification
function generateTimesheetSubmissionCSV(timesheets) {
  const csvHeaders = [
    'Employee Name',
    'Employee Email', 
    'Week Start',
    'Date',
    'Location',
    'Start Time',
    'End Time',
    'Break Minutes',
    'Duration Hours',
    'Status',
    'Notes',
    'Submitted At',
    'Reviewed By',
    'Reviewed At'
  ];

  let csvContent = csvHeaders.join(',') + '\n';

  timesheets.forEach(timesheet => {
    const employeeName = `${timesheet.Firstname || ''} ${timesheet.Lastname || ''}`.trim() || timesheet.fullname;
    const weekStart = formatDate(getWeekStartDate(new Date(timesheet.Signintime)));
    const date = formatDate(timesheet.Signintime);
    const startTime = new Date(timesheet.Signintime).toTimeString().substring(0, 5);
    const endTime = new Date(timesheet.Signouttime).toTimeString().substring(0, 5);
    const duration = parseFloat(timesheet.Hours) || calculateDurationHours(timesheet.Signintime, timesheet.Signouttime, timesheet.Break);

    const row = [
      `"${employeeName}"`,
      `"${timesheet.email || ''}"`,
      `"${weekStart}"`,
      `"${date}"`,
      `"${timesheet.Signinlocation || ''}"`,
      `"${startTime}"`,
      `"${endTime}"`,
      `"${timesheet.Break || '0'}"`,
      `"${duration.toFixed(2)}"`,
      `"${timesheet.Status || 'draft'}"`,
      `"${(timesheet.Shiftnotes || '').replace(/"/g, '""')}"`,
      `"${timesheet.Submitted_at || ''}"`,
      `"${timesheet.reviewer_name || ''}"`,
      `"${timesheet.Reviewed_at || ''}"`
    ];

    csvContent += row.join(',') + '\n';
  });

  return csvContent;
}

// Function to send timesheet submission notification to all admins AND confirmation to employee
async function sendTimesheetSubmissionNotification(employeeData, weekData, timesheets) {
  try {
    const admins = await getAdminUsers();
    const csvContent = generateTimesheetSubmissionCSV(timesheets);
    const filename = `timesheet_${employeeData.name.replace(/\s+/g, '_')}_${weekData.weekStartDate}.csv`;
    const submittedAt = new Date().toLocaleString();

    // Prepare admin notification email template
    const adminEmailTemplate = timesheetSubmissionNotification({
      employeeName: employeeData.name,
      employeeEmail: employeeData.email,
      weekStartDate: weekData.weekStartDate,
      weekEndDate: weekData.weekEndDate,
      totalHours: weekData.totalHours,
      totalEntries: weekData.totalEntries,
      submittedAt: submittedAt
    });

    // Prepare employee confirmation email template
    const employeeEmailTemplate = timesheetSubmissionConfirmation({
      employeeName: employeeData.name,
      weekStartDate: weekData.weekStartDate,
      weekEndDate: weekData.weekEndDate,
      totalHours: weekData.totalHours,
      totalEntries: weekData.totalEntries,
      submittedAt: submittedAt
    });

    // Send to employee first (confirmation)
    try {
      await sendMail({
        to: employeeData.email,
        subject: employeeEmailTemplate.subject,
        html: employeeEmailTemplate.html,
        attachments: [
          {
            filename: filename,
            content: csvContent,
            contentType: 'text/csv'
          }
        ]
      });
      
      logger.info('✅ Timesheet submission confirmation sent to employee', { 
        employeeEmail: employeeData.email, 
        employeeName: employeeData.name,
        weekStart: weekData.weekStartDate
      });
    } catch (employeeEmailError) {
      logger.error('Failed to send confirmation email to employee', { 
        error: employeeEmailError,
        employeeEmail: employeeData.email 
      });
    }

    // Send to all admin users
    if (admins.length === 0) {
      logger.warn('No admin users found to send timesheet submission notification.');
    } else {
      for (const admin of admins) {
        try {
          await sendMail({
            to: admin.email,
            subject: adminEmailTemplate.subject,
            html: adminEmailTemplate.html,
            attachments: [
              {
                filename: filename,
                content: csvContent,
                contentType: 'text/csv'
              }
            ]
          });
          
          logger.info('📧 Timesheet submission notification sent to admin', { 
            adminEmail: admin.email, 
            employeeName: employeeData.name,
            weekStart: weekData.weekStartDate
          });
        } catch (adminEmailError) {
          logger.error('Failed to send notification email to admin', { 
            error: adminEmailError,
            adminEmail: admin.email 
          });
        }
      }
    }

  } catch (err) {
    logger.error('Error in timesheet submission notification process', { error: err });
  }
}



// Export all functions (they're already exported via exports.functionName above)
// No need for additional module.exports since we used exports.functionName = throughout the file 