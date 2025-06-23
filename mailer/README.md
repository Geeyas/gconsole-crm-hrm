# How to set up Gmail SMTP for GConsole HRM

## 1. Enable 2-Step Verification on your Google Workspace account
- Go to https://myaccount.google.com/security
- Turn on 2-Step Verification for your account (required for app passwords)

## 2. Create an App Password
- Go to https://myaccount.google.com/apppasswords
- Select 'Mail' as the app, and 'Other' for device (e.g., 'GConsole HRM')
- Google will generate a 16-character app password (looks like: abcd efgh ijkl mnop)
- Copy this password (you will use it as SMTP_PASS) - gxlu chxy aeew desd

## 3. Add these to your .env file (do NOT share your real password)

SMTP_USER=your_gsuite_email@yourcompany.com
SMTP_PASS=your_generated_app_password

## 4. Security
- Never use your real Gmail password in code or .env
- Never commit .env to version control

## 5. Usage
- The backend will send emails automatically when shifts are accepted/approved.
- Frontend does NOT need to trigger email notifications.

---

For more info: https://support.google.com/accounts/answer/185833
