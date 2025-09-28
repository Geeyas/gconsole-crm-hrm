# PDF Attachment System - Frontend Integration Guide

## Overview
This document provides complete integration instructions for implementing PDF attachment functionality in the frontend. The system supports both single and multiple PDF attachments per shift request with comprehensive security and validation.

---

## 🔧 API Base Configuration

**Base URL**: `http://localhost:3000/api` (update for production)  
**Authentication**: JWT Bearer token required in Authorization header  
**File Format**: PDF files only  
**Size Limits**: 
- Individual file: No specific limit (but reasonable sizes recommended)
- Total attachments per shift: 6MB maximum
**Access Control**: Any authenticated user with valid JWT token can view, download, and delete PDF attachments for any valid shift ID (role-independent access)

---

## 📋 API Endpoints Reference

### 1. Multiple Attachments (Recommended - New System)

#### **Add Multiple PDF Attachments**
```
POST /api/clientshiftrequests/{shiftId}/attachments
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

Form Data:
- pdfs: File[] (array of PDF files, max 10 files)
- Key name must be "pdfs" (plural)
- Total size limit: 6MB across all files
```

**Request Example (JavaScript)**:
```javascript
const formData = new FormData();
// Add multiple files with the same key name "pdfs"
selectedFiles.forEach(file => {
    formData.append('pdfs', file);
});

const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - let browser set it with boundary
    },
    body: formData
});
```

**Success Response (201)**:
```json
{
    "message": "Multiple attachments added successfully",
    "attachments": [
        {
            "id": 123,
            "fileName": "document1.pdf",
            "fileSize": 1024000,
            "uploadedAt": "2025-09-28T10:30:00.000Z"
        },
        {
            "id": 124,
            "fileName": "document2.pdf",
            "fileSize": 2048000,
            "uploadedAt": "2025-09-28T10:30:01.000Z"
        }
    ],
    "totalUploaded": 2,
    "totalSize": 3072000
}
```

#### **Get All Attachments for a Shift**
```
GET /api/clientshiftrequests/{shiftId}/attachments
Authorization: Bearer {jwt_token}
```

**Success Response (200)**:
```json
{
    "message": "Attachments retrieved successfully",
    "attachments": [
        {
            "id": 123,
            "fileName": "document1.pdf",
            "fileSize": 1024000,
            "mimeType": "application/pdf",
            "uploadedAt": "2025-09-28T10:30:00.000Z"
        },
        {
            "id": 124,
            "fileName": "document2.pdf",
            "fileSize": 2048000,
            "mimeType": "application/pdf",
            "uploadedAt": "2025-09-28T10:30:01.000Z"
        }
    ],
    "totalAttachments": 2
}
```

#### **Download Individual Attachment**
```
GET /api/clientshiftrequests/attachments/{attachmentId}/download
Authorization: Bearer {jwt_token}
```

**Response**: PDF file stream with appropriate headers for download

**JavaScript Example**:
```javascript
const downloadAttachment = async (attachmentId, fileName) => {
    try {
        const response = await fetch(`/api/clientshiftrequests/attachments/${attachmentId}/download`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    } catch (error) {
        console.error('Download failed:', error);
    }
};
```

#### **Delete Individual Attachment**
```
DELETE /api/clientshiftrequests/attachments/{attachmentId}
Authorization: Bearer {jwt_token}
```

**Success Response (200)**:
```json
{
    "message": "Attachment deleted successfully"
}
```

---

### 2. Single Attachment (Legacy System - Backward Compatible)

#### **Get Attachment Info Only**
```
GET /api/clientshiftrequests/{shiftId}/attachment/info
Authorization: Bearer {jwt_token}
```

**Success Response (200)**:
```json
{
    "message": "Attachment info retrieved successfully",
    "attachment": {
        "id": 123,
        "fileName": "document.pdf",
        "fileSize": 1024000,
        "mimeType": "application/pdf",
        "uploadedAt": "2025-09-28T10:30:00.000Z"
    }
}
```

#### **Download Single Attachment**
```
GET /api/clientshiftrequests/{shiftId}/attachment
Authorization: Bearer {jwt_token}
```

#### **Replace Single Attachment**
```
PUT /api/clientshiftrequests/{shiftId}/attachment
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

Form Data:
- pdf: File (single PDF file)
```

#### **Delete Single Attachment**
```
DELETE /api/clientshiftrequests/{shiftId}/attachment
Authorization: Bearer {jwt_token}
```

---

## 🔒 Access Control & Security

### **Who Can Access Attachments:**
- **Shift Creator**: Full access (view, add, delete)
- **Assigned Staff**: Full access to shifts they're assigned to
- **System Admin**: Full access to all attachments
- **Staff - Standard User**: Full access to all attachments

### **Security Features:**
- JWT authentication required for all endpoints
- File type validation (PDF only)
- File size validation (6MB total limit)
- Access control based on user relationship to shift
- Secure file storage in Google Cloud Storage

---

## 🎨 Frontend Implementation Examples

### **React Component Example - Multiple File Upload**

```jsx
import React, { useState } from 'react';

const ShiftAttachments = ({ shiftId, userToken }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Handle file selection
    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        
        // Validate PDF files only
        const pdfFiles = files.filter(file => file.type === 'application/pdf');
        if (pdfFiles.length !== files.length) {
            alert('Only PDF files are allowed');
            return;
        }

        // Check total size (6MB limit)
        const totalSize = pdfFiles.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > 6 * 1024 * 1024) {
            alert('Total file size cannot exceed 6MB');
            return;
        }

        setSelectedFiles(pdfFiles);
    };

    // Upload multiple files
    const uploadFiles = async () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        const formData = new FormData();
        
        selectedFiles.forEach(file => {
            formData.append('pdfs', file);
        });

        try {
            const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                setAttachments(prev => [...prev, ...result.attachments]);
                setSelectedFiles([]);
                alert('Files uploaded successfully!');
            } else {
                const error = await response.json();
                alert(`Upload failed: ${error.message}`);
            }
        } catch (error) {
            alert('Upload error: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    // Load existing attachments
    const loadAttachments = async () => {
        try {
            const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                setAttachments(result.attachments || []);
            }
        } catch (error) {
            console.error('Failed to load attachments:', error);
        }
    };

    // Download attachment
    const downloadAttachment = async (attachmentId, fileName) => {
        try {
            const response = await fetch(`/api/clientshiftrequests/attachments/${attachmentId}/download`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            alert('Download failed: ' + error.message);
        }
    };

    // Delete attachment
    const deleteAttachment = async (attachmentId) => {
        if (!confirm('Are you sure you want to delete this attachment?')) return;

        try {
            const response = await fetch(`/api/clientshiftrequests/attachments/${attachmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${userToken}`
                }
            });

            if (response.ok) {
                setAttachments(prev => prev.filter(att => att.id !== attachmentId));
                alert('Attachment deleted successfully');
            } else {
                const error = await response.json();
                alert(`Delete failed: ${error.message}`);
            }
        } catch (error) {
            alert('Delete error: ' + error.message);
        }
    };

    // Load attachments on component mount
    React.useEffect(() => {
        loadAttachments();
    }, [shiftId]);

    return (
        <div className="shift-attachments">
            <h3>PDF Attachments</h3>
            
            {/* File Upload Section */}
            <div className="upload-section">
                <input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={uploading}
                />
                
                {selectedFiles.length > 0 && (
                    <div className="selected-files">
                        <h4>Selected Files ({selectedFiles.length}):</h4>
                        <ul>
                            {selectedFiles.map((file, index) => (
                                <li key={index}>
                                    {file.name} ({Math.round(file.size / 1024)}KB)
                                </li>
                            ))}
                        </ul>
                        <button 
                            onClick={uploadFiles} 
                            disabled={uploading}
                        >
                            {uploading ? 'Uploading...' : 'Upload Files'}
                        </button>
                    </div>
                )}
            </div>

            {/* Existing Attachments */}
            <div className="attachments-list">
                <h4>Uploaded Attachments ({attachments.length}):</h4>
                {attachments.length === 0 ? (
                    <p>No attachments uploaded yet.</p>
                ) : (
                    <ul>
                        {attachments.map(attachment => (
                            <li key={attachment.id} className="attachment-item">
                                <span className="file-name">{attachment.fileName}</span>
                                <span className="file-size">
                                    ({Math.round(attachment.fileSize / 1024)}KB)
                                </span>
                                <button 
                                    onClick={() => downloadAttachment(attachment.id, attachment.fileName)}
                                    className="download-btn"
                                >
                                    Download
                                </button>
                                <button 
                                    onClick={() => deleteAttachment(attachment.id)}
                                    className="delete-btn"
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ShiftAttachments;
```

### **Integration in Shift Creation Form**

```jsx
// In your shift creation component
const CreateShiftForm = () => {
    const [shiftData, setShiftData] = useState({});
    const [createdShiftId, setCreatedShiftId] = useState(null);

    const createShift = async (formData) => {
        try {
            // Create shift with PDFs in a single request
            const response = await fetch('/api/clientshiftrequests', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData // FormData with shift data + PDF files
            });

            if (response.ok) {
                const result = await response.json();
                setCreatedShiftId(result.shift.id);
                
                // Access attachment info from response
                if (result.shift.attachments) {
                    console.log('Uploaded attachments:', result.shift.attachments);
                }
            }
        } catch (error) {
            console.error('Shift creation failed:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Your existing shift form fields */}
            
            {/* PDF Upload Section */}
            <div className="pdf-upload-section">
                <label>Attach PDF Documents (Max 10 files, 6MB total):</label>
                <input
                    type="file"
                    name="pdfs"
                    multiple
                    accept=".pdf"
                    onChange={handlePDFSelection}
                />
            </div>
            
            <button type="submit">Create Shift</button>
        </form>
    );
};
```

---

## ⚠️ Error Handling

### **Common Error Responses:**

**400 Bad Request:**
```json
{
    "message": "Total attachment size exceeds 6MB limit",
    "details": "Current size: 7MB, Limit: 6MB"
}
```

**401 Unauthorized:**
```json
{
    "message": "Access token required"
}
```

**403 Forbidden:**
```json
{
    "message": "Access denied: You can only view attachments for shifts you are assigned to or created."
}
```

**404 Not Found:**
```json
{
    "message": "Shift request not found"
}
```

**413 Payload Too Large:**
```json
{
    "message": "File size too large"
}
```

**422 Unprocessable Entity:**
```json
{
    "message": "Only PDF files are allowed"
}
```

**500 Internal Server Error:**
```json
{
    "message": "Failed to upload attachment.",
    "error": "Server error details"
}
```

---

## 🔍 Testing Checklist

### **Frontend Testing Steps:**

1. **File Selection:**
   - ✅ Test PDF file selection
   - ✅ Test non-PDF file rejection
   - ✅ Test multiple file selection (up to 10)
   - ✅ Test size validation (6MB total limit)

2. **Upload Functionality:**
   - ✅ Test single file upload
   - ✅ Test multiple file upload
   - ✅ Test progress indicators
   - ✅ Test error handling

3. **Attachment Management:**
   - ✅ Test attachment list display
   - ✅ Test download functionality
   - ✅ Test delete functionality
   - ✅ Test access control (only authorized users)

4. **Integration:**
   - ✅ Test with shift creation form
   - ✅ Test with existing shifts
   - ✅ Test authentication token handling

---

## 📝 Important Notes

1. **File Key Names:**
   - Multiple attachments: Use `"pdfs"` (plural) as the form field name
   - Single attachment: Use `"pdf"` (singular) as the form field name

2. **Authorization:**
   - Always include JWT token in Authorization header
   - Token format: `Bearer {your_jwt_token}`

3. **File Validation:**
   - Only PDF files are accepted
   - Total size limit: 6MB across all files per shift
   - Maximum 10 files per upload request

4. **Browser Compatibility:**
   - Use FormData for file uploads
   - Handle blob responses for downloads
   - Consider polyfills for older browsers

5. **Performance:**
   - Show upload progress for large files
   - Implement loading states
   - Consider file compression for large PDFs

---

## 🚀 Ready for Implementation

This system is fully implemented and tested. All endpoints are live and ready for frontend integration. The database schema has been verified and corrected to work with the actual table structure.

**Next Steps:**
1. Implement the frontend components using the examples above
2. Test all functionality with real data
3. Deploy to production when ready

For any questions or issues during implementation, refer to this documentation or check the server logs for detailed error information.
