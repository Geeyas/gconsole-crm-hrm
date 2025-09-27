# GConsole CRM-HRM API - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [User Types & Permissions](#user-types--permissions)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [Authentication APIs](#authentication-apis)
7. [Client Management APIs](#client-management-apis)
8. [PDF Attachment Management APIs](#pdf-attachment-management-apis)
9. [Timesheet Management APIs](#timesheet-management-apis)
10. [CRUD Operations APIs](#crud-operations-apis)
11. [Admin Management APIs](#admin-management-apis)
12. [Public APIs](#public-apis)
13. [Database Schema Reference](#database-schema-reference)
14. [Middleware Reference](#middleware-reference)
15. [Security Features](#security-features)

---

## Overview

The GConsole CRM-HRM system is a comprehensive workforce management API built with Node.js, Express.js, and MySQL. It provides role-based access control, timesheet management, client location tracking, and comprehensive shift management capabilities.

**Base URL:** `http://localhost:3000/api` (configurable via environment)
**Content-Type:** `application/json`
**Authentication:** JWT Bearer tokens

---

## Authentication & Authorization

### JWT Token Structure
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Token Payload Structure
```json
{
  "id": 123,
  "email": "user@example.com",
  "usertype": "Employee",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Token Management
- **Access Token Expiry:** 15 minutes
- **Refresh Token Expiry:** 7 days
- **Blacklist Management:** Logout invalidates tokens

---

## User Types & Permissions

### User Type Hierarchy
1. **System Admin** - Full system access
2. **Staff - Standard User** - Administrative operations, user management
3. **Client - Standard User** - View assigned locations, manage shifts
4. **Employee** - Basic timesheet and shift operations

### Permission Matrix

| Operation | System Admin | Staff | Client | Employee |
|-----------|--------------|-------|--------|----------|
| User Management | ✅ | ✅ | ❌ | ❌ |
| Timesheet Admin | ✅ | ✅ | ❌ | ❌ |
| Shift Management | ✅ | ✅ | ✅ | View Only |
| Client Locations | ✅ | ✅ | Assigned Only | ❌ |
| Report Generation | ✅ | ✅ | ❌ | ❌ |

---

## Rate Limiting

### General Rate Limits
- **Default:** 100 requests per 15 minutes per IP
- **Contact Admin:** 5 requests per 10 minutes per IP
- **Timesheet APIs:** Unlimited (10,000 requests per minute)

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Common HTTP Status Codes
- **200:** Success
- **201:** Created
- **400:** Bad Request/Validation Error
- **401:** Unauthorized
- **403:** Forbidden
- **404:** Not Found
- **409:** Conflict
- **429:** Too Many Requests
- **500:** Internal Server Error

---

## Authentication APIs

### 1. User Login
**Endpoint:** `POST /api/login`
**Authentication:** None
**Rate Limit:** Standard

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Validation Rules:**
- Email: Required, valid email format
- Password: Required, minimum 6 characters

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refreshTokenString",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "usertype": "Employee",
    "firstname": "John",
    "lastname": "Doe"
  }
}
```

**Error Responses:**
- **400:** Invalid credentials or validation error
- **401:** Authentication failed
- **429:** Too many login attempts

### 2. Refresh Token
**Endpoint:** `POST /api/refresh-token`
**Authentication:** Refresh Token
**Rate Limit:** Standard

**Request Body:**
```json
{
  "refreshToken": "refreshTokenString"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "newJwtToken",
  "refreshToken": "newRefreshToken"
}
```

### 3. User Logout
**Endpoint:** `POST /api/logout`
**Authentication:** Required
**Rate Limit:** Standard

**Request Body:**
```json
{
  "refreshToken": "refreshTokenString"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### 4. User Registration
**Endpoint:** `POST /api/register`
**Authentication:** Required (Staff/Admin only)
**Rate Limit:** Standard

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "usertype": "Employee",
  "firstname": "Jane",
  "lastname": "Smith",
  "phone": "+1234567890",
  "address": "123 Main St"
}
```

**Validation Rules:**
- Email: Required, valid format, unique
- Password: Required, minimum 6 characters
- Usertype: Required, valid user type
- Firstname/Lastname: Required, non-empty strings

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": 124
}
```

### 5. Update Password
**Endpoint:** `PUT /api/update-password`
**Authentication:** Required
**Rate Limit:** Standard

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

### 6. Update User Profile
**Endpoint:** `PUT /api/people/{id}`
**Authentication:** Required
**Rate Limit:** Standard

**Request Body:**
```json
{
  "firstname": "UpdatedFirstName",
  "lastname": "UpdatedLastName",
  "phone": "+1234567890",
  "address": "Updated Address"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

---

## Client Management APIs

### 1. Get Available Client Shifts
**Endpoint:** `GET /api/available-client-shifts`
**Authentication:** Required
**Rate Limit:** Standard

**Query Parameters:**
- `location_id` (optional): Filter by location ID
- `status` (optional): Filter by shift status
- `limit` (optional): Number of results (default: 50)
- `page` (optional): Page number (default: 1)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "availableShifts": [
      {
        "id": 1,
        "clientName": "ABC Corp",
        "locationName": "Downtown Office",
        "shiftDate": "2024-01-15",
        "startTime": "09:00:00",
        "endTime": "17:00:00",
        "requiredStaff": 3,
        "assignedStaff": 1,
        "status": "Active",
        "description": "Regular office shift"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}
```

### 2. Create Client Shift Request
**Endpoint:** `POST /api/clientshiftrequests`
**Authentication:** Required (Client/Staff/Admin)
**Rate Limit:** Standard

**⚠️ Note:** This endpoint now supports PDF attachment uploads via `multipart/form-data`. See [PDF Attachment Management APIs](#pdf-attachment-management-apis) for detailed documentation.

**Request Body (JSON - backward compatible):**
```json
{
  "clientLocationId": 5,
  "shiftDate": "2024-01-20",
  "startTime": "09:00",
  "endTime": "17:00",
  "requiredStaff": 2,
  "description": "Weekend coverage shift",
  "urgency": "Medium"
}
```

**Request Body (multipart/form-data - with PDF attachment):**
```
clientlocationid: 5
shiftdate: 2024-01-20
starttime: 09:00
endtime: 17:00
requiredstaff: 2
description: Weekend coverage shift
urgency: Medium
pdf: [PDF File] (optional)
```

**Validation Rules:**
- clientLocationId: Required, valid location ID
- shiftDate: Required, future date
- startTime/endTime: Required, valid time format
- requiredStaff: Required, positive integer
- pdf: Optional, PDF file max 6MB

**Success Response (201) - without PDF:**
```json
{
  "success": true,
  "message": "Shift request created successfully",
  "shiftRequestId": 123,
  "data": {
    "id": 123,
    "clientLocationId": 5,
    "shiftDate": "2024-01-20",
    "status": "Pending"
  }
}
```

**Success Response (201) - with PDF:**
```json
{
  "success": true,
  "message": "Shift request created successfully",
  "shiftRequestId": 123,
  "data": {
    "id": 123,
    "clientLocationId": 5,
    "shiftDate": "2024-01-20",
    "status": "Pending",
    "attachment": {
      "id": 567,
      "fileName": "requirements.pdf",
      "fileSize": 1048576,
      "uploadedAt": "2024-01-20T10:00:00.000Z"
    }
  }
}
```

### 3. Update Client Shift Request
**Endpoint:** `PUT /api/clientshiftrequests/{id}`
**Authentication:** Required (Creator/Staff/Admin)
**Rate Limit:** Standard

**Request Body:**
```json
{
  "shiftDate": "2024-01-21",
  "startTime": "10:00",
  "endTime": "18:00",
  "requiredStaff": 3,
  "description": "Updated shift requirements"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Shift request updated successfully"
}
```

### 4. Delete Client Shift Request
**Endpoint:** `DELETE /api/clientshiftrequests/{id}`
**Authentication:** Required (Creator/Staff/Admin)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "message": "Shift request deleted successfully"
}
```

### 5. Accept Client Staff Shift
**Endpoint:** `POST /api/clientstaffshifts/{id}/accept`
**Authentication:** Required (Employee/Staff/Admin)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "message": "Shift accepted successfully",
  "shiftId": 123
}
```

### 6. Approve Client Staff Shift
**Endpoint:** `POST /api/clientstaffshifts/{id}/approve`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Request Body:**
```json
{
  "approvalNotes": "Approved for overtime coverage"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Shift approved successfully"
}
```

### 7. Reject Client Staff Shift
**Endpoint:** `POST /api/clientstaffshifts/{id}/reject`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Request Body:**
```json
{
  "rejectionReason": "Insufficient staffing requirements"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Shift rejected successfully"
}
```

### 8. Assign Employee to Staff Shift
**Endpoint:** `POST /api/clientstaffshifts/{id}/assign-employee`
**Authentication:** Required (Staff/Client/Admin)
**Rate Limit:** Standard

**Request Body:**
```json
{
  "employeeEmail": "employee@example.com",
  "slotNumber": 1
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Employee assigned to shift successfully"
}
```

### 9. Remove Employee from Staff Shift
**Endpoint:** `POST /api/clientstaffshifts/{id}/remove-employee`
**Authentication:** Required
**Rate Limit:** Standard

**Request Body:**
```json
{
  "employeeEmail": "employee@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Employee removed from shift successfully"
}
```

### 10. Get My Client Locations
**Endpoint:** `GET /api/my-client-locations`
**Authentication:** Required (Client users)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "clientId": 2,
      "locationName": "Downtown Office",
      "address": "123 Business St",
      "city": "Cityville",
      "phone": "+1234567890",
      "status": "Active"
    }
  ]
}
```

### 11. Get All Client Locations (Staff/Admin)
**Endpoint:** `GET /api/all-client-locations`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "clientId": 1,
      "clientName": "ABC Corp",
      "locations": [
        {
          "id": 1,
          "locationName": "Main Office",
          "address": "456 Corporate Blvd",
          "status": "Active"
        }
      ]
    }
  ]
}
```

### 12. Link Client User to Location
**Endpoint:** `POST /api/link-client-user-location`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Request Body:**
```json
{
  "userEmail": "client@example.com",
  "locationId": 5
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Client user linked to location successfully"
}
```

### 13. Get Client User Locations by Email
**Endpoint:** `GET /api/client-user-locations?email={email}`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "userEmail": "client@example.com",
    "linkedLocations": [
      {
        "locationId": 5,
        "locationName": "Downtown Office",
        "clientName": "ABC Corp"
      }
    ]
  }
}
```

---

## PDF Attachment Management APIs

### Overview
The PDF attachment feature allows users to attach PDF files to shift requests with proper access controls. Files are stored in Google Cloud Storage with organized folder structure and metadata stored in the database.

### Access Control Rules
**Who can upload PDFs:**
- ✅ Anyone who can create shifts (Client users, Staff, Admin)

**Who can view/download PDFs:**
- ✅ System Admin (can view any PDF)
- ✅ Staff users (can view any PDF)
- ✅ Shift creator (can view their own shift's PDF)
- ✅ Assigned employees (can view PDFs for shifts they're assigned to)
- ❌ Other employees (cannot view PDFs for shifts they're not assigned to)

**Who can replace/delete PDFs:**
- ✅ System Admin
- ✅ Staff users  
- ✅ Shift creator (only their own shifts)
- ❌ Assigned employees (cannot modify attachments)

### Modified Endpoint: Create Shift Request with PDF Upload

**Endpoint:** `POST /clientshiftrequests`
**Authentication:** Required (Client/Staff/Admin)
**Rate Limit:** Standard
**Content-Type:** `multipart/form-data` (when uploading PDF)

**Request Body (multipart/form-data):**
```
clientlocationid: 123
shiftdate: 2024-09-27
starttime: 2024-09-27T08:00:00.000Z
endtime: 2024-09-27T16:00:00.000Z
qualificationgroupid: 5
totalrequiredstaffnumber: 2
additionalvalue: Additional info
pdf: [PDF File] (optional - only if user selects a PDF)
```

**File Validation Rules:**
- File type: Must be PDF (application/pdf)
- File size: Maximum 6MB
- Required: No (optional attachment)

**Success Response (201) - with PDF:**
```json
{
  "message": "Shift request created successfully",
  "shift": {
    "ID": 1234,
    "Clientid": 10,
    "Clientlocationid": 123,
    "Shiftdate": "2024-09-27",
    "Starttime": "2024-09-27T08:00:00.000Z",
    "Endtime": "2024-09-27T16:00:00.000Z",
    "qualificationname": ["Registered Nurse", "First Aid"],
    "StaffShifts": [...],
    "attachment": {
      "id": 567,
      "fileName": "shift-requirements.pdf",
      "fileSize": 1048576,
      "uploadedAt": "2024-09-27T01:30:00.000Z"
    }
  }
}
```

**Success Response (201) - without PDF:**
```json
{
  "message": "Shift request created successfully",
  "shift": {
    "ID": 1234,
    // ... standard shift data without attachment property
  }
}
```

**Error Responses:**
- **400:** Invalid PDF file, file size exceeds 6MB, validation errors
- **403:** Access denied
- **500:** Google Cloud Storage upload failed

### 1. View/Download PDF Attachment

**Endpoint:** `GET /clientshiftrequests/{shiftId}/attachment`
**Authentication:** Required
**Rate Limit:** Standard
**Response Type:** PDF file stream

**Path Parameters:**
- `shiftId` (required): ID of the shift request

**Success Response (200):**
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `inline; filename="original-filename.pdf"`
- **Body:** PDF file binary data

**Error Responses:**
- **403:** Access denied - user not authorized to view this PDF
- **404:** No attachment found for this shift request
- **500:** Failed to retrieve file from Google Cloud Storage

**Example Usage:**
```javascript
// View PDF in new tab
window.open(`/clientshiftrequests/${shiftId}/attachment`, '_blank');

// Download PDF programmatically
fetch(`/clientshiftrequests/${shiftId}/attachment`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(response => response.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shift-attachment.pdf';
  a.click();
});
```

### 2. Get PDF Attachment Metadata

**Endpoint:** `GET /clientshiftrequests/{shiftId}/attachment/info`
**Authentication:** Required
**Rate Limit:** Standard

**Path Parameters:**
- `shiftId` (required): ID of the shift request

**Success Response (200):**
```json
{
  "message": "Attachment info retrieved successfully",
  "attachment": {
    "id": 567,
    "fileName": "shift-requirements.pdf",
    "fileSize": 1048576,
    "mimeType": "application/pdf",
    "uploadedAt": "2024-09-27T01:30:00.000Z"
  }
}
```

**Error Responses:**
- **403:** Access denied
- **404:** No attachment found for this shift request

### 3. Replace PDF Attachment

**Endpoint:** `PUT /clientshiftrequests/{shiftId}/attachment`
**Authentication:** Required (Creator/Staff/Admin only)
**Rate Limit:** Standard
**Content-Type:** `multipart/form-data`

**Path Parameters:**
- `shiftId` (required): ID of the shift request

**Request Body (multipart/form-data):**
```
pdf: [New PDF File] (required)
```

**Success Response (200) - Existing attachment replaced:**
```json
{
  "message": "Attachment updated successfully",
  "attachment": {
    "id": 567,
    "fileName": "new-requirements.pdf",
    "fileSize": 2097152,
    "updatedAt": "2024-09-27T02:00:00.000Z"
  }
}
```

**Success Response (201) - New attachment created:**
```json
{
  "message": "Attachment added successfully",
  "attachment": {
    "id": 568,
    "fileName": "requirements.pdf",
    "fileSize": 1048576,
    "uploadedAt": "2024-09-27T02:00:00.000Z"
  }
}
```

**Error Responses:**
- **400:** No PDF file provided, invalid PDF file
- **403:** Access denied - only creator, staff, or admin can replace
- **404:** Shift request not found
- **500:** Failed to upload to Google Cloud Storage

### 4. Delete PDF Attachment

**Endpoint:** `DELETE /clientshiftrequests/{shiftId}/attachment`
**Authentication:** Required (Creator/Staff/Admin only)
**Rate Limit:** Standard

**Path Parameters:**
- `shiftId` (required): ID of the shift request

**Success Response (200):**
```json
{
  "message": "Attachment deleted successfully",
  "deletedAttachment": {
    "id": 567,
    "fileName": "shift-requirements.pdf",
    "deletedAt": "2024-09-27T03:00:00.000Z"
  }
}
```

**Error Responses:**
- **403:** Access denied - only creator, staff, or admin can delete
- **404:** Shift request not found or no attachment exists
- **500:** Database or Google Cloud Storage deletion failed

### PDF File Storage Structure

**Google Cloud Storage Organization:**
```
gconsole-hrm-storage/
└── shift-requests/
    └── 2024/
        └── 09/
            └── 27/
                ├── shift_1234_1727401800000_requirements.pdf
                ├── shift_1235_1727401900000_safety_docs.pdf
                └── ...
```

**File Naming Convention:** `shift_{shiftRequestId}_{timestamp}_{originalFileName}`

### Database Schema Integration

**Attachments Table Usage:**
```sql
INSERT INTO Attachments (
  EntityType,     -- 'Clientshiftrequest'
  EntityID,       -- Shift request ID
  FileName,       -- Original filename
  FilePath,       -- Google Cloud Storage path
  FileSize,       -- File size in bytes
  MimeType,       -- 'application/pdf'
  Createdat,      -- Upload timestamp
  Createdbyid,    -- User who uploaded
  Updatedat,      -- Last update timestamp
  Updatedbyid,    -- User who last updated
  Deletedat,      -- Soft delete timestamp (NULL if active)
  Deletedbyid     -- User who deleted (NULL if active)
);
```

### Frontend Integration Examples

**JavaScript File Upload:**
```javascript
// Create shift with PDF attachment
const formData = new FormData();
formData.append('clientlocationid', '123');
formData.append('shiftdate', '2024-09-27');
formData.append('starttime', '2024-09-27T08:00:00.000Z');
formData.append('endtime', '2024-09-27T16:00:00.000Z');
formData.append('qualificationgroupid', '5');
formData.append('totalrequiredstaffnumber', '2');
formData.append('additionalvalue', 'Additional info');

// Add PDF file if selected
const pdfFile = document.getElementById('pdfInput').files[0];
if (pdfFile) {
  formData.append('pdf', pdfFile);
}

const response = await fetch('/clientshiftrequests', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    // Don't set Content-Type - browser will set it with boundary
  },
  body: formData
});
```

**File Validation (Frontend):**
```javascript
function validatePDFFile(file) {
  // Check file type
  if (file.type !== 'application/pdf') {
    throw new Error('Please select a PDF file.');
  }
  
  // Check file size (6MB limit)
  const maxSize = 6 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size must be less than 6MB.');
  }
  
  return true;
}
```

### Error Handling Examples

**Common Error Responses:**
```json
// File validation error
{
  "message": "Invalid PDF file",
  "error": "File size exceeds 6MB limit"
}

// Access control error
{
  "message": "Access denied: You can only view attachments for shifts you are assigned to or created."
}

// File not found error
{
  "message": "No attachment found for this shift request."
}

// Google Cloud Storage error
{
  "message": "Failed to upload PDF attachment",
  "error": "Google Cloud Storage unavailable"
}
```

---

## Timesheet Management APIs

### 1. Get Employee's Weekly Timesheet
**Endpoint:** `GET /api/timesheets/my-week?week_start={YYYY-MM-DD}`
**Authentication:** Required (Employee)
**Rate Limit:** Unlimited

**Query Parameters:**
- `week_start` (required): Week start date in YYYY-MM-DD format

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "weekStartDate": "2024-01-15",
    "weekEndDate": "2024-01-21",
    "totalHours": 40.0,
    "status": "draft",
    "entries": [
      {
        "id": 1,
        "date": "2024-01-15",
        "startTime": "09:00:00",
        "endTime": "17:00:00",
        "breakDuration": 60,
        "totalHours": 7.0,
        "description": "Regular work day",
        "clientLocation": "ABC Corp - Downtown"
      }
    ],
    "submissionStatus": {
      "canSubmit": true,
      "submittedAt": null,
      "approvedAt": null,
      "rejectedAt": null
    }
  }
}
```

**Error Responses:**
- **400:** Invalid week_start date format
- **404:** No timesheet found for specified week

### 2. Create Timesheet Entry
**Endpoint:** `POST /api/timesheets/entries`
**Authentication:** Required (Employee)
**Rate Limit:** Unlimited

**Request Body:**
```json
{
  "date": "2024-01-15",
  "startTime": "09:00",
  "endTime": "17:00",
  "breakDuration": 60,
  "description": "Regular work shift",
  "clientLocationId": 5
}
```

**Validation Rules:**
- date: Required, valid date, not in future
- startTime: Required, valid time format (HH:MM)
- endTime: Required, valid time format, after startTime
- breakDuration: Optional, non-negative integer (minutes)
- clientLocationId: Required, valid location ID

**Success Response (201):**
```json
{
  "success": true,
  "message": "Timesheet entry created successfully",
  "data": {
    "entryId": 123,
    "date": "2024-01-15",
    "totalHours": 7.0,
    "weekStartDate": "2024-01-15"
  }
}
```

**Error Responses:**
- **400:** Validation errors, duplicate entry for same date
- **409:** Entry already exists for this date

### 3. Update Timesheet Entry
**Endpoint:** `PUT /api/timesheets/entries/{entry_id}`
**Authentication:** Required (Employee)
**Rate Limit:** Unlimited

**Request Body:**
```json
{
  "startTime": "08:30",
  "endTime": "17:30",
  "breakDuration": 45,
  "description": "Updated shift times"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Timesheet entry updated successfully",
  "data": {
    "entryId": 123,
    "totalHours": 8.25
  }
}
```

**Error Responses:**
- **403:** Cannot edit submitted/approved timesheet
- **404:** Entry not found

### 4. Delete Timesheet Entry
**Endpoint:** `DELETE /api/timesheets/entries/{entry_id}`
**Authentication:** Required (Employee)
**Rate Limit:** Unlimited

**Success Response (200):**
```json
{
  "success": true,
  "message": "Timesheet entry deleted successfully"
}
```

**Error Responses:**
- **403:** Cannot delete submitted/approved timesheet entry
- **404:** Entry not found

### 5. Submit Weekly Timesheet
**Endpoint:** `POST /api/timesheets/submit-week`
**Authentication:** Required (Employee)
**Rate Limit:** Unlimited

**Request Body:**
```json
{
  "weekStartDate": "2024-01-15",
  "submissionNotes": "All hours completed as scheduled"
}
```

**Validation Rules:**
- weekStartDate: Required, valid Monday date
- Must have at least one timesheet entry for the week
- Cannot resubmit already submitted timesheet

**Success Response (200):**
```json
{
  "success": true,
  "message": "Weekly timesheet submitted successfully",
  "data": {
    "weekStartDate": "2024-01-15",
    "totalHours": 40.0,
    "submittedAt": "2024-01-22T10:30:00.000Z",
    "status": "submitted"
  }
}
```

**Error Responses:**
- **400:** No entries found for week, already submitted
- **409:** Timesheet already submitted

### 6. Get All Employee Timesheets (Admin/Staff)
**Endpoint:** `GET /api/timesheets/admin/timesheets`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Unlimited

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)
- `status` (optional): Filter by status (submitted, approved, rejected)
- `employee_id` (optional): Filter by employee ID
- `week_start` (optional): Filter by week start date
- `week_end` (optional): Filter by week end date
- `search` (optional): Search employee names

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "timesheets": [
      {
        "id": 1,
        "employeeId": 123,
        "employeeName": "John Doe",
        "weekStartDate": "2024-01-15",
        "weekEndDate": "2024-01-21",
        "totalHours": 40.0,
        "status": "submitted",
        "submittedAt": "2024-01-22T10:30:00.000Z",
        "entriesCount": 5
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 50,
      "totalPages": 3
    },
    "summary": {
      "totalSubmitted": 25,
      "totalApproved": 20,
      "totalRejected": 2,
      "totalPending": 3
    }
  }
}
```

### 7. Get Specific Employee's Timesheet Details
**Endpoint:** `GET /api/timesheets/admin/timesheets/employee/{employee_id}/week/{week_start_date}`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Unlimited

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "employee": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "timesheet": {
      "weekStartDate": "2024-01-15",
      "totalHours": 40.0,
      "status": "submitted",
      "submittedAt": "2024-01-22T10:30:00.000Z",
      "entries": [
        {
          "id": 1,
          "date": "2024-01-15",
          "startTime": "09:00:00",
          "endTime": "17:00:00",
          "breakDuration": 60,
          "totalHours": 7.0,
          "description": "Regular work day",
          "clientLocation": "ABC Corp - Downtown"
        }
      ]
    }
  }
}
```

### 8. Approve Weekly Timesheet
**Endpoint:** `POST /api/timesheets/admin/timesheets/{timesheet_id}/approve`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Unlimited

**Request Body:**
```json
{
  "approvalNotes": "Timesheet approved - all hours verified"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Timesheet approved successfully",
  "data": {
    "timesheetId": 123,
    "approvedAt": "2024-01-23T14:30:00.000Z",
    "approvedBy": "admin@example.com"
  }
}
```

**Error Responses:**
- **400:** Timesheet not in submitted status
- **404:** Timesheet not found

### 9. Reject Weekly Timesheet
**Endpoint:** `POST /api/timesheets/admin/timesheets/{timesheet_id}/reject`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Unlimited

**Request Body:**
```json
{
  "rejectionReason": "Incorrect hours logged for Tuesday",
  "rejectionNotes": "Please revise Tuesday's entry and resubmit"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Timesheet rejected successfully",
  "data": {
    "timesheetId": 123,
    "rejectedAt": "2024-01-23T14:30:00.000Z",
    "rejectedBy": "admin@example.com"
  }
}
```

### 10. Admin Edit Timesheet Entry
**Endpoint:** `PUT /api/timesheets/admin/timesheets/entries/{entry_id}`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Unlimited

**Request Body:**
```json
{
  "startTime": "09:00",
  "endTime": "17:00",
  "breakDuration": 60,
  "description": "Admin correction - verified hours",
  "adminNotes": "Corrected based on security footage review"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Timesheet entry updated by admin",
  "data": {
    "entryId": 123,
    "modifiedBy": "admin@example.com",
    "modifiedAt": "2024-01-23T15:00:00.000Z"
  }
}
```

### 11. Export Timesheets to CSV
**Endpoint:** `GET /api/timesheets/admin/timesheets/export`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Unlimited

**Query Parameters:**
- `format` (optional): Export format (csv, excel) - default: csv
- `week_start` (optional): Start date filter
- `week_end` (optional): End date filter
- `status` (optional): Status filter
- `employee_ids` (optional): Comma-separated employee IDs

**Success Response (200):**
```json
{
  "success": true,
  "message": "Timesheets exported successfully",
  "data": {
    "downloadUrl": "/downloads/timesheets_export_20240123.csv",
    "filename": "timesheets_export_20240123.csv",
    "recordCount": 150,
    "exportedAt": "2024-01-23T16:00:00.000Z"
  }
}
```

### 12. Get Client Signature
**Endpoint:** `GET /api/timesheets/client-signature/{timesheet_id}`
**Authentication:** Required
**Rate Limit:** Unlimited

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "hasSignature": true,
    "signedAt": "2024-01-22T17:00:00.000Z",
    "signedBy": "client@example.com",
    "signatureUrl": "/signatures/timesheet_123_signature.png"
  }
}
```

### 13. Get Client Signature Image
**Endpoint:** `GET /api/timesheets/client-signature/{timesheet_id}/image`
**Authentication:** Required
**Rate Limit:** Unlimited
**Response Type:** Image (PNG/JPEG)

**Success Response (200):** Binary image data

### 14. Timesheet Health Check
**Endpoint:** `GET /api/timesheets/health`
**Authentication:** None
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "status": "healthy",
  "service": "timesheet-api",
  "timestamp": "2024-01-23T16:30:00.000Z",
  "version": "1.0.0"
}
```

---

## CRUD Operations APIs

### 1. Get All Records (Paginated)
**Endpoint:** `GET /api/{table}/paginated`
**Authentication:** Required
**Rate Limit:** Standard

**Supported Tables:**
- People, Users, Clients, Clientlocations, Qualifications, Staffqualifications, Clientshiftrequests, Clientstaffshifts

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)
- `search` (optional): Search term
- `sortBy` (optional): Sort field
- `sortOrder` (optional): asc/desc

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "field1": "value1",
      "field2": "value2",
      "createdat": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### 2. Get All Records
**Endpoint:** `GET /api/{table}`
**Authentication:** Required
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "field1": "value1",
      "field2": "value2"
    }
  ]
}
```

### 3. Get Single Record
**Endpoint:** `GET /api/{table}/{id}`
**Authentication:** Required
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "field1": "value1",
    "field2": "value2",
    "createdat": "2024-01-15T10:00:00.000Z"
  }
}
```

### 4. Create Record
**Endpoint:** `POST /api/{table}`
**Authentication:** Required
**Rate Limit:** Standard

**Request Body:** (varies by table)
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Record created successfully",
  "id": 123
}
```

### 5. Update Record
**Endpoint:** `PUT /api/{table}/{id}`
**Authentication:** Required
**Rate Limit:** Standard

**Request Body:**
```json
{
  "field1": "updatedValue1",
  "field2": "updatedValue2"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Record updated successfully"
}
```

### 6. Delete Record
**Endpoint:** `DELETE /api/{table}/{id}`
**Authentication:** Required
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "message": "Record deleted successfully"
}
```

### 7. Get Client Locations
**Endpoint:** `GET /api/clientLocation`
**Authentication:** None
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "clientId": 1,
      "clientName": "ABC Corp",
      "locations": [
        {
          "id": 1,
          "locationName": "Main Office",
          "address": "123 Business St",
          "city": "Cityville",
          "phone": "+1234567890"
        }
      ]
    }
  ]
}
```

### 8. Send Admin Email
**Endpoint:** `POST /api/admin/send-email`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Request Body:**
```json
{
  "to": ["recipient@example.com"],
  "subject": "Important Notice",
  "message": "This is the email content",
  "priority": "high"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "recipients": 1
}
```

---

## Admin Management APIs

### 1. Export AI Training Data (All Formats)
**Endpoint:** `POST /api/admin/export-ai-data/all`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "message": "AI training data exported successfully",
  "exports": {
    "openai": "/exports/openai_training_data.jsonl",
    "huggingface": "/exports/huggingface_dataset.json",
    "conversations": "/exports/conversation_dataset.json",
    "analytics": "/exports/analytics_report.json"
  },
  "timestamp": "2024-01-23T16:00:00.000Z"
}
```

### 2. Export OpenAI Training Data
**Endpoint:** `POST /api/admin/export-ai-data/openai`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "message": "OpenAI training data exported successfully",
  "filepath": "/exports/openai_training_data.jsonl",
  "timestamp": "2024-01-23T16:00:00.000Z"
}
```

