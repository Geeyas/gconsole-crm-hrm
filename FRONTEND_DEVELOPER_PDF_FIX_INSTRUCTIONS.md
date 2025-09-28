# 📋 Frontend Developer Instructions - PDF Download Fix

## 🚨 **Issue Summary**
PDF attachments can be retrieved via API but download/view functionality is failing due to **incorrect API endpoints** and **authentication issues**.

## 🔧 **Root Cause Analysis**
1. **404 Not Found**: Frontend is calling wrong download endpoints
2. **401 Unauthorized**: JWT authentication token not being sent properly

---

## ✅ **SOLUTION 1: Use Correct API Endpoints (RECOMMENDED)**

### **Current (Wrong) Endpoint:**
```javascript
❌ GET /api/clientshiftrequests/attachments/17/download
```

### **Correct Endpoint:**
```javascript
✅ GET /api/clientshiftrequests/{shiftId}/attachments/{attachmentId}/download
```

### **Implementation Example:**
```javascript
// ✅ CORRECT - Download PDF
const downloadPDF = async (shiftId, attachmentId, fileName) => {
  const response = await fetch(`/api/clientshiftrequests/${shiftId}/attachments/${attachmentId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Usage
downloadPDF(190, 17, 'document.pdf');
```

---

## ✅ **SOLUTION 2: Alternative Endpoint (If you prefer current format)**

Backend has been updated to support your current endpoint format, but you need to fix authentication:

### **Your Current Endpoint (Now Works):**
```javascript
✅ GET /api/clientshiftrequests/attachments/{attachmentId}/download
```

### **Authentication Fix Required:**
```javascript
// ✅ ENSURE JWT TOKEN IS PROPERLY SENT
const downloadPDF = async (attachmentId, fileName) => {
  // Make sure you're getting the token correctly
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const response = await fetch(`/api/clientshiftrequests/attachments/${attachmentId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type for file downloads
    }
  });
  
  if (response.status === 401) {
    throw new Error('Authentication failed - token may be expired');
  }
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  
  const blob = await response.blob();
  // Handle blob as needed...
};
```

---

## 🔍 **Authentication Debugging**

### **Check Your Token:**
```javascript
// Debug your authentication
const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
console.log('Token exists:', !!token);
console.log('Token length:', token?.length);
console.log('Token preview:', token?.substring(0, 50));

// Check if token is properly formatted
if (token && !token.startsWith('eyJ')) {
  console.error('Token does not appear to be a valid JWT');
}
```

### **Verify Headers:**
```javascript
const headers = {
  'Authorization': `Bearer ${token}`
};
console.log('Request headers:', headers);
```

---

## 📋 **Complete API Reference**

| **Endpoint** | **Method** | **Purpose** | **Parameters** |
|-------------|------------|-------------|----------------|
| `/api/clientshiftrequests/{shiftId}/attachments` | **GET** | Get all attachments for a shift | `shiftId`: Shift request ID |
| `/api/clientshiftrequests/{shiftId}/attachments/{attachmentId}/download` | **GET** | Download specific attachment | `shiftId`: Shift ID, `attachmentId`: Attachment ID |
| `/api/clientshiftrequests/attachments/{attachmentId}/download` | **GET** | Alternative download endpoint | `attachmentId`: Attachment ID |

---

## 🧪 **Testing Steps**

### **1. Test with Postman/curl:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/clientshiftrequests/190/attachments/17/download
```

### **2. Check Browser Network Tab:**
- Verify `Authorization` header is sent
- Check token format: should start with `eyJ`
- Ensure no CORS issues

### **3. Console Debugging:**
```javascript
// Add this to your download function for debugging
console.log('Attempting download with:');
console.log('- ShiftID:', shiftId);
console.log('- AttachmentID:', attachmentId);
console.log('- Token:', token ? 'Present' : 'Missing');
console.log('- Token valid:', token && token.startsWith('eyJ'));
```

---

## ⚠️ **Common Issues & Solutions**

| **Error** | **Cause** | **Solution** |
|-----------|-----------|--------------|
| **404 Not Found** | Wrong endpoint URL | Use correct endpoint format with shiftId |
| **401 Unauthorized** | Missing/invalid JWT token | Ensure token is properly stored and sent |
| **500 Internal Server Error** | Server-side issue | Check server logs, may be data issue |
| **CORS Error** | Cross-origin request blocked | Ensure same-origin or proper CORS setup |

---

## 🎯 **Action Items**

### **IMMEDIATE (Choose One):**
- [ ] **Option A**: Update all download calls to use `/api/clientshiftrequests/{shiftId}/attachments/{attachmentId}/download`
- [ ] **Option B**: Fix JWT authentication for existing `/api/clientshiftrequests/attachments/{attachmentId}/download` calls

### **DEBUGGING:**
- [ ] Add console logging to verify token presence and format
- [ ] Test with browser network tab to see actual request headers
- [ ] Verify token is being sent in `Authorization: Bearer {token}` format

### **TESTING:**
- [ ] Test download functionality with a known working PDF attachment
- [ ] Verify both view and download operations work
- [ ] Check that proper filename is used for downloads

---

## 💬 **Need Help?**
If you encounter issues:
1. Share the browser console logs
2. Share the network request details from browser dev tools
3. Confirm which authentication method you're using (localStorage/sessionStorage)
4. Let us know which endpoint approach you prefer (Option A or B)

**Backend is ready and working - the issue is on the frontend authentication and endpoint usage.**

---
*Last Updated: September 28, 2025*  
*Backend Developer: Ready to assist with any clarifications*
