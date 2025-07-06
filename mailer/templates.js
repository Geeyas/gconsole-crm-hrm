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

module.exports = {
  shiftAcceptedClient,
  shiftApprovedEmployee,
  shiftApprovedClient,
  shiftRejectedEmployee,
  formatDateTimeForEmail,
  shiftNewEmployee,
  shiftUpdatedEmployee,
  shiftRemovedEmployee
};
