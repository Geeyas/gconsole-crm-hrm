// controllers/clientController.js
const { pool } = require('../config/db');
const { logger } = require('../middleware/requestLogger');

// Helper: Check if user is Systemadmin or Staff
function isStaffOrAdmin(user) {
  return user && (user.usertype === 'System Admin' || user.usertype === 'Staff - Standard User');
}

// Helper: Validation rules for Clients fields
const clientFieldValidators = {
  Additionalvalue: { type: 'string', max: 255 },
  ABN: { type: 'string', max: 32 },
  Industryid: { type: 'integer' },
  Typeid: { type: 'integer' },
  Clientuniqueid: { type: 'string', max: 64 },
  Priorityid: { type: 'integer' },
  Statusid: { type: 'integer' },
  IsInactive: { type: 'integer' },
  Logoattachmentid: { type: 'integer' },
};

function validateClientFields(fields) {
  for (const [key, value] of Object.entries(fields)) {
    const rule = clientFieldValidators[key];
    if (!rule) continue; // skip unknown fields (already filtered)
    if (rule.type === 'integer') {
      if (value !== null && value !== undefined && (typeof value !== 'number' || !Number.isInteger(value))) {
        return `${key} must be an integer`;
      }
    }
    if (rule.type === 'string') {
      if (value !== null && value !== undefined && typeof value !== 'string') {
        return `${key} must be a string`;
      }
      if (rule.max && typeof value === 'string' && value.length > rule.max) {
        return `${key} must not exceed ${rule.max} characters`;
      }
    }
  }
  return null;
}

// ========== CLIENTS ==========

// Create a new client
exports.createClient = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const { Name, ...fields } = req.body;
  if (!Name) return res.status(400).json({ message: 'Name is required' });
  // Validate fields
  const validationError = validateClientFields(fields);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }
  try {
    // List of system fields to ignore
    const systemFields = [
      'ID', 'Createdat', 'Createdbyid', 'Updatedat', 'Updatedbyid', 'Deletedat', 'Deletedbyid', 'Sysstarttime'
    ];
    // List of valid columns in Clients table (add more as needed)
    const validColumns = [
      'Additionalvalue', 'ABN', 'Industryid', 'Typeid', 'Clientuniqueid', 'Priorityid', 'Statusid', 'IsInactive', 'Logoattachmentid'
    ];
    // Filter out system fields, fields with empty/undefined/null values, and only allow valid columns
    const filteredFields = Object.entries(fields)
      .filter(([key, value]) =>
        key &&
        !systemFields.includes(key) &&
        validColumns.includes(key) &&
        value !== undefined &&
        value !== null &&
        key.trim() !== ''
      )
      .reduce((obj, [key, value]) => { obj[key] = value; return obj; }, {});
    // Always build columns/values arrays correctly
    const extraColumns = Object.keys(filteredFields);
    const columns = ['Name', ...extraColumns, 'Createdat', 'Createdbyid', 'Updatedat', 'Updatedbyid'];
    // Use NOW() for Createdat and Updatedat, and ? for the rest
    const placeholders = columns.map(col => (col === 'Createdat' || col === 'Updatedat') ? 'NOW()' : '?');
    // Only add values for columns that use ?
    const values = [Name, ...extraColumns.map(k => filteredFields[k]), req.user.id, req.user.id];
    // Remove values for NOW() columns
    // (values array already matches the number of ? placeholders)
    if (placeholders.filter(p => p === '?').length !== values.length) {
      return res.status(400).json({ message: 'Invalid payload: columns and values length mismatch' });
    }
    const sql = `INSERT INTO Clients (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const [result] = await pool.query(sql, values);
    res.status(201).json({ message: 'Client created', id: result.insertId });
  } catch (err) {
    // Optionally log SQL and values for debugging
    // console.error('SQL:', sql, 'VALUES:', values);
    res.status(500).json({ message: 'Failed to create client', error: err.message });
  }
};

// Update a client
exports.updateClient = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const clientId = req.params.id;
  const { Name, ...fields } = req.body;
  if (!Name && Object.keys(fields).length === 0) {
    return res.status(400).json({ message: 'At least one field is required to update' });
  }
  // Validate fields
  const validationError = validateClientFields(fields);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }
  try {
    // Build dynamic SET clause
    const updates = [];
    const params = [];
    if (Name) {
      updates.push('Name = ?');
      params.push(Name);
    }
    for (const [key, value] of Object.entries(fields)) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
    updates.push('Updatedat = NOW()');
    updates.push('Updatedbyid = ?');
    params.push(req.user.id);
    params.push(clientId);
    const sql = `UPDATE Clients SET ${updates.join(', ')} WHERE ID = ? AND Deletedat IS NULL`;
    await pool.query(sql, params);
    res.status(200).json({ message: 'Client updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update client', error: err.message });
  }
};

// Soft-delete a client and all linked locations
exports.deleteClient = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const clientId = req.params.id;
  try {
    // Soft-delete the client
    await pool.query(
      'UPDATE Clients SET Deletedat = NOW(), Deletedbyid = ? WHERE ID = ? AND Deletedat IS NULL',
      [req.user.id, clientId]
    );
    // Soft-delete all linked client locations
    await pool.query(
      'UPDATE Clientlocations SET Deletedat = NOW(), Deletedbyid = ? WHERE Clientid = ? AND Deletedat IS NULL',
      [req.user.id, clientId]
    );
    logger.warn(`Client deleted: ${clientId}`, {
      user: req.user ? { id: req.user.id, email: req.user.email, role: req.user.usertype } : 'anonymous',
      action: 'delete_client',
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    res.status(200).json({ message: 'Client and all linked locations deleted (soft)' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete client', error: err.message });
  }
};

// ========== CLIENT LOCATIONS ==========

// Create a new client location
exports.createClientLocation = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const { Clientid, LocationName, LocationAddress, ...fields } = req.body;
  if (!Clientid || !LocationName || !LocationAddress) {
    return res.status(400).json({ message: 'Clientid, LocationName, and LocationAddress are required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO Clientlocations (Clientid, LocationName, LocationAddress, Createdat, Createdbyid, Updatedat, Updatedbyid) VALUES (?, ?, ?, NOW(), ?, NOW(), ?)',
      [Clientid, LocationName, LocationAddress, req.user.id, req.user.id]
    );
    res.status(201).json({ message: 'Client location created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create client location', error: err.message });
  }
};

// Update a client location
exports.updateClientLocation = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const locationId = req.params.id;
  const fields = req.body;
  // List of valid columns in Clientlocations table (add more as needed)
  const validColumns = [
    'Clientid', 'Locationtypeid', 'Locationfunctionid', 'LocationName', 'LocationAddress', 'Country', 'State', 'Suburb', 'Postcode', 'Email', 'Fax', 'WebsiteURL', 'Contactcountry', 'Contactlocationaddress', 'Contactphonenumber', 'Contactpostcode', 'Contactsuburb', 'Iscontactaddresssame'
  ];
  // Filter only valid columns and skip system fields
  const updates = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    if (validColumns.includes(key)) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (updates.length === 0) {
    return res.status(400).json({ message: 'No valid fields provided for update' });
  }
  updates.push('Updatedat = NOW()');
  updates.push('Updatedbyid = ?');
  params.push(req.user.id);
  params.push(locationId);
  try {
    const sql = `UPDATE Clientlocations SET ${updates.join(', ')} WHERE ID = ? AND Deletedat IS NULL`;
    await pool.query(sql, params);
    res.status(200).json({ message: 'Client location updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update client location', error: err.message });
  }
};

// Soft-delete a client location
exports.deleteClientLocation = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const locationId = req.params.id;
  try {
    await pool.query(
      'UPDATE Clientlocations SET Deletedat = NOW(), Deletedbyid = ? WHERE ID = ? AND Deletedat IS NULL',
      [req.user.id, locationId]
    );
    res.status(200).json({ message: 'Client location deleted (soft)' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete client location', error: err.message });
  }
};
