// mailer/test-smtp.js
require('dotenv').config();
const { sendMail } = require('./mailer');

async function main() {
  try {
    await sendMail({
      to: process.env.SMTP_USER,
      subject: 'SMTP Test from Shiftly',
      text: 'This is a test email from your backend SMTP configuration. If you receive this, SMTP is working.'
    });
    console.log('Test email sent successfully!');
  } catch (err) {
    console.error('Failed to send test email:', err);
  }
}

main();
