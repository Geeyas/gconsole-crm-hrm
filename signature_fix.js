// ========================================
// CORRECTED SIGNATURE HANDLING FUNCTIONS
// ========================================

// Employee Update Function - Corrected Version
// Replace the client signature section in updateTimesheetEntry function (around line 387)

/*
REPLACE THIS SECTION:
if (client_signature !== undefined) {
  updateFields.push('Clientpersonalsignature = ?');
  updateValues.push(client_signature);
}

WITH THIS:
*/

if (client_signature !== undefined) {
  // Process client signature - remove data URL prefix if present
  let processedSignature = client_signature;
  if (client_signature && client_signature.startsWith('data:image')) {
    // Remove the data URL prefix to store only the base64 data
    processedSignature = client_signature.replace(/^data:image\/[^;]+;base64,/, '');
    logger.info('Processed signature for storage', { 
      originalLength: client_signature.length, 
      processedLength: processedSignature.length,
      entryId 
    });
  }
  
  updateFields.push('Clientpersonalsignature = ?');
  updateValues.push(processedSignature);
}

// ========================================

// Admin Update Function - Corrected Version  
// Replace the client signature section in updateTimesheetEntryAdmin function (around line 1082)

/*
REPLACE THIS SECTION:
if (client_signature !== undefined) {
  updateFields.push('Clientpersonalsignature = ?');
  updateValues.push(client_signature);
}

WITH THIS:
*/

if (client_signature !== undefined) {
  // Process client signature - remove data URL prefix if present
  let processedSignature = client_signature;
  if (client_signature && client_signature.startsWith('data:image')) {
    // Remove the data URL prefix to store only the base64 data
    processedSignature = client_signature.replace(/^data:image\/[^;]+;base64,/, '');
    logger.info('Admin processed signature for storage', { 
      originalLength: client_signature.length, 
      processedLength: processedSignature.length,
      entryId,
      adminId 
    });
  }
  
  updateFields.push('Clientpersonalsignature = ?');
  updateValues.push(processedSignature);
}

// ========================================
// INSTRUCTIONS:
// 1. Find the updateTimesheetEntry function (around line 272)
// 2. Find the client_signature handling section (around line 387)
// 3. Replace the simple assignment with the processed version above
// 4. Find the updateTimesheetEntryAdmin function (around line 967)
// 5. Find the client_signature handling section (around line 1082)
// 6. Replace the simple assignment with the processed version above
// ======================================== 