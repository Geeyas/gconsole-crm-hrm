# 📄 PDF Attachment API Documentation for Frontend

## 🎯 Overview
This document provides complete API specifications and implementation guidance for downloading PDF attachments from shift requests.

## 🔐 Authentication & Access Control
All API endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <your_jwt_access_token>
```

### 🌐 **Open Access Policy**
**Important:** These PDF download APIs provide **open access** to any user with a valid JWT token, regardless of their role or relationship to the shift. This means:

✅ **Any authenticated user** can download any PDF attachment  
✅ **No role-based restrictions** (System Admin, Staff, Client, etc.)  
✅ **No ownership validation** (users can access PDFs from shifts they're not assigned to)  
✅ **Only requirement:** Valid JWT authentication token

This design allows maximum flexibility for document sharing across the organization.

---

## 📥 API Endpoints

### 1. Get All Attachments for a Shift
**Endpoint:** `GET /api/clientshiftrequests/{shiftId}/attachments`

**Description:** Retrieve all PDF attachments associated with a specific shift request.

**Parameters:**
- `shiftId` (path parameter): The ID of the shift request

**Response Example:**
```json
{
  "message": "Attachments retrieved successfully",
  "attachments": [
    {
      "id": 17,
      "fileName": "Tenant_Confirmation_Letter_6501DonalAve_2025 -.pdf",
      "fileSize": "166441",
      "fileExtension": ".pdf",
      "uploadedAt": "2025-09-28T04:29:30.000Z",
      "uploadedBy": 33
    },
    {
      "id": 18,
      "fileName": "Tenant_Confirmation_Letter_6501DonalAve_2025.pdf",
      "fileSize": "575464",
      "fileExtension": ".pdf",
      "uploadedAt": "2025-09-28T04:29:30.000Z",
      "uploadedBy": 33
    }
  ],
  "totalCount": 2
}
```

**Frontend Implementation:**
```typescript
async function getAllAttachments(shiftId: number): Promise<any> {
  const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get attachments: ${response.status}`);
  }

  return response.json();
}
```

---

### 2. Download PDF Attachment (Primary Endpoint)
**Endpoint:** `GET /api/clientshiftrequests/{shiftId}/attachments/{attachmentId}/download`

**Description:** Download a specific PDF attachment by shift ID and attachment ID.

**Parameters:**
- `shiftId` (path parameter): The ID of the shift request
- `attachmentId` (path parameter): The ID of the attachment

**Response:**
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="original_filename.pdf"`
- **Body:** PDF file binary data

**Frontend Implementation:**
```typescript
async function downloadPDFAttachment(shiftId: number, attachmentId: number): Promise<Blob> {
  const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments/${attachmentId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
  }

  // Return the PDF as a blob
  return response.blob();
}
```

---

### 3. Download PDF Attachment (Alternative Endpoint)
**Endpoint:** `GET /api/clientshiftrequests/attachments/{attachmentId}/download`

**Description:** Alternative endpoint for downloading PDF attachments without specifying shift ID.

**Parameters:**
- `attachmentId` (path parameter): The ID of the attachment

**Response:** Same as primary endpoint

**Frontend Implementation:**
```typescript
async function downloadPDFAttachmentAlt(attachmentId: number): Promise<Blob> {
  const response = await fetch(`/api/clientshiftrequests/attachments/${attachmentId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
  }

  return response.blob();
}
```

---

## 🔧 Complete Frontend Implementation Example

### React/TypeScript Implementation

```typescript
import React, { useState, useEffect } from 'react';

interface Attachment {
  id: number;
  fileName: string;
  fileSize: string;
  fileExtension: string;
  uploadedAt: string;
  uploadedBy: number;
}

interface PDFViewerProps {
  shiftId: number;
  isOpen: boolean;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ shiftId, isOpen, onClose }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get JWT token from your auth system
  const getAccessToken = (): string => {
    // Replace with your actual token retrieval logic
    return localStorage.getItem('access_token') || '';
  };

  // Load attachments when dialog opens
  useEffect(() => {
    if (isOpen && shiftId) {
      loadAttachments();
    }
  }, [isOpen, shiftId]);

  // Load all attachments for the shift
  const loadAttachments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load attachments: ${response.status}`);
      }

      const data = await response.json();
      setAttachments(data.attachments || []);

      // Auto-select first attachment if available
      if (data.attachments && data.attachments.length > 0) {
        selectAttachment(data.attachments[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  // Select and load a specific attachment
  const selectAttachment = async (attachment: Attachment) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedAttachment(attachment);

      // Clear previous PDF URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

      // Download the PDF
      const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments/${attachment.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      // Convert response to blob and create URL
      const pdfBlob = await response.blob();
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setLoading(false);
    }
  };

  // Download PDF file to user's device
  const downloadFile = async (attachment: Attachment) => {
    try {
      const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments/${attachment.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    }
  };

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!isOpen) return null;

  return (
    <div className="pdf-viewer-modal">
      <div className="pdf-viewer-content">
        <div className="pdf-viewer-header">
          <h2>PDF Attachments for Shift {shiftId}</h2>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="pdf-viewer-body">
          {/* Attachment List */}
          <div className="attachment-list">
            <h3>Attachments ({attachments.length})</h3>
            {attachments.map((attachment) => (
              <div 
                key={attachment.id}
                className={`attachment-item ${selectedAttachment?.id === attachment.id ? 'selected' : ''}`}
                onClick={() => selectAttachment(attachment)}
              >
                <div className="attachment-info">
                  <strong>{attachment.fileName}</strong>
                  <div className="attachment-meta">
                    Size: {Math.round(parseInt(attachment.fileSize) / 1024)}KB
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(attachment);
                  }}
                  className="download-btn"
                >
                  Download
                </button>
              </div>
            ))}
          </div>

          {/* PDF Viewer */}
          <div className="pdf-display">
            {loading && <div className="loading">Loading PDF...</div>}
            {error && <div className="error">Error: {error}</div>}
            {pdfUrl && !loading && (
              <iframe
                src={pdfUrl}
                width="100%"
                height="600px"
                title="PDF Viewer"
              />
            )}
            {!pdfUrl && !loading && !error && (
              <div className="no-pdf">Select an attachment to view</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
```

---

## 🚨 Error Handling

### Common HTTP Status Codes:
- **200**: Success - PDF downloaded successfully
- **401**: Unauthorized - Invalid or expired JWT token
- **403**: Forbidden - User doesn't have access to this attachment
- **404**: Not Found - Shift or attachment doesn't exist
- **500**: Internal Server Error - Backend issue (should be rare now)

### Error Response Format:
```json
{
  "message": "Error description",
  "error": "Detailed error information"
}
```

### Frontend Error Handling:
```typescript
const handleAPIError = (response: Response, defaultMessage: string): string => {
  if (response.status === 401) {
    // Redirect to login or refresh token
    return 'Authentication required. Please log in again.';
  } else if (response.status === 403) {
    return 'You do not have permission to access this attachment.';
  } else if (response.status === 404) {
    return 'Attachment not found.';
  } else if (response.status === 500) {
    return 'Server error. Please contact support.';
  }
  return defaultMessage;
};
```

---

## 🎯 Key Implementation Notes

### 1. **Authentication Token**
- Use **access tokens** (not refresh tokens) for API calls
- Include `Bearer ` prefix in Authorization header
- Handle token expiration gracefully

### 2. **File Handling**
- Use `response.blob()` to get PDF binary data
- Create object URLs with `URL.createObjectURL(blob)`
- **Always cleanup** object URLs with `URL.revokeObjectURL(url)`

### 3. **User Experience**
- Show loading states during API calls
- Display file size and metadata
- Provide both view and download options
- Handle errors gracefully with user-friendly messages

### 4. **Performance**
- Only load PDFs when needed (lazy loading)
- Cleanup blob URLs to prevent memory leaks
- Consider caching for frequently accessed files

### 5. **Browser Compatibility**
- Most modern browsers support PDF viewing in iframes
- Provide download fallback for unsupported browsers
- Test across different browsers and devices

---

## ✅ Testing Checklist

- [ ] Can retrieve attachment list for a shift
- [ ] Can download and view PDFs in browser
- [ ] Can download PDFs to device
- [ ] Error handling works for invalid tokens
- [ ] Error handling works for missing attachments
- [ ] Memory cleanup (no blob URL leaks)
- [ ] Works across different browsers
- [ ] Mobile responsive design

---

## 🔧 Backend Status
✅ **All PDF download endpoints are working correctly**  
✅ **Database issues have been resolved**  
✅ **Authentication is functioning properly**  
✅ **File storage integration is operational**  
✅ **Open access policy implemented** - Any valid JWT token grants access  

**The backend is ready for frontend integration!** 🚀

---

## 📋 **Quick Summary for Frontend Developer**

### **What Works Now:**
1. ✅ **All attachment downloads** - Database file paths fixed
2. ✅ **Open access** - Any authenticated user can download any PDF  
3. ✅ **Two endpoint options** - Choose whichever fits your URL structure
4. ✅ **Proper error handling** - Clear HTTP status codes and messages
5. ✅ **File metadata** - Get attachment lists with file info

### **Access Requirements:**
- 🔑 **Only requirement:** Valid JWT access token in `Authorization: Bearer <token>` header
- 🚫 **No role restrictions:** System Admin, Staff, Client all have equal access
- 🚫 **No ownership validation:** Can download PDFs from any shift
- ✅ **Maximum compatibility:** Works with your existing authentication system

### **Ready for Production:** 
The backend PDF system is fully operational and production-ready! 🎯
