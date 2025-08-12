# Email Template Analysis: "Shift Accepted" Notification

## 📧 **Template Identification**

**Template Name:** `shiftAcceptedClient`  
**File Location:** `mailer/templates.js` (lines 4-40)  
**Email Subject:** `Shift Accepted Notification: ${shiftDate}`

## 🔄 **When This Email is Triggered**

This email is sent **immediately** when an employee accepts a shift through the system. Specifically:

**API Endpoint:** `POST /api/clientstaffshifts/:id/accept`  
**Trigger Function:** `acceptClientStaffShift` in `controllers/authController.js`  
**User Action:** Employee clicks "Accept" on an available shift

## 👥 **Who Can Trigger This Email**

The email can be triggered by:
- **Employee - Standard User** (primary use case)
- **Staff - Standard User** (can accept on behalf of employee)
- **System Admin** (can accept on behalf of employee)

## 📨 **Who Receives This Email**

**Recipients:** All **Client users** associated with the shift's client company
- The email goes to all users with "Client - Standard User" type linked to the specific client
- Multiple client users can receive this notification for transparency

## 🔄 **Complete Workflow**

### **Step 1: Shift Creation**
```
1. Client/Staff/Admin creates a new shift request
2. System creates staff shift slots (Status = "open")
3. Qualified employees are notified of new shift availability
```

### **Step 2: Employee Accepts Shift** ⭐ **(THIS IS WHERE THE EMAIL IS SENT)**
```
1. Employee sees available shifts in their portal
2. Employee clicks "Accept" on a specific shift slot
3. System validates:
   - Shift exists and is "open"
   - User has permission to accept
   - No double-booking conflicts
4. System updates shift status to "pending approval"
5. System assigns employee to the shift slot
6. 📧 THIS EMAIL IS SENT TO ALL CLIENT USERS
7. Employee receives confirmation
```

### **Step 3: Admin Approval** (Next step after this email)
```
1. Staff/Admin reviews the accepted shift
2. Staff/Admin either approves or rejects the shift
3. Different email notifications are sent based on approval/rejection
```

## 📊 **Email Content Analysis**

### **Static Elements:**
- **Header:** "📩 Shift Accepted"
- **Greeting:** "Dear [Client Name]"
- **Main Message:** Confirms employee acceptance with employee name
- **Footer:** Automated message from "Shiftly"

### **Dynamic Elements:**
- `${clientName}` - Name of the client receiving the email
- `${locationName}` - Location where shift will take place
- `${shiftDate}` - Date of the shift (formatted)
- `${employeeName}` - Name of employee who accepted
- `${startTime}` - Shift start time (formatted)
- `${endTime}` - Shift end time (formatted)

### **Key Message:**
> "Your shift at **[Location]** on **[Date]** has been **accepted** by **[Employee Name]**."

### **Important Note in Email:**
> "You will receive another notification once the shift is approved by an administrator."

## 🔍 **Technical Details**

### **Database Changes When Email Triggers:**
```sql
UPDATE Clientstaffshifts 
SET Status = 'pending approval', 
    Assignedtouserid = [employee_id], 
    Approvedbyid = [employee_id], 
    Approvedat = NOW() 
WHERE id = [shift_slot_id]
```

### **Email Template Function:**
```javascript
function shiftAcceptedClient({ 
  clientName, 
  locationName, 
  shiftDate, 
  employeeName, 
  startTime, 
  endTime 
}) {
  return {
    subject: `Shift Accepted Notification: ${shiftDate}`,
    html: [formatted HTML template]
  };
}
```

## 🎯 **Purpose & Benefits**

### **For Clients:**
- **Immediate notification** when someone accepts their shift
- **Transparency** about who will be working
- **Reassurance** that their staffing needs are being addressed
- **Expectation setting** about the approval process

### **For System:**
- **Audit trail** of shift acceptance activities
- **Communication bridge** between employees and clients
- **Process transparency** for multi-step approval workflow

## 📋 **Email Status in Workflow**

```
Shift Created → Employee Accepts → 📧 THIS EMAIL → Admin Reviews → Final Approval/Rejection
     ↓              ↓                    ↓              ↓              ↓
  "open"    "pending approval"    Client Notified   Under Review   "approved"/"rejected"
```

## 🚨 **Important Notes**

1. **This is NOT the final confirmation** - it's a notification that someone has shown interest
2. **Admin approval is still required** before the shift is finalized
3. **Multiple employees can potentially accept** the same shift request (different slots)
4. **Email sent asynchronously** - doesn't block the API response
5. **Error handling included** - email failures don't break the acceptance process

## 🔗 **Related Email Templates**

- **`shiftApprovedEmployee`** - Sent to employee when admin approves
- **`shiftRejectedEmployee`** - Sent to employee when admin rejects  
- **`shiftNewEmployee`** - Sent to employees when shift is first created
- **`shiftNewClientToAdminStaff`** - Sent to admin/staff when client creates shift

This email represents the **first confirmation step** in a multi-stage shift assignment process, keeping clients informed about the progress of their staffing requests.
