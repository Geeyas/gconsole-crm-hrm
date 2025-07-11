// mailer/templates.js
// Email templates for shift notifications

function formatDateTimeForEmail(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  // If the time is exactly midnight (00:00:00), show only the date.
  if (
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0
  ) {
    // Format: Fri, 27 Jun 2025
    return d.toLocaleDateString('en-AU', {
      weekday: 'short', year: 'numeric', month: 'short', day: '2-digit', timeZone: 'Australia/Perth'
    });
  }
  // Otherwise, show date and time
  return d.toLocaleString('en-AU', {
    weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Australia/Perth'
  });
}

function shiftAcceptedClient({ clientName, locationName, shiftDate, employeeName, startTime, endTime }) {
  return {
    subject: `Shift Accepted Notification: ${formatDateTimeForEmail(shiftDate)}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #1976d2; text-align: center;">📩 Shift Accepted</h2>

        <p style="font-size: 16px;">Dear <strong>${clientName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          Your shift at <strong>${locationName}</strong> on <strong>${formatDateTimeForEmail(shiftDate)}</strong> has been 
          <span style="color: #388e3c; font-weight: bold;">accepted</span> by <strong>${employeeName}</strong>.
        </p>

        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>

          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${formatDateTimeForEmail(shiftDate)}</p>

          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}</p>
        </div>

        <p style="font-size: 15px;">
          You will receive another notification once the shift is approved by an administrator.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>GConsole HRM</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

function shiftApprovedEmployee({ employeeName, clientName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Shift Approved: ${formatDateTimeForEmail(shiftDate)} at ${locationName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #388e3c; text-align: center;">✅ Shift Approved</h2>

        <p style="font-size: 16px;">Dear <strong>${employeeName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          Your shift at <strong>${locationName}</strong> for <strong>${clientName}</strong> on <strong>${formatDateTimeForEmail(shiftDate)}</strong> has been 
          <span style="color: #388e3c; font-weight: bold;">approved</span>.
        </p>

        <div style="background-color: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>

          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${formatDateTimeForEmail(shiftDate)}</p>

          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}</p>
        </div>

        <p style="font-size: 15px;">Please attend as scheduled. If you have any questions, contact your supervisor.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>GConsole HRM</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}


function shiftApprovedClient({ clientName, employeeName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Employee Assigned: ${employeeName} for ${formatDateTimeForEmail(shiftDate)}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #388e3c; text-align: center;">✅ Employee Assigned</h2>
        
        <p style="font-size: 16px;">Dear <strong>${clientName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          <strong>${employeeName}</strong> has been 
          <span style="color: #388e3c; font-weight: bold;">approved</span> for your shift at 
          <strong>${locationName}</strong> on <strong>${formatDateTimeForEmail(shiftDate)}</strong>.
        </p>

        <div style="background-color: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>
          
          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${formatDateTimeForEmail(shiftDate)}</p>
          
          <p style="font-size: 18px; margin: 0; color: #2e7d32;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}</p>
        </div>

        <p style="font-size: 15px;">If you have any questions, please contact your account manager.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;"/>

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>GConsole HRM</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

function shiftRejectedEmployee({ employeeName, clientName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Shift Cancelled: ${formatDateTimeForEmail(shiftDate)} at ${locationName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #d32f2f; text-align: center;">❌ Shift Cancelled</h2>
        
        <p style="font-size: 16px;">Dear <strong>${employeeName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          Unfortunately, your shift at <strong>${locationName}</strong> for <strong>${clientName}</strong> on <strong>${formatDateTimeForEmail(shiftDate)}</strong> has been 
          <span style="color: #d32f2f; font-weight: bold;">cancelled</span> by the administrator.
        </p>

        <div style="background-color: #fff4f4; border: 1px solid #f8d7da; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>
          
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${formatDateTimeForEmail(shiftDate)}</p>
          
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}</p>
        </div>

        <p style="font-size: 15px;">If you have questions, please contact your supervisor directly.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;"/>

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>GConsole HRM</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}


function shiftNewEmployee({ employeeName, locationName, clientName, shiftDate, startTime, endTime, qualificationNames }) {
  // Use formatted date only (no time) for subject and body date
  const formattedDate = formatDateTimeForEmail(shiftDate);
  // Remove time if present in formattedDate (e.g., 'Fri, 11 Jul 2025, 12:00 am' -> 'Fri, 11 Jul 2025')
  const dateOnly = formattedDate.replace(/,? \d{1,2}:\d{2} (am|pm)/i, '');
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
          <p style="font-size: 16px; margin: 5px 0;">${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}</p>
        </div>

        <p style="font-size: 15px;"><strong>Required Qualifications:</strong> ${(qualificationNames || []).join(', ')}</p>

        <p style="font-size: 15px;">Please log in to your portal to view and accept the shift if you are available.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;"/>

        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>GConsole HRM</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}


function shiftUpdatedEmployee({ employeeName, clientName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Shift Updated: ${formatDateTimeForEmail(shiftDate)} at ${locationName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #1976d2; text-align: center;">✏️ Shift Updated</h2>
        <p style="font-size: 16px;">Dear <strong>${employeeName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          Your shift at <strong>${locationName}</strong> for <strong>${clientName}</strong> on <strong>${formatDateTimeForEmail(shiftDate)}</strong> has been 
          <span style="color: #1976d2; font-weight: bold;">updated</span>.
        </p>
        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>
          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${formatDateTimeForEmail(shiftDate)}</p>
          <p style="font-size: 18px; margin: 0; color: #1565c0;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}</p>
        </div>
        <p style="font-size: 15px;">Please review the updated details and attend as scheduled. If you have any questions, contact your supervisor.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>GConsole HRM</strong>. Please do not reply to this email.
        </p>
      </div>
    `
  };
}

function shiftRemovedEmployee({ employeeName, clientName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Shift Removal Notice: ${formatDateTimeForEmail(shiftDate)} at ${locationName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto;">
        <h2 style="color: #d32f2f; text-align: center;">❗ Shift Assignment Removed</h2>
        <p style="font-size: 16px;">Dear <strong>${employeeName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          You have been <span style="color: #d32f2f; font-weight: bold;">removed</span> from your shift at <strong>${locationName}</strong> for <strong>${clientName}</strong> on <strong>${formatDateTimeForEmail(shiftDate)}</strong>.
        </p>
        <div style="background-color: #fff4f4; border: 1px solid #f8d7da; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>📍 Location</strong></p>
          <p style="font-size: 20px; margin: 5px 0 15px;"><strong>${locationName}</strong></p>
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>🗓️ Date</strong></p>
          <p style="font-size: 16px; margin: 5px 0 15px;">${formatDateTimeForEmail(shiftDate)}</p>
          <p style="font-size: 18px; margin: 0; color: #b71c1c;"><strong>⏰ Time</strong></p>
          <p style="font-size: 16px; margin: 5px 0;">${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}</p>
        </div>
        <p style="font-size: 15px;">If you have questions, please contact your supervisor or HR representative.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message from <strong>GConsole HRM</strong>. Please do not reply to this email.
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
    subject: `We have received your message – Shiftly Support` ,
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

module.exports = {
  shiftAcceptedClient,
  shiftApprovedEmployee,
  shiftApprovedClient,
  shiftRejectedEmployee,
  formatDateTimeForEmail,
  shiftNewEmployee,
  shiftUpdatedEmployee,
  shiftRemovedEmployee,
  contactAdminNotification,
  contactAdminConfirmation
};
