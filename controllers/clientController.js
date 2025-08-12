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
  
  // Check if client with same name already exists
  try {
    const [existing] = await pool.query(
      'SELECT COUNT(*) as count FROM Clients WHERE Name = ? AND Deletedat IS NULL',
      [Name]
    );
    
    if (existing[0].count > 0) {
      return res.status(400).json({ 
        message: 'A client with this name already exists',
        code: 'DUPLICATE_CLIENT_NAME'
      });
    }
  } catch (err) {
    logger.error('Error checking for duplicate client name', { error: err });
    return res.status(500).json({ message: 'Failed to validate client name', error: err.message });
  }
  
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
    // Check if client exists
    const [clientCheck] = await pool.query('SELECT ID FROM Clients WHERE ID = ?', [Clientid]);
    if (clientCheck.length === 0) {
      return res.status(400).json({ message: 'Invalid Clientid. Client does not exist.' });
    }

    // Helper function to handle undefined vs empty string
    const getValue = (value) => {
      return value === undefined ? null : value;
    };

    // Extract all possible fields from request body
    const {
      Locationtypeid,
      Locationfunctionid,
      Priorityid,
      Country,
      State,
      Suburb,
      Postcode,
      Contactphonenumber,
      Email,
      WebsiteURL,
      Fax,
      Invoiceemail,
      Isgst,
      Ispayrolltaxexempt,
      Currency,
      Iscontactaddresssame,
      Contactlocationaddress,
      Contactcountry,
      Contactsuburb,
      Contactpostcode,
      Additionalvalue
    } = fields;

    // Prepare the insert query with all fields
    const insertFields = [
      'Clientid',
      'Locationtypeid',
      'Locationfunctionid', 
      'Priorityid',
      'LocationName',
      'LocationAddress',
      'Country',
      'State',
      'Suburb',
      'Postcode',
      'Contactphonenumber',
      'Email',
      'WebsiteURL',
      'Fax',
      'Invoiceemail',
      'Isgst',
      'Ispayrolltaxexempt',
      'Currency',
      'Iscontactaddresssame',
      'Contactlocationaddress',
      'Contactcountry',
      'Contactsuburb',
      'Contactpostcode',
      'Additionalvalue',
      'Createdat',
      'Createdbyid',
      'Updatedat',
      'Updatedbyid',
      'Sysstarttime'
    ];

    const now = new Date();
    const insertValues = [
      Clientid,
      getValue(Locationtypeid),
      getValue(Locationfunctionid),
      getValue(Priorityid),
      LocationName,
      LocationAddress,
      getValue(Country),
      getValue(State),
      getValue(Suburb),
      getValue(Postcode),
      getValue(Contactphonenumber),
      getValue(Email),
      getValue(WebsiteURL),
      getValue(Fax),
      getValue(Invoiceemail),
      getValue(Isgst),
      getValue(Ispayrolltaxexempt),
      getValue(Currency),
      getValue(Iscontactaddresssame),
      getValue(Contactlocationaddress),
      getValue(Contactcountry),
      getValue(Contactsuburb),
      getValue(Contactpostcode),
      getValue(Additionalvalue),
      now, // Createdat
      req.user.id, // Createdbyid
      now, // Updatedat
      req.user.id, // Updatedbyid
      now  // Sysstarttime
    ];

    // Log the values for debugging
    console.log('Creating client location with values:', {
      Clientid,
      LocationName,
      LocationAddress,
      Country,
      State,
      Suburb,
      Postcode,
      Email
    });

    const placeholders = insertValues.map(() => '?').join(', ');
    const query = `INSERT INTO Clientlocations (${insertFields.join(', ')}) VALUES (${placeholders})`;
    
    const [result] = await pool.query(query, insertValues);
    
    // Fetch the created record to return complete data
    const [createdRecord] = await pool.query('SELECT * FROM Clientlocations WHERE ID = ?', [result.insertId]);
    
    res.status(201).json({ 
      message: 'Client location created successfully', 
      id: result.insertId,
      record: createdRecord[0]
    });
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
  
  try {
    // Check if the record exists and is not deleted
    const [existingRecord] = await pool.query('SELECT * FROM Clientlocations WHERE ID = ? AND Deletedat IS NULL', [locationId]);
    if (existingRecord.length === 0) {
      return res.status(404).json({ message: 'Client location not found or has been deleted.' });
    }

    // Helper function to handle undefined vs empty string
    const getValue = (value) => {
      return value === undefined ? null : value;
    };

    // Extract all possible fields from request body
    const {
      Clientid,
      Locationtypeid,
      Locationfunctionid,
      Priorityid,
      LocationName,
      LocationAddress,
      Country,
      State,
      Suburb,
      Postcode,
      Contactphonenumber,
      Email,
      WebsiteURL,
      Fax,
      Invoiceemail,
      Isgst,
      Ispayrolltaxexempt,
      Currency,
      Iscontactaddresssame,
      Contactlocationaddress,
      Contactcountry,
      Contactsuburb,
      Contactpostcode,
      Additionalvalue
    } = fields;

    // If Clientid is being updated, validate it exists
    if (Clientid && Clientid !== existingRecord[0].Clientid) {
      const [clientCheck] = await pool.query('SELECT ID FROM Clients WHERE ID = ?', [Clientid]);
      if (clientCheck.length === 0) {
        return res.status(400).json({ message: 'Invalid Clientid. Client does not exist.' });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    // Add all fields that are provided in the request (including empty strings)
    if (Clientid !== undefined) { updateFields.push('Clientid = ?'); updateValues.push(Clientid); }
    if (Locationtypeid !== undefined) { updateFields.push('Locationtypeid = ?'); updateValues.push(getValue(Locationtypeid)); }
    if (Locationfunctionid !== undefined) { updateFields.push('Locationfunctionid = ?'); updateValues.push(getValue(Locationfunctionid)); }
    if (Priorityid !== undefined) { updateFields.push('Priorityid = ?'); updateValues.push(getValue(Priorityid)); }
    if (LocationName !== undefined) { updateFields.push('LocationName = ?'); updateValues.push(getValue(LocationName)); }
    if (LocationAddress !== undefined) { updateFields.push('LocationAddress = ?'); updateValues.push(getValue(LocationAddress)); }
    if (Country !== undefined) { updateFields.push('Country = ?'); updateValues.push(getValue(Country)); }
    if (State !== undefined) { updateFields.push('State = ?'); updateValues.push(getValue(State)); }
    if (Suburb !== undefined) { updateFields.push('Suburb = ?'); updateValues.push(getValue(Suburb)); }
    if (Postcode !== undefined) { updateFields.push('Postcode = ?'); updateValues.push(getValue(Postcode)); }
    if (Contactphonenumber !== undefined) { updateFields.push('Contactphonenumber = ?'); updateValues.push(getValue(Contactphonenumber)); }
    if (Email !== undefined) { updateFields.push('Email = ?'); updateValues.push(getValue(Email)); }
    if (WebsiteURL !== undefined) { updateFields.push('WebsiteURL = ?'); updateValues.push(getValue(WebsiteURL)); }
    if (Fax !== undefined) { updateFields.push('Fax = ?'); updateValues.push(getValue(Fax)); }
    if (Invoiceemail !== undefined) { updateFields.push('Invoiceemail = ?'); updateValues.push(getValue(Invoiceemail)); }
    if (Isgst !== undefined) { updateFields.push('Isgst = ?'); updateValues.push(getValue(Isgst)); }
    if (Ispayrolltaxexempt !== undefined) { updateFields.push('Ispayrolltaxexempt = ?'); updateValues.push(getValue(Ispayrolltaxexempt)); }
    if (Currency !== undefined) { updateFields.push('Currency = ?'); updateValues.push(getValue(Currency)); }
    if (Iscontactaddresssame !== undefined) { updateFields.push('Iscontactaddresssame = ?'); updateValues.push(getValue(Iscontactaddresssame)); }
    if (Contactlocationaddress !== undefined) { updateFields.push('Contactlocationaddress = ?'); updateValues.push(getValue(Contactlocationaddress)); }
    if (Contactcountry !== undefined) { updateFields.push('Contactcountry = ?'); updateValues.push(getValue(Contactcountry)); }
    if (Contactsuburb !== undefined) { updateFields.push('Contactsuburb = ?'); updateValues.push(getValue(Contactsuburb)); }
    if (Contactpostcode !== undefined) { updateFields.push('Contactpostcode = ?'); updateValues.push(getValue(Contactpostcode)); }
    if (Additionalvalue !== undefined) { updateFields.push('Additionalvalue = ?'); updateValues.push(getValue(Additionalvalue)); }

    // Always update audit fields
    updateFields.push('Updatedat = ?');
    updateValues.push(new Date());
    updateFields.push('Updatedbyid = ?');
    updateValues.push(req.user.id);

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    // Log the update for debugging
    console.log('Updating client location with fields:', updateFields);
    console.log('Update values:', updateValues);

    const setClause = updateFields.join(', ');
    const query = `UPDATE Clientlocations SET ${setClause} WHERE ID = ?`;
    const [results] = await pool.query(query, [...updateValues, locationId]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Client location not found.' });
    }

    // Fetch the updated record to return complete data
    const [updatedRecord] = await pool.query('SELECT * FROM Clientlocations WHERE ID = ?', [locationId]);
    
    res.status(200).json({ 
      message: 'Client location updated successfully',
      record: updatedRecord[0]
    });
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
