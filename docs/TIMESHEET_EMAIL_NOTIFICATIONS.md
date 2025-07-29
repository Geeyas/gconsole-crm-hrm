# 📧 Timesheet Email Notifications

## 🎯 **Feature Overview**

When an employee submits their weekly timesheet, the system automatically sends:
1. **Admin Notification:** Email to all admin and staff users with CSV attachment
2. **Employee Confirmation:** Email to the submitting employee with CSV copy and confirmation details

## ✅ **What's Included**

### **Email Recipients:**
- **Admins:** All users with `usertype = 'System Admin'` or `'Staff - Standard User'`
- **Employee:** The person who submitted the timesheet
- Only users with valid email addresses

### **Email Content:**

#### **📧 Admin Notification Email:**
- **Subject:** `📋 Timesheet Submitted: [Employee Name] (Week [Start Date])`
- **Purpose:** Inform admins of pending timesheet review
- **Content:** Employee details, timesheet summary, action instructions
- **CSV attachment:** Complete timesheet data for review

#### **✅ Employee Confirmation Email:**
- **Subject:** `✅ Timesheet Submitted Successfully - Week [Start Date]`
- **Purpose:** Confirm successful submission and provide copy for records
- **Content:** Submission summary, next steps, status information
- **CSV attachment:** Copy of submitted timesheet for employee records

### **Email Template Features:**
- 📊 **Timesheet Summary Box** showing:
  - Employee name and email
  - Week period (Monday to Sunday)
  - Total hours worked
  - Number of entries submitted
  - Submission timestamp
- 🎨 **Professional styling** matching your existing email templates
- 📎 **CSV attachment indicator** 
- 📋 **Action buttons** (visual only - approve/reject actions)
- 📝 **Next steps instructions** for admins

## 🔧 **Technical Implementation**

### **Files Modified:**
1. **`mailer/templates.js`** - Added `timesheetSubmissionNotification` template
2. **`controllers/timesheetController.js`** - Added email notification logic

### **When Triggered:**
- Automatically triggered when employee calls `POST /api/timesheets/submit-week`
- Runs **after** timesheet submission is successful
- Runs **asynchronously** - won't block API response if email fails

### **Database Queries:**
```sql
-- Get admin users for notifications
SELECT u.id, u.email, u.fullname, p.Firstname, p.Lastname
FROM Users u
LEFT JOIN People p ON u.id = p.Linkeduserid
WHERE u.usertype IN ('System Admin', 'Staff - Standard User')
  AND u.email IS NOT NULL
  AND u.email != ''

-- Get employee info for email
SELECT u.email, u.fullname, p.Firstname, p.Lastname
FROM Users u
LEFT JOIN People p ON u.id = p.Linkeduserid
WHERE u.id = ?

-- Get submitted timesheet entries
SELECT s.*, u.email, u.fullname, p.Firstname, p.Lastname
FROM Staffshifts s
LEFT JOIN Users u ON s.Userid = u.id
LEFT JOIN People p ON u.id = p.Linkeduserid
WHERE s.Status = 'submitted' AND DATE(s.Signintime) BETWEEN ? AND ?
```

## 📋 **CSV Attachment Format**

The attached CSV file contains these columns:
- Employee Name
- Employee Email
- Week Start
- Date
- Location
- Start Time
- End Time
- Break Minutes
- Duration Hours
- Status
- Notes
- Submitted At
- Reviewed By
- Reviewed At

**Filename Format:** `timesheet_[Employee_Name]_[Week_Start_Date].csv`

## 🛠️ **Configuration Requirements**

### **Environment Variables:**
Make sure these are set in your `.env` file:
```env
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
```

### **Dependencies:**
- ✅ `nodemailer` (already configured)
- ✅ Email templates (already implemented)
- ✅ Database access (already configured)

## 🧪 **Testing the Feature**

### **1. Test Email Configuration:**
```javascript
// Test if emails can be sent
const { sendMail } = require('./mailer/mailer');

await sendMail({
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<p>Test message</p>'
});
```

### **2. Test Timesheet Submission:**
```bash
# 1. Login as employee
POST /api/login
{
  "username": "employee@company.com",
  "password": "password"
}

# 2. Create timesheet entries
POST /api/timesheets/entries
{
  "date": "2025-07-24",
  "location_name": "Test Location",
  "start_time": "09:00",
  "end_time": "17:00",
  "break_time_minutes": 60,
  "notes": "Test timesheet entry"
}

# 3. Submit weekly timesheet (this triggers the email)
POST /api/timesheets/submit-week
{
  "week_start_date": "2025-07-21"
}
```

