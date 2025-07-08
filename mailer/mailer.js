// mailer/mailer.js
// Utility for sending emails using Gmail SMTP (Google Workspace)
const nodemailer = require('nodemailer');
const { logger } = require('../middleware/requestLogger');

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
  logger.info(`Email sent`, {
    to: mailOptions.to,
    subject: mailOptions.subject,
    timestamp: new Date().toISOString(),
    action: 'send_email'
  });
  return transporter.sendMail(mailOptions);
}

module.exports = { sendMail };