### 3. Export Hugging Face Data
**Endpoint:** `POST /api/admin/export-ai-data/huggingface`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "message": "Hugging Face training data exported successfully",
  "filepath": "/exports/huggingface_dataset.json",
  "timestamp": "2024-01-23T16:00:00.000Z"
}
```

### 4. Export Conversation Dataset
**Endpoint:** `POST /api/admin/export-ai-data/conversations`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "message": "Conversation dataset exported successfully",
  "filepath": "/exports/conversation_dataset.json",
  "timestamp": "2024-01-23T16:00:00.000Z"
}
```

### 5. Export Analytics Data
**Endpoint:** `POST /api/admin/export-ai-data/analytics`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "message": "Analytics data exported successfully",
  "filepath": "/exports/analytics_report.json",
  "timestamp": "2024-01-23T16:00:00.000Z"
}
```

### 6. Get AI Training Data Statistics
**Endpoint:** `GET /api/admin/ai-data/stats`
**Authentication:** Required (Staff/Admin)
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "success": true,
  "stats": {
    "total_interactions": 1500,
    "file_size": 2048576,
    "last_interaction": "2024-01-23T15:30:00.000Z",
    "data_collection_active": true
  },
  "ai_training_directory": "/path/to/ai-training-data",
  "timestamp": "2024-01-23T16:00:00.000Z"
}
```

---

## Public APIs

### 1. Contact Admin
**Endpoint:** `POST /api/contact-admin`
**Authentication:** None
**Rate Limit:** 5 requests per 10 minutes per IP

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Technical Support Request",
  "message": "I need help with my account access"
}
```

**Validation Rules:**
- name: Required, non-empty string
- email: Required, valid email format
- subject: Required, non-empty string
- message: Required, minimum 10 characters

**Success Response (200):**
```json
{
  "success": true,
  "message": "Your message has been sent successfully. An administrator will contact you soon.",
  "ticketId": "TICKET-20240123-001"
}
```

**Error Responses:**
- **429:** Too many requests (rate limit exceeded)
- **400:** Validation errors

---

## Database Schema Reference

### Core Tables

#### Users Table
```sql
- ID (Primary Key)
- Email (Unique)
- Password (Hashed)
- Usertype (Enum: 'Employee', 'Client - Standard User', 'Staff - Standard User', 'System Admin')
- Createdat (Timestamp)
- Updatedat (Timestamp)
- Deletedat (Timestamp, NULL)
```

#### People Table
```sql
- ID (Primary Key)
- Firstname
- Lastname
- Email
- Phone
- Address
- Linkeduserid (Foreign Key → Users.ID)
- Createdat (Timestamp)
- Updatedat (Timestamp)
- Deletedat (Timestamp, NULL)
```

#### Clients Table
```sql
- ID (Primary Key)
- Clientname
- Email
- Phone
- Address
- Status
- Createdat (Timestamp)
- Updatedat (Timestamp)
- Deletedat (Timestamp, NULL)
```

#### Clientlocations Table
```sql
- ID (Primary Key)
- Clientid (Foreign Key → Clients.ID)
- Locationname
- Address
- City
- Phone
- Status
- Createdat (Timestamp)
- Updatedat (Timestamp)
- Deletedat (Timestamp, NULL)
```

#### Clientshiftrequests Table
```sql
- ID (Primary Key)
- Clientlocationid (Foreign Key → Clientlocations.ID)
- Createdbyid (Foreign Key → Users.ID)
- Shiftdate (Date)
- Starttime (Time)
- Endtime (Time)
- Requiredstaff (Integer)
- Description (Text)
- Status (Enum: 'Pending', 'Approved', 'Rejected')
- Createdat (Timestamp)
- Updatedat (Timestamp)
- Deletedat (Timestamp, NULL)
```

#### Timesheets Table
```sql
- ID (Primary Key)
- Employeeid (Foreign Key → Users.ID)
- Weekstartdate (Date)
- Totalhours (Decimal)
- Status (Enum: 'draft', 'submitted', 'approved', 'rejected')
- Submittedat (Timestamp, NULL)
- Approvedat (Timestamp, NULL)
- Rejectedat (Timestamp, NULL)
- Createdat (Timestamp)
- Updatedat (Timestamp)
```

#### Timesheetentries Table
```sql
- ID (Primary Key)
- Timesheetid (Foreign Key → Timesheets.ID)
- Date (Date)
- Starttime (Time)
- Endtime (Time)
- Breakduration (Integer, minutes)
- Totalhours (Decimal)
- Description (Text)
- Clientlocationid (Foreign Key → Clientlocations.ID)
- Createdat (Timestamp)
- Updatedat (Timestamp)
```

#### Attachments Table
```sql
- ID (Primary Key)
- EntityType (VARCHAR: 'Clientshiftrequest', 'Timesheet', etc.)
- EntityID (Integer: ID of the related entity)
- FileName (VARCHAR: Original filename)
- FilePath (VARCHAR: Google Cloud Storage path)
- FileSize (Integer: File size in bytes)
- MimeType (VARCHAR: 'application/pdf', etc.)
- Createdat (Timestamp)
- Createdbyid (Foreign Key → Users.ID)
- Updatedat (Timestamp)
- Updatedbyid (Foreign Key → Users.ID)
- Deletedat (Timestamp, NULL)
- Deletedbyid (Foreign Key → Users.ID, NULL)
```

**Usage Example for PDF attachments:**
```sql
-- PDF attachment for shift request ID 123
INSERT INTO Attachments (
  EntityType, EntityID, FileName, FilePath, FileSize, MimeType,
  Createdat, Createdbyid, Updatedat, Updatedbyid
) VALUES (
  'Clientshiftrequest', 123, 'requirements.pdf', 
  'shift-requests/2024/09/27/shift_123_1727401800000_requirements.pdf',
  1048576, 'application/pdf', NOW(), 456, NOW(), 456
);
```

---

## Middleware Reference

### Authentication Middleware
- **authenticate**: Validates JWT tokens
- **authorizeStaffOrAdmin**: Restricts access to Staff/Admin users
- **authorizeAdmin**: Restricts access to System Admin only
- **authorizeClient**: Restricts access to Client users
- **authorizeEmployeeOrStaffOrAdmin**: Allows Employee/Staff/Admin access

### Validation Middleware
- **loginValidation**: Validates login credentials
- **registerValidation**: Validates user registration data
- **createShiftValidation**: Validates shift creation data
- **timesheetValidation**: Validates timesheet entries
- **contactAdminValidation**: Validates contact form data

### File Upload Middleware
- **uploadPDF**: Multer middleware for PDF file uploads
  - **File Type:** PDF only (application/pdf)
  - **File Size:** Maximum 6MB
  - **Storage:** Memory storage for processing before GCS upload
  - **Error Handling:** Invalid file type, size limit exceeded
  - **Usage:** `uploadPDF.single('pdf')` for single file upload

### Rate Limiting Middleware
- **generalLimiter**: 100 requests per 15 minutes
- **contactAdminLimiter**: 5 requests per 10 minutes
- **timesheetUnlimitedLimiter**: 10,000 requests per minute

### Logging Middleware
- **aiTrainingLogger**: Logs API interactions for AI training
- **requestLogger**: Logs all HTTP requests
- **errorLogger**: Logs application errors

---

## Security Features

### Password Security
- **Hashing:** bcrypt with salt rounds
- **Minimum Length:** 6 characters
- **Password Updates:** Require current password verification

### JWT Security
- **Algorithm:** HMAC SHA256
- **Token Expiry:** 15 minutes (configurable)
- **Refresh Tokens:** 7 days expiry
- **Token Blacklisting:** Logout invalidates tokens

### Rate Limiting
- **IP-based:** Per-endpoint rate limits
- **Progressive Delays:** Increasing delays for repeated violations
- **Bypass Options:** Admin override capabilities

### Data Protection
- **Soft Deletes:** Maintains data integrity
- **Input Validation:** Comprehensive request validation
- **SQL Injection Prevention:** Parameterized queries
- **XSS Protection:** Input sanitization

### Access Control
- **Role-based Permissions:** Hierarchical user types
- **Resource-level Security:** User-specific data access
- **Location-based Restrictions:** Client user location filtering
- **Admin Oversight:** Full administrative access

### File Upload Security
- **File Type Validation:** Only PDF files accepted (MIME type checking)
- **File Size Limits:** Maximum 6MB per file to prevent DoS attacks
- **Secure Storage:** Files stored in private Google Cloud Storage bucket
- **Access Control:** Multi-layered authorization for file access
- **File Path Security:** Organized folder structure prevents path traversal
- **Audit Trail:** Complete logging of all file operations
- **Automatic Cleanup:** Replaced files are automatically deleted from storage
- **No Direct URL Access:** All file access goes through API with authorization

### Google Cloud Storage Integration
- **Authentication:** Application Default Credentials
- **Private Bucket:** No public read access
- **Organized Structure:** Date-based folder hierarchy
- **Unique Naming:** Prevents file name collisions
- **Error Handling:** Graceful fallback for storage failures
- **Streaming:** Efficient file delivery without server memory buffering

---

## Common Error Scenarios

### Authentication Errors
```json
{
  "success": false,
  "error": "Token expired",
  "code": "TOKEN_EXPIRED",
  "timestamp": "2024-01-23T16:00:00.000Z"
}
```

### Validation Errors
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Rate Limit Errors
```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 600
}
```

### Database Errors
```json
{
  "success": false,
  "error": "Database operation failed",
  "code": "DATABASE_ERROR",
  "details": "Connection timeout"
}
```

---

## API Documentation Endpoint

**Endpoint:** `GET /api`
**Authentication:** None
**Rate Limit:** Standard

**Success Response (200):**
```json
{
  "message": "API Endpoint Documentation",
  "endpoints": {
    "authentication": [...],
    "timesheets": [...],
    "clients": [...],
    "admin": [...]
  }
}
```

---

*This documentation is comprehensive and covers all available endpoints, authentication methods, validation rules, error handling, and security features of the GConsole CRM-HRM API system. For additional support or questions, please contact the development team.*