### **3. Check Logs:**
Look for these log messages:
```
✅ Success: "📋 Timesheet submitted for approval"
✅ Success: "✅ Timesheet submission confirmation sent to employee"
✅ Success: "📧 Timesheet submission notification sent to admin"
❌ Error: "Failed to send confirmation email to employee"
❌ Error: "Failed to send notification email to admin"
❌ Error: "No admin users found to send timesheet submission notification"
```

## 📊 **Example Email Previews**

### **📧 Admin Notification Email:**

**Subject:** `📋 Timesheet Submitted: John Smith (Week 2025-07-21)`

**Email Content:**
```
📋 Timesheet Submitted for Review

Dear Admin/Staff,

John Smith (john.smith@company.com) has submitted their timesheet for review.

┌─────────────────────────────────────────┐
│            Timesheet Summary            │
├─────────────────────────────────────────┤
│ 👤 Employee: John Smith                 │
│ 📧 Email: john.smith@company.com        │
│ 📅 Week Period: 2025-07-21 to 2025-07-27│
│ ⏱️ Total Hours: 40.0 hours              │
│ 📝 Total Entries: 5 entries             │
│ 🕐 Submitted At: 7/25/2025, 3:45:30 PM  │
└─────────────────────────────────────────┘

📎 Attachment Included
The detailed timesheet CSV file is attached to this email for your review.

Please review and take action:
[✅ Approve] [❌ Reject]

Next Steps:
• Review the attached CSV file for detailed timesheet entries
• Log in to the admin portal to approve or reject the timesheet
• Employee will be notified of your decision automatically
```

**CSV Attachment:** `timesheet_John_Smith_2025-07-21.csv`

### **✅ Employee Confirmation Email:**

**Subject:** `✅ Timesheet Submitted Successfully - Week 2025-07-21`

**Email Content:**
```
✅ Timesheet Submitted Successfully

Dear John Smith,

Your timesheet has been successfully submitted and is now awaiting review by the admin team.

┌─────────────────────────────────────────┐
│         📊 Your Submission Summary      │
├─────────────────────────────────────────┤
│ 📅 Week Period: 2025-07-21 to 2025-07-27│
│ ⏱️ Total Hours: 40.0 hours              │
│ 📝 Total Entries: 5 entries             │
│ 🕐 Submitted At: 7/25/2025, 3:45:30 PM  │
└─────────────────────────────────────────┘

📎 Your Timesheet Copy Attached
A copy of your submitted timesheet is attached for your records. 
The same file has been sent to the admin team for review.

🔄 What happens next?
• Your timesheet is now under review by the admin team
• You will receive an email notification once it's approved or if changes are needed
• Status: Submitted - Awaiting Review

📋 Need to make changes?
If your timesheet is rejected, you'll be able to edit and resubmit it. 
No action is needed from you at this time.

Thank you for submitting your timesheet on time. 
If you have any questions, please contact your supervisor.
```

**CSV Attachment:** `timesheet_John_Smith_2025-07-21.csv` (same file as sent to admins)

## 🔍 **Troubleshooting**

### **No Emails Being Sent:**
1. ✅ Check SMTP configuration in `.env`
2. ✅ Verify admin users exist with valid emails
3. ✅ Check server logs for error messages
4. ✅ Test basic email functionality

### **Emails Sent But No CSV Attachment:**
1. ✅ Check timesheet entries exist and have 'submitted' status
2. ✅ Verify database query returns results
3. ✅ Check CSV generation function

### **Only Some Admins Receive Emails:**
1. ✅ Verify admin user types (`System Admin`, `Staff - Standard User`)
2. ✅ Check email addresses are not null/empty
3. ✅ Check for SMTP rate limiting

## 🚀 **Performance Considerations**

- ✅ **Asynchronous Processing:** Email sending doesn't block API response
- ✅ **Error Handling:** Email failures don't affect timesheet submission
- ✅ **Efficient Queries:** Optimized database queries
- ✅ **Logging:** Comprehensive logging for monitoring [[memory:2587015]]

## 🎉 **Feature Complete!**

This dual notification system provides:
- ✅ **Instant notifications** to all admin staff with CSV attachments
- ✅ **Employee confirmation emails** with personal copy of timesheet
- ✅ **Professional email templates** for both admin and employee communications
- ✅ **Complete transparency** - employees know their submission was successful
- ✅ **Record keeping** - employees have their own CSV copy
- ✅ **Robust error handling** with individual email failure logging
- ✅ **Zero impact** on API performance

**The timesheet submission workflow now includes automatic dual notifications - admin alerts AND employee confirmations with CSV attachments!** 📋✨📧 