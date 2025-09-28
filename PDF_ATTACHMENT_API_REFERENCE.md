# PDF Attachment System - API Reference for Frontend Developer

## 🔧 Base Configuration
- **Base URL**: `http://localhost:3000/api` (update for production)
- **Authentication**: JWT Bearer token required in Authorization header
- **Content-Type**: `multipart/form-data` for uploads, `application/json` for other requests

---

## 📋 Complete API Reference Table

| **API Endpoint** | **Method** | **Purpose** | **Authentication Required** | **Who Can Access** | **Request Format** | **Response Format** | **Use Case Scenarios** |
|------------------|------------|-------------|----------------------------|-------------------|-------------------|-------------------|----------------------|
| `/api/clientshiftrequests/{shiftId}/attachments` | **POST** | Upload multiple PDF attachments to a shift | ✅ JWT Token Required | **Anyone with valid JWT** (role-independent) | **multipart/form-data**<br/>• `pdfs`: File[] (array)<br/>• Max 10 files<br/>• Total size: 6MB limit<br/>• Only PDF files accepted | **JSON** (201 Created)<br/>```json<br/>{<br/>  "message": "X PDF attachments added successfully",<br/>  "attachments": [{<br/>    "id": 123,<br/>    "fileName": "doc.pdf",<br/>    "fileSize": 1024000,<br/>    "uploadedAt": "2025-09-28T10:30:00Z",<br/>    "originalName": "document.pdf"<br/>  }],<br/>  "totalAttachments": 5,<br/>  "totalSize": 3072000<br/>}<br/>``` | • Upload contracts, forms, medical documents<br/>• Attach supporting documents to shift requests<br/>• Bulk document upload for shifts<br/>• Document sharing between team members |
| `/api/clientshiftrequests/{shiftId}/attachments` | **GET** | Retrieve all PDF attachments for a specific shift | ✅ JWT Token Required | **Anyone with valid JWT** (role-independent) | **Query Parameters**: None<br/>**Headers**: Authorization: Bearer {token} | **JSON** (200 OK)<br/>```json<br/>{<br/>  "message": "Attachments retrieved successfully",<br/>  "attachments": [{<br/>    "id": 123,<br/>    "fileName": "document1.pdf",<br/>    "fileSize": 1024000,<br/>    "mimeType": "application/pdf",<br/>    "uploadedAt": "2025-09-28T10:30:00Z"<br/>  }],<br/>  "totalAttachments": 2<br/>}<br/>``` | • Display list of documents for a shift<br/>• Show attachment counts in UI<br/>• Enable document management interface<br/>• Audit trail for uploaded documents |
| `/api/clientshiftrequests/attachments/{attachmentId}/download` | **GET** | Download a specific PDF attachment | ✅ JWT Token Required | **Anyone with valid JWT** (role-independent) | **Path Parameters**:<br/>• `attachmentId`: integer<br/>**Headers**: Authorization: Bearer {token} | **Binary PDF Stream**<br/>• Content-Type: application/pdf<br/>• Content-Disposition: attachment; filename="document.pdf"<br/>• Binary file data | • View/open PDF documents<br/>• Download documents for offline access<br/>• Print documents<br/>• Share documents with external parties |
| `/api/clientshiftrequests/attachments/{attachmentId}` | **DELETE** | Delete a specific PDF attachment | ✅ JWT Token Required | **Anyone with valid JWT** (role-independent) | **Path Parameters**:<br/>• `attachmentId`: integer<br/>**Headers**: Authorization: Bearer {token} | **JSON** (200 OK)<br/>```json<br/>{<br/>  "message": "Attachment deleted successfully",<br/>  "deletedAttachment": {<br/>    "id": 123,<br/>    "fileName": "document.pdf",<br/>    "deletedAt": "2025-09-28T10:30:00Z"<br/>  }<br/>}<br/>``` | • Remove incorrect/outdated documents<br/>• Clean up unnecessary attachments<br/>• Manage storage space<br/>• Correct mistakes in document uploads |

---

## 🔐 Security & Access Control Summary

| **Aspect** | **Details** |
|------------|-------------|
| **Authentication** | JWT Bearer token mandatory for all endpoints |
| **Authorization** | **Open Access**: Any authenticated user can perform all operations |
| **Role Requirements** | **None** - System Admin, Staff, Client, all user types have equal access |
| **Shift Ownership** | **Not Required** - Users can access attachments for any shift |
| **Assignment Check** | **Not Required** - Users don't need to be assigned to shift |

---

## 📝 Validation Rules & Constraints

| **Constraint Type** | **Rule** | **Error Response** |
|--------------------|----------|--------------------|
| **File Type** | Only PDF files (.pdf) allowed | `400 Bad Request: "Only PDF files are allowed"` |
| **File Count** | Maximum 10 files per upload | `400 Bad Request: "Maximum 10 files allowed per upload"` |
| **Total Size** | 6MB total limit per upload | `400 Bad Request: "Total file size exceeds 6MB limit"` |
| **Shift Existence** | Shift ID must exist and not be deleted | `404 Not Found: "Shift request not found"` |
| **Attachment Existence** | Attachment ID must exist for download/delete | `404 Not Found: "Attachment not found"` |
| **Authentication** | Valid JWT required | `401 Unauthorized: "Access token required"` |

---

## 💻 Frontend Implementation Examples

### **File Upload (React Example)**
```javascript
const uploadPDFs = async (shiftId, files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('pdfs', file));
  
  const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userToken}` },
    body: formData
  });
  
  return await response.json();
};
```

### **File Download (JavaScript Example)**
```javascript
const downloadPDF = async (attachmentId, fileName) => {
  const response = await fetch(`/api/clientshiftrequests/attachments/${attachmentId}/download`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
};
```

### **Load Attachments (React Example)**
```javascript
const loadAttachments = async (shiftId) => {
  const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  
  const data = await response.json();
  return data.attachments;
};
```

---

## 🎯 Business Use Cases

| **Scenario** | **APIs Used** | **Workflow** |
|--------------|---------------|--------------|
| **Document Upload Workflow** | POST → GET | 1. User selects PDFs<br/>2. Upload via POST<br/>3. Refresh list via GET |
| **Document Viewing** | GET → Download | 1. Load attachments list<br/>2. User clicks document<br/>3. Download and display PDF |
| **Document Management** | GET → DELETE → GET | 1. Load current attachments<br/>2. User deletes unwanted files<br/>3. Refresh updated list |
| **Multi-User Collaboration** | All APIs | Any team member can upload, view, and manage documents for any shift |

---

## ⚠️ Error Handling Guide

| **HTTP Status** | **Meaning** | **Frontend Action** |
|----------------|-------------|-------------------|
| **200 OK** | Success | Process response data |
| **201 Created** | Upload successful | Update UI, show success message |
| **400 Bad Request** | Validation error | Show error message to user, highlight invalid fields |
| **401 Unauthorized** | Invalid/expired token | Redirect to login page |
| **403 Forbidden** | Access denied | Show access denied message |
| **404 Not Found** | Resource doesn't exist | Show "not found" message |
| **413 Payload Too Large** | File size exceeded | Show file size error message |
| **500 Server Error** | Server problem | Show generic error, retry option |

---

## 🔄 Rate Limiting & Performance

| **Aspect** | **Limit/Recommendation** |
|------------|--------------------------|
| **Concurrent Uploads** | Limit to 3-5 simultaneous uploads |
| **File Size Display** | Show progress bar for files > 1MB |
| **Retry Logic** | Implement retry for network failures |
| **Caching** | Cache attachment lists for 5 minutes |

---

**Last Updated**: September 28, 2025  
**API Version**: Current Production  
**Contact**: Backend Development Team
