// mailer/mailer.js
// Utility for sending emails using Gmail SMTP (Google Workspace)
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER, // Your Gmail address
    pass: process.env.SMTP_PASS  // App password (not your real password!)
  }
});

/**
 * Send an email
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise}
 */
function sendMail(options) {
  const mailOptions = {
    from: `GConsole HRM Notifications <${process.env.SMTP_USER}>`,
    ...options
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendMail };
