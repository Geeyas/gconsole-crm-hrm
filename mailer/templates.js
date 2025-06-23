// mailer/templates.js
// Email templates for shift notifications

function formatDateTimeForEmail(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  // Format: Fri, 27 Jun 2025, 09:00 AM
  return d.toLocaleString('en-AU', {
    weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Australia/Perth'
  });
}

function shiftAcceptedClient({ clientName, locationName, shiftDate, employeeName, startTime, endTime }) {
  return {
    subject: `Shift Accepted Notification: ${formatDateTimeForEmail(shiftDate)}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2 style="color: #1976d2;">Shift Accepted</h2>
        <p>Dear <b>${clientName}</b>,</p>
        <p>Your shift at <b>${locationName}</b> on <b>${formatDateTimeForEmail(shiftDate)}</b> <br/>
        <b>Time:</b> ${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}<br/>
        has been <span style="color: #388e3c; font-weight: bold;">accepted</span> by <b>${employeeName}</b>.</p>
        <p>You will receive another notification once the shift is approved by an administrator.</p>
        <hr style="border:none; border-top:1px solid #eee; margin:24px 0;"/>
        <p style="font-size: 12px; color: #888;">This is an automated message from GConsole HRM. Please do not reply to this email.</p>
      </div>
    `
  };
}

function shiftApprovedEmployee({ employeeName, clientName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Shift Approved: ${formatDateTimeForEmail(shiftDate)} at ${locationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2 style="color: #388e3c;">Shift Approved</h2>
        <p>Dear <b>${employeeName}</b>,</p>
        <p>Your shift at <b>${locationName}</b> for <b>${clientName}</b> on <b>${formatDateTimeForEmail(shiftDate)}</b><br/>
        <b>Time:</b> ${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}<br/>
        has been <span style="color: #388e3c; font-weight: bold;">approved</span>.</p>
        <p>Please attend as scheduled. If you have any questions, contact your supervisor.</p>
        <hr style="border:none; border-top:1px solid #eee; margin:24px 0;"/>
        <p style="font-size: 12px; color: #888;">This is an automated message from GConsole HRM. Please do not reply to this email.</p>
      </div>
    `
  };
}

function shiftApprovedClient({ clientName, employeeName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Employee Assigned: ${employeeName} for ${formatDateTimeForEmail(shiftDate)}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2 style="color: #1976d2;">Employee Assigned</h2>
        <p>Dear <b>${clientName}</b>,</p>
        <p><b>${employeeName}</b> has been <span style="color: #388e3c; font-weight: bold;">approved</span> for your shift at <b>${locationName}</b> on <b>${formatDateTimeForEmail(shiftDate)}</b><br/>
        <b>Time:</b> ${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}<br/>
        </p>
        <p>If you have any questions, please contact your account manager.</p>
        <hr style="border:none; border-top:1px solid #eee; margin:24px 0;"/>
        <p style="font-size: 12px; color: #888;">This is an automated message from GConsole HRM. Please do not reply to this email.</p>
      </div>
    `
  };
}

function shiftRejectedEmployee({ employeeName, clientName, locationName, shiftDate, startTime, endTime }) {
  return {
    subject: `Shift Rejected: ${formatDateTimeForEmail(shiftDate)} at ${locationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2 style="color: #d32f2f;">Shift Rejected</h2>
        <p>Dear <b>${employeeName}</b>,</p>
        <p>Your shift at <b>${locationName}</b> for <b>${clientName}</b> on <b>${formatDateTimeForEmail(shiftDate)}</b><br/>
        <b>Time:</b> ${formatDateTimeForEmail(startTime)} - ${formatDateTimeForEmail(endTime)}<br/>
        has been <span style="color: #d32f2f; font-weight: bold;">rejected</span> by the administrator.</p>
        <p>If you have questions, please contact your supervisor.</p>
        <hr style="border:none; border-top:1px solid #eee; margin:24px 0;"/>
        <p style="font-size: 12px; color: #888;">This is an automated message from GConsole HRM. Please do not reply to this email.</p>
      </div>
    `
  };
}

module.exports = {
  shiftAcceptedClient,
  shiftApprovedEmployee,
  shiftApprovedClient,
  shiftRejectedEmployee,
  formatDateTimeForEmail
};
