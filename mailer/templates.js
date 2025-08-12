// mailer/templates.js
// Email templates for shift notifications

function shiftAcceptedClient({ clientName, locationName, shiftDate, employeeName, startTime, endTime }) {
  // Add fallback values for null/undefined data
  const safeClientName = clientName || 'Valued Client';
  const safeLocationName = locationName || 'Location TBD';
  const safeShiftDate = shiftDate || 'Date TBD';
  const safeEmployeeName = employeeName || 'An Employee';
  const safeStartTime = startTime || 'Time TBD';
  const safeEndTime = endTime || 'Time TBD';
  
  return {
    subject: `Shift Accepted Notification: ${safeShiftDate}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #1976d2; text-align: center;">📩 Shift Accepted</h2>

        <p style="font-size: 16px;">Dear <strong>${safeClientName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          Your shift at <strong>${safeLocationName}</strong> on <strong>${safeShiftDate}</strong> has been 
          <span style="color: #388e3c; font-weight: bold;">accepted</span> by <strong>${safeEmployeeName}</strong>.
        </p>

        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${safeLocationName}</strong></p>

          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${safeShiftDate}</p>

          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${safeStartTime} - ${safeEndTime}</p>
        </div>

        <p style="font-size: 15px;">
          You will receive another notification once the shift is approved by an administrator.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

function shiftApprovedEmployee({ employeeName, clientName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Shift Approved: ${shiftDate} at ${locationName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #388e3c; text-align: center;">✅ Shift Approved</h2>

        <p style="font-size: 16px;">Dear <strong>${employeeName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          Your shift at <strong>${locationName}</strong> for <strong>${clientName}</strong> on <strong>${shiftDate}</strong> has been 
          <span style="color: #388e3c; font-weight: bold;">approved</span>.
        </p>

        <div style="background-color: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>

          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${shiftDate}</p>

          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${startTime} - ${endTime}</p>
        </div>

        <p style="font-size: 15px;">Please attend as scheduled. If you have any questions, contact your supervisor.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}


function shiftApprovedClient({ clientName, employeeName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Employee Assigned: ${employeeName} for ${shiftDate}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #388e3c; text-align: center;">✅ Employee Assigned</h2>
        
        <p style="font-size: 16px;">Dear <strong>${clientName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          <strong>${employeeName}</strong> has been 
          <span style="color: #388e3c; font-weight: bold;">approved</span> for your shift at 
          <strong>${locationName}</strong> on <strong>${shiftDate}</strong>.
        </p>

        <div style="background-color: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>
          
          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${shiftDate}</p>
          
          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${startTime} - ${endTime}</p>
        </div>

        <p style="font-size: 15px;">If you have any questions, please contact your account manager.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;"/>

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

function shiftRejectedEmployee({ employeeName, clientName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Shift Cancelled: ${shiftDate} at ${locationName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #d32f2f; text-align: center;">❌ Shift Cancelled</h2>
        
        <p style="font-size: 16px;">Dear <strong>${employeeName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          Unfortunately, your shift at <strong>${locationName}</strong> for <strong>${clientName}</strong> on <strong>${shiftDate}</strong> has been 
          <span style="color: #d32f2f; font-weight: bold;">cancelled</span> by the administrator.
        </p>

        <div style="background-color: #fff4f4; border: 1px solid #f8d7da; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>
          
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${shiftDate}</p>
          
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${startTime} - ${endTime}</p>
        </div>

        <p style="font-size: 15px;">If you have questions, please contact your supervisor directly.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;"/>

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}


function shiftNewEmployee({ employeeName, locationName, clientName, shiftDate, startTime, endTime, qualificationNames }) {
  // Use formatted date only (no time) for subject and body date
  // Remove formatDateTimeForEmail and use raw values in all templates
  // For example, in shiftNewEmployee:
  // subject: `New Shift Available: ${locationName} on ${shiftDate}`,
  // ...
  // <strong>${shiftDate}</strong>
  // ...
  // <p>${startTime} - ${endTime}</p>
  const dateOnly = shiftDate.replace(/,? \d{1,2}:\d{2} (am|pm)/i, '');
  return {
    subject: `New Shift Available: ${locationName} on ${dateOnly}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #1976d2; text-align: center;">📢 New Shift Available</h2>
        
        <p style="font-size: 16px;">Dear <strong>${employeeName || 'Employee'}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          A new shift has been created at <strong>${locationName}</strong> for <strong>${clientName}</strong> on <strong>${dateOnly}</strong>.
        </p>

        <div style="background-color: #f4f6f8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>
          
          <p style="font-size: 18px; margin: 0;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${dateOnly}</p>
          
          <p style="font-size: 18px; margin: 0;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${startTime} - ${endTime}</p>
        </div>

        <p style="font-size: 15px;"><strong>Required Qualifications:</strong> ${(qualificationNames || []).join(', ')}</p>

        <p style="font-size: 15px;">Please log in to your portal to view and accept the shift if you are available.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;"/>

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}


function shiftUpdatedEmployee({ employeeName, clientName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Shift Updated: ${shiftDate} at ${locationName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #1976d2; text-align: center;">✏️ Shift Updated</h2>
        <p style="font-size: 16px;">Dear <strong>${employeeName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          Your shift at <strong>${locationName}</strong> for <strong>${clientName}</strong> on <strong>${shiftDate}</strong> has been 
          <span style="color: #1976d2; font-weight: bold;">updated</span>.
        </p>
        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>
          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${shiftDate}</p>
          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${startTime} - ${endTime}</p>
        </div>
        <p style="font-size: 15px;">Please review the updated details and attend as scheduled. If you have any questions, contact your supervisor.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

function shiftRemovedEmployee({ employeeName, clientName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Shift Removal Notice: ${shiftDate} at ${locationName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #d32f2f; text-align: center;">❗ Shift Assignment Removed</h2>
        <p style="font-size: 16px;">Dear <strong>${employeeName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          You have been <span style="color: #d32f2f; font-weight: bold;">removed</span> from your shift at <strong>${locationName}</strong> for <strong>${clientName}</strong> on <strong>${shiftDate}</strong>.
        </p>
        <div style="background-color: #fff4f4; border: 1px solid #f8d7da; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${shiftDate}</p>
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${startTime} - ${endTime}</p>
        </div>
        <p style="font-size: 15px;">If you have questions, please contact your supervisor or HR representative.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

/**
 * Contact Admin Notification (to admin)
 * @param {Object} param0
 * @param {string} param0.email - Sender's email
 * @param {string} param0.subject - Subject from user
 * @param {string} param0.message - Message body
 * @param {string} [param0.source] - Source of the request (optional)
 */
function contactAdminNotification({ email, subject, message, source }) {
  return {
    subject: `[Contact Form] ${subject}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <div style="text-align:center; margin-bottom: 20px;">
          <span style="display:inline-block; font-size:2rem; font-weight:bold; line-height:1;">
            <svg width="110" height="36" viewBox="0 0 110 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;">
              <defs>
                <linearGradient id="shiftly-gradient" x1="0" y1="0" x2="110" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#2563eb"/>
                  <stop offset="1" stop-color="#14b8a6"/>
                </linearGradient>
              </defs>
              <text x="0" y="28" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="bold" fill="url(#shiftly-gradient)">Shiftly</text>
            </svg>
          </span>
        </div>
        <h2 style="color: #1976d2; text-align: center;">New Contact Form Submission</h2>
        <p style="font-size: 15px;">You have received a new message from the contact form.</p>
        <div style="background: #f4f6f8; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p><strong>From:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <pre style="background: #fff; border: 1px solid #eee; border-radius: 4px; padding: 12px; font-size: 15px; white-space: pre-wrap;">${message}</pre>
          ${source ? `<p style='color:#888; font-size:13px;'><strong>Source:</strong> ${source}</p>` : ''}
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

/**
 * Contact Admin Confirmation (to user)
 * @param {Object} param0
 * @param {string} param0.email - Sender's email
 * @param {string} param0.subject - Subject from user
 */
function contactAdminConfirmation({ email, subject }) {
  return {
    subject: `We have received your message – Shiftly Support`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <div style="text-align:center; margin-bottom: 20px;">
          <span style="display:inline-block; font-size:2rem; font-weight:bold; line-height:1;">
            <svg width="110" height="36" viewBox="0 0 110 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;">
              <defs>
                <linearGradient id="shiftly-gradient" x1="0" y1="0" x2="110" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#2563eb"/>
                  <stop offset="1" stop-color="#14b8a6"/>
                </linearGradient>
              </defs>
              <text x="0" y="28" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="bold" fill="url(#shiftly-gradient)">Shiftly</text>
            </svg>
          </span>
        </div>
        <h2 style="color: #14b8a6; text-align: center;">Thank You for Contacting Shiftly Support</h2>
        <p style="font-size: 15px;">Dear ${email},</p>
        <p style="font-size: 15px; line-height: 1.6;">We have received your message regarding: <strong>${subject}</strong></p>
        <p style="font-size: 15px;">Our support team has received your request and will get back to you as soon as possible. If your inquiry is urgent, please reply to this email or contact us at <a href='mailto:admin@ygit.tech'>admin@ygit.tech</a>.</p>
        <div style="background: #f4f6f8; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="font-size: 14px; color: #1976d2; margin: 0;">This is a confirmation that your message has been received by our team.</p>
        </div>
        <p style="font-size: 15px;">Thank you for reaching out to Shiftly.<br/>Best regards,<br/>The Shiftly Support Team</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

/**
 * Timesheet Submission Notification (to admin/staff)
 * @param {Object} param0
 * @param {string} param0.employeeName - Employee who submitted timesheet
 * @param {string} param0.employeeEmail - Employee's email
 * @param {string} param0.weekStartDate - Week start date (YYYY-MM-DD)
 * @param {string} param0.weekEndDate - Week end date (YYYY-MM-DD)
 * @param {number} param0.totalHours - Total hours for the week
 * @param {number} param0.totalEntries - Number of entries submitted
 * @param {string} param0.submittedAt - Submission timestamp
 */
function timesheetSubmissionNotification({ employeeName, employeeEmail, weekStartDate, weekEndDate, totalHours, totalEntries, submittedAt }) {
  return {
    subject: `📋 Timesheet Submitted: ${employeeName} (Week ${weekStartDate})`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #ff9800; text-align: center;">📋 Timesheet Submitted for Review</h2>
        
        <p style="font-size: 16px;">Dear Admin/Staff,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          <strong>${employeeName}</strong> (${employeeEmail}) has submitted their timesheet for review.
        </p>

        <div style="background-color: #fff8e1; border: 1px solid #ffcc02; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #ff8f00; margin: 0 0 15px 0; text-align: center;">Timesheet Summary</h3>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">👤 Employee:</span>
            <span>${employeeName}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">📧 Email:</span>
            <span>${employeeEmail}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">📅 Week Period:</span>
            <span>${weekStartDate} to ${weekEndDate}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">⏱️ Total Hours:</span>
            <span style="color: #ff8f00; font-weight: bold;">${totalHours} hours</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">📝 Total Entries:</span>
            <span>${totalEntries} entries</span>
          </div>
          
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: bold;">🕐 Submitted At:</span>
            <span>${submittedAt}</span>
          </div>
        </div>

        <div style="background-color: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #1976d2; font-weight: bold;">📎 Attachment Included</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;">The detailed timesheet CSV file is attached to this email for your review.</p>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <p style="font-size: 15px; margin-bottom: 10px;">Please review and take action:</p>
          <div style="display: inline-block;">
            <span style="display: inline-block; background: #4caf50; color: white; padding: 8px 16px; border-radius: 4px; margin: 0 5px; font-size: 14px;">✅ Approve</span>
            <span style="display: inline-block; background: #f44336; color: white; padding: 8px 16px; border-radius: 4px; margin: 0 5px; font-size: 14px;">❌ Reject</span>
          </div>
        </div>

        <p style="font-size: 14px; color: #666; line-height: 1.6;">
          <strong>Next Steps:</strong><br/>
          • Review the attached CSV file for detailed timesheet entries<br/>
          • Log in to the admin portal to approve or reject the timesheet<br/>
          • Employee will be notified of your decision automatically
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

/**
 * Timesheet Submission Confirmation (to employee)
 * @param {Object} param0
 * @param {string} param0.employeeName - Employee who submitted timesheet
 * @param {string} param0.weekStartDate - Week start date (YYYY-MM-DD)
 * @param {string} param0.weekEndDate - Week end date (YYYY-MM-DD)
 * @param {number} param0.totalHours - Total hours for the week
 * @param {number} param0.totalEntries - Number of entries submitted
 * @param {string} param0.submittedAt - Submission timestamp
 */
function timesheetSubmissionConfirmation({ employeeName, weekStartDate, weekEndDate, totalHours, totalEntries, submittedAt }) {
  return {
    subject: `✅ Timesheet Submitted Successfully - Week ${weekStartDate}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #4caf50; text-align: center;">✅ Timesheet Submitted Successfully</h2>
        
        <p style="font-size: 16px;">Dear <strong>${employeeName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          Your timesheet has been <strong>successfully submitted</strong> and is now awaiting review by the admin team.
        </p>

        <div style="background-color: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #2e7d32; margin: 0 0 15px 0; text-align: center;">📊 Your Submission Summary</h3>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">📅 Week Period:</span>
            <span>${weekStartDate} to ${weekEndDate}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">⏱️ Total Hours:</span>
            <span style="color: #2e7d32; font-weight: bold;">${totalHours} hours</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: bold;">📝 Total Entries:</span>
            <span>${totalEntries} entries</span>
          </div>
          
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: bold;">🕐 Submitted At:</span>
            <span>${submittedAt}</span>
          </div>
        </div>

        <div style="background-color: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #1976d2; font-weight: bold;">📎 Your Timesheet Copy Attached</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;">A copy of your submitted timesheet is attached for your records. The same file has been sent to the admin team for review.</p>
        </div>

        <div style="background-color: #fff3c4; border: 1px solid #ff9800; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #ff8f00;">🔄 What happens next?</h4>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>Your timesheet is now under review by the admin team</li>
            <li>You will receive an email notification once it's approved or if changes are needed</li>
            <li>Status: <strong style="color: #ff8f00;">Submitted - Awaiting Review</strong></li>
          </ul>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <p style="font-size: 15px; margin-bottom: 10px;">📋 Need to make changes?</p>
          <p style="font-size: 14px; color: #666;">If your timesheet is rejected, you'll be able to edit and resubmit it. No action is needed from you at this time.</p>
        </div>

        <p style="font-size: 15px; line-height: 1.6;">
          Thank you for submitting your timesheet on time. If you have any questions, please contact your supervisor.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated confirmation from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

/**
 * Admin/Staff Email Template
 * @param {Object} param0
 * @param {string} param0.subject - Email subject
 * @param {string} param0.message - Email body content
 * @param {string} param0.senderName - Name of the person sending the email
 * @param {string} param0.senderEmail - Email of the person sending the email
 * @param {string} param0.recipientName - Name of the recipient (optional)
 * @param {string} param0.recipientEmail - Email of the recipient
 * @param {string} param0.sentAt - Timestamp when email was sent
 */
function adminStaffEmail({ subject, message, senderName, senderEmail, recipientName, recipientEmail, sentAt }) {
  return {
    subject: subject,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <div style="text-align:center; margin-bottom: 20px;">
          <span style="display:inline-block; font-size:2rem; font-weight:bold; line-height:1;">
            <svg width="110" height="36" viewBox="0 0 110 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;">
              <defs>
                <linearGradient id="shiftly-gradient" x1="0" y1="0" x2="110" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#2563eb"/>
                  <stop offset="1" stop-color="#14b8a6"/>
                </linearGradient>
              </defs>
              <text x="0" y="28" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="bold" fill="url(#shiftly-gradient)">Shiftly</text>
            </svg>
          </span>
        </div>
        
        <h2 style="color: #1976d2; text-align: center;">📧 Message from ${senderName}</h2>
        
        <div style="background-color: #f4f6f8; border: 1px solid #e0e6ed; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="margin-bottom: 15px;">
            <p style="margin: 0; font-size: 14px; color: #666;"><strong>From:</strong> ${senderName} (${senderEmail})</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;"><strong>To:</strong> ${recipientName ? `${recipientName} ` : ''}(${recipientEmail})</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;"><strong>Sent:</strong> ${sentAt}</p>
          </div>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e0e6ed; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin: 0 0 15px 0;">Message Content</h3>
          <div style="font-size: 15px; line-height: 1.6; color: #333; white-space: pre-wrap;">${message}</div>
        </div>

        <div style="background-color: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #1976d2; font-weight: bold;">📧 This email was sent via Shiftly</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Sent by ${senderName}</p>
        </div>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

function shiftNewClientToAdminStaff({ clientName, clientContactEmail, locationName, shiftDate, startTime, endTime, qualificationNames, totalRequiredStaff }) {
  return {
    subject: `New Shift Request Created by Client: ${clientName} - ${shiftDate}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #ff6f00; text-align: center;">🆕 New Shift Request from Client</h2>

        <p style="font-size: 16px;">Dear Admin/Staff,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          A new shift request has been created by client <strong>${clientName}</strong> 
          (${clientContactEmail}) and requires your attention.
        </p>

        <div style="background-color: #fff3e0; border: 1px solid #ffb74d; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #ef6c00; margin-top: 0; text-align: center;">📋 Shift Details</h3>
          
          <div style="display: grid; gap: 10px;">
            <p style="margin: 5px 0;"><strong>🏢 Client:</strong> ${clientName}</p>
            <p style="margin: 5px 0;"><strong>📧 Contact:</strong> ${clientContactEmail}</p>
            <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${locationName}</p>
            <p style="margin: 5px 0;"><strong>🗓️ Date:</strong> ${shiftDate}</p>
            <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${startTime} - ${endTime}</p>
            <p style="margin: 5px 0;"><strong>👥 Staff Required:</strong> ${totalRequiredStaff}</p>
            <p style="margin: 5px 0;"><strong>🎯 Qualifications:</strong> ${qualificationNames.join(', ')}</p>
          </div>
        </div>

        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="font-size: 14px; margin: 0; color: #1565c0; text-align: center;">
            <strong>📢 Action Required</strong><br>
            This shift request has been automatically processed and qualified employees have been notified. 
            Please monitor employee applications and approvals through the admin dashboard.
          </p>
        </div>

        <p style="font-size: 15px;">
          You can manage this shift request through the Shiftly admin panel.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>Shiftly</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

module.exports = {
  shiftAcceptedClient,
  shiftApprovedEmployee,
  shiftApprovedClient,
  shiftRejectedEmployee,
  shiftNewEmployee,
  shiftUpdatedEmployee,
  shiftRemovedEmployee,
  contactAdminNotification,
  contactAdminConfirmation,
  timesheetSubmissionNotification,
  timesheetSubmissionConfirmation,
  adminStaffEmail,
  shiftNewClientToAdminStaff
};
