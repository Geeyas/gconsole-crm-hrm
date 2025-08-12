const { pool: db } = require('../config/db');
const winston = require('winston');
const { sendMail } = require('../mailer/mailer');
const mailTemplates = require('../mailer/templates');

let validTables = new Set(); // Stores valid table names

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

// Load all table names on app start
async function loadTableNames() {
  try {
    const [tables] = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = ?`, [process.env.DB_NAME]);
    validTables = new Set(tables.map(row => row.TABLE_NAME));
  } catch (err) {
    console.error('❌ Failed to load table names:', err);
  }
}

// Call this once at startup
loadTableNames();

function isValidTable(table) {
  return validTables.has(table);
}

// --- CONTROLLER FUNCTIONS ---

exports.getAllPaginated = async (req, res, next) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  try {
    let results, total;
    if (table.toLowerCase() === 'people') {
      const userType = req.user?.usertype;
      
      // Build WHERE clause based on user role
      let whereClause = 'p.deletedat IS NULL';
      let countWhereClause = 'p.deletedat IS NULL';
      
      // If Staff - Standard User, exclude System Admin users
      if (userType === 'Staff - Standard User') {
        whereClause += ' AND (ut.Name IS NULL OR ut.Name != "System Admin")';
        countWhereClause += ' AND (ut.Name IS NULL OR ut.Name != "System Admin")';
      }
      // System Admin can see all users (no additional filter)
      
      // Get total count from People (only non-deleted, with role-based filtering)
      const [countResult] = await db.query(`
        SELECT COUNT(*) as total 
        FROM People p
        LEFT JOIN Users u ON p.Linkeduserid = u.id
        LEFT JOIN Assignedusertypes au ON au.Userid = u.id
        LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
        WHERE ${countWhereClause}
      `);
      
      // Get paginated People with joined Users and Usertype, only non-deleted, with role-based filtering
      [results] = await db.query(`
        SELECT 
          p.*, 
          u.id AS user_id, u.username, u.email, u.fullname, u.Deletedat AS user_Deletedat, u.Deletedbyid AS user_Deletedbyid,
          ut.ID AS usertype_id, ut.Name AS usertype_name
        FROM People p
        LEFT JOIN Users u ON p.Linkeduserid = u.id
        LEFT JOIN Assignedusertypes au ON au.Userid = u.id
        LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
        WHERE ${whereClause}
        LIMIT ? OFFSET ?
      `, [limit, offset]);
    } else {
      // Generic for other tables
      const [countResult] = await db.query(`SELECT COUNT(*) as total FROM ??`, [table]);
      total = countResult[0]?.total || 0;
      [results] = await db.query(`SELECT * FROM ?? LIMIT ? OFFSET ?`, [table, limit, offset]);
    }
    res.status(200).json({
      data: results,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (err) {
    logger.error('Fetch error', { error: err });
    res.status(500).json({ message: 'Fetch error', error: err.message, code: 'FETCH_ERROR' });
  }
};


exports.getAll = async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  try {
    // Special handling for Clientlocations to filter by client active status
    if (table === 'Clientlocations') {
      const [results] = await db.query(`
        SELECT cl.* FROM Clientlocations cl
        LEFT JOIN Clients c ON cl.clientid = c.id
        WHERE cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
      `);
      return res.status(200).json(results);
    }

    // Check for Deletedat or deletedat column (case-insensitive)
    const [columns] = await db.query('SHOW COLUMNS FROM ??', [table]);
    const hasDeletedat = columns.some(col => col.Field.toLowerCase() === 'deletedat');
    let sql = `SELECT * FROM ??`;
    let params = [table];
    if (hasDeletedat) {
      sql += ' WHERE ?? IS NULL';
      // Find the actual column name (case preserved)
      const deletedatCol = columns.find(col => col.Field.toLowerCase() === 'deletedat').Field;
      params.push(deletedatCol);
    }
    const [results] = await db.query(sql, params);
    res.status(200).json(results);
  } catch (err) {
    logger.error('Fetch error', { error: err });
    res.status(500).json({ message: 'Fetch error', error: err.message, code: 'FETCH_ERROR' });
  }
};

exports.getOne = async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  try {
    const [results] = await db.query(`SELECT * FROM ?? WHERE id = ?`, [table, id]);
    if (results.length === 0) return res.status(404).json({ message: 'Record not found', code: 'NOT_FOUND' });
    res.status(200).json(results[0]);
  } catch (err) {
    logger.error('Fetch error', { error: err });
    res.status(500).json({ message: 'Fetch error', error: err.message, code: 'FETCH_ERROR' });
  }
};

exports.create = async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  try {
    // Special handling for People table - require proper registration
    if (table.toLowerCase() === 'people') {
      return res.status(400).json({ 
        message: 'Cannot create People records directly. Use /api/register endpoint for user registration.',
        code: 'USE_REGISTRATION_ENDPOINT'
      });
    }

    // Special handling for Clientlocations table
    if (table.toLowerCase() === 'clientlocations') {
      return await createClientLocation(req, res);
    }

    // Generic handling for other tables
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);

    const placeholders = fields.map(() => '?').join(', ');
    const query = `INSERT INTO ?? (${fields.join(', ')}) VALUES (${placeholders})`;
    const [results] = await db.query(query, [table, ...values]);
    res.status(201).json({ message: 'Record created', id: results.insertId });
  } catch (err) {
    logger.error('Insert error', { error: err });
    res.status(500).json({ message: 'Insert error', error: err.message, code: 'INSERT_ERROR' });
  }
};

// Special function for creating Clientlocations with all required fields
async function createClientLocation(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
  }

  const now = new Date();
  
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
  } = req.body;

  // Validate required fields
  if (!Clientid) {
    return res.status(400).json({ message: 'Clientid is required.' });
  }

  try {
    // Check if client exists
    const [clientCheck] = await db.query('SELECT ID FROM Clients WHERE ID = ?', [Clientid]);
    if (clientCheck.length === 0) {
      return res.status(400).json({ message: 'Invalid Clientid. Client does not exist.' });
    }

    // Helper function to handle undefined vs empty string
    const getValue = (value) => {
      return value === undefined ? null : value;
    };

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

    const insertValues = [
      Clientid,
      getValue(Locationtypeid),
      getValue(Locationfunctionid),
      getValue(Priorityid),
      getValue(LocationName),
      getValue(LocationAddress),
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
      userId, // Createdbyid
      now, // Updatedat
      userId, // Updatedbyid
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
    
    const [results] = await db.query(query, insertValues);
    
    // Fetch the created record to return complete data
    const [createdRecord] = await db.query('SELECT * FROM Clientlocations WHERE ID = ?', [results.insertId]);
    
    res.status(201).json({ 
      message: 'Client location created successfully', 
      id: results.insertId,
      record: createdRecord[0]
    });
  } catch (err) {
    logger.error('Create client location error', { error: err });
    res.status(500).json({ message: 'Failed to create client location.', error: err.message });
  }
}

exports.update = async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  try {
    // Special handling for Clientlocations table
    if (table.toLowerCase() === 'clientlocations') {
      return await updateClientLocation(req, res);
    }

    // Generic handling for other tables
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE ?? SET ${setClause} WHERE id = ?`;
    const [results] = await db.query(query, [table, ...values, id]);

    if (results.affectedRows === 0) return res.status(404).json({ message: 'Not found', code: 'NOT_FOUND' });
    res.status(200).json({ message: 'Record updated' });
  } catch (err) {
    logger.error('Update error', { error: err });
    res.status(500).json({ message: 'Update error', error: err.message, code: 'UPDATE_ERROR' });
  }
};

// Special function for updating Clientlocations with all required fields
async function updateClientLocation(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
  }

  const id = req.params.id;
  const now = new Date();
  
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
  } = req.body;

  try {
    // Check if the record exists and is not deleted
    const [existingRecord] = await db.query('SELECT * FROM Clientlocations WHERE ID = ? AND Deletedat IS NULL', [id]);
    if (existingRecord.length === 0) {
      return res.status(404).json({ message: 'Client location not found or has been deleted.' });
    }

    // If Clientid is being updated, validate it exists
    if (Clientid && Clientid !== existingRecord[0].Clientid) {
      const [clientCheck] = await db.query('SELECT ID FROM Clients WHERE ID = ?', [Clientid]);
      if (clientCheck.length === 0) {
        return res.status(400).json({ message: 'Invalid Clientid. Client does not exist.' });
      }
    }

    // Helper function to handle undefined vs empty string
    const getValue = (value) => {
      return value === undefined ? null : value;
    };

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
    updateValues.push(now);
    updateFields.push('Updatedbyid = ?');
    updateValues.push(userId);

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    // Log the update for debugging
    console.log('Updating client location with fields:', updateFields);
    console.log('Update values:', updateValues);

    const setClause = updateFields.join(', ');
    const query = `UPDATE Clientlocations SET ${setClause} WHERE ID = ?`;
    const [results] = await db.query(query, [...updateValues, id]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Client location not found.' });
    }

    // Fetch the updated record to return complete data
    const [updatedRecord] = await db.query('SELECT * FROM Clientlocations WHERE ID = ?', [id]);
    
    res.status(200).json({ 
      message: 'Client location updated successfully',
      record: updatedRecord[0]
    });
  } catch (err) {
    logger.error('Update client location error', { error: err });
    res.status(500).json({ message: 'Failed to update client location.', error: err.message });
  }
}

exports.remove = async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  try {
    // Special handling for Clientlocations table (soft delete)
    if (table.toLowerCase() === 'clientlocations') {
      return await deleteClientLocation(req, res);
    }

    // Generic handling for other tables (hard delete)
    const [results] = await db.query(`DELETE FROM ?? WHERE id = ?`, [table, id]);
    if (results.affectedRows === 0) return res.status(404).json({ message: 'Not found', code: 'NOT_FOUND' });
    res.status(200).json({ message: 'Record deleted' });
  } catch (err) {
    logger.error('Delete error', { error: err });
    res.status(500).json({ message: 'Delete error', error: err.message, code: 'DELETE_ERROR' });
  }
};

// Special function for soft deleting Clientlocations
async function deleteClientLocation(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
  }

  const id = req.params.id;
  const now = new Date();

  try {
    // Check if the record exists and is not already deleted
    const [existingRecord] = await db.query('SELECT * FROM Clientlocations WHERE ID = ? AND Deletedat IS NULL', [id]);
    if (existingRecord.length === 0) {
      return res.status(404).json({ message: 'Client location not found or has already been deleted.' });
    }

    // Perform soft delete
    const [results] = await db.query(
      'UPDATE Clientlocations SET Deletedat = ?, Deletedbyid = ? WHERE ID = ?',
      [now, userId, id]
    );

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Client location not found.' });
    }

    res.status(200).json({ message: 'Client location deleted successfully (soft delete)' });
  } catch (err) {
    logger.error('Delete client location error', { error: err });
    res.status(500).json({ message: 'Failed to delete client location.', error: err.message });
  }
}

// Get paginated People with joined Users and Usertype info
exports.getPeoplePaginated = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  try {
    // Get total count from People
    const [countResult] = await db.query(`SELECT COUNT(*) as total FROM People`);
    const total = countResult[0]?.total || 0;

    // Get paginated People with joined Users and Usertype
    const [results] = await db.query(`
      SELECT 
        p.*, 
        u.id AS user_id, u.username, u.email, u.fullname, u.Deletedat AS user_Deletedat, u.Deletedbyid AS user_Deletedbyid,
        ut.ID AS usertype_id, ut.Name AS usertype_name
      FROM People p
      LEFT JOIN Users u ON p.Linkeduserid = u.id
      LEFT JOIN Assignedusertypes au ON au.Userid = u.id
      LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.status(200).json({
      data: results,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (err) {
    logger.error('Fetch People paginated error', { error: err });
    res.status(500).json({ message: 'Fetch error', error: err.message, code: 'FETCH_ERROR' });
  }
};

/**
 * Handles POST /api/contact-admin
 * Sends email to admin and confirmation to user
 */
exports.contactAdmin = async (req, res) => {
  const { email, subject, message, source } = req.body;
  try {
    // Send to admin
    const adminMail = mailTemplates.contactAdminNotification({ email, subject, message, source });
    await sendMail({
      to: 'admin@ygit.tech',
      subject: adminMail.subject,
      html: adminMail.html,
      replyTo: email
    });
    // Send confirmation to user
    const userMail = mailTemplates.contactAdminConfirmation({ email, subject });
    await sendMail({
      to: email,
      subject: userMail.subject,
      html: userMail.html
    });
    return res.status(200).json({ success: true, message: 'Email sent successfully.' });
  } catch (err) {
    console.error('Contact admin email error', err);
    return res.status(500).json({ success: false, error: 'Failed to send email. Please try again later.' });
  }
};

/**
 * Handles POST /api/send-email
 * Sends email from admin/staff to specified recipient
 */
exports.sendEmail = async (req, res) => {
  const { subject, message, recipientEmail, recipientName } = req.body;
  const senderName = req.user?.fullname || req.user?.username || 'Admin';
  const senderEmail = req.user?.email || 'admin@gconsole.com';
  const sentAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  try {
    // Create email template
    const emailTemplate = mailTemplates.adminStaffEmail({
      subject,
      message,
      senderName,
      senderEmail,
      recipientName,
      recipientEmail,
      sentAt
    });

    // Send email
    await sendMail({
      to: recipientEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      replyTo: senderEmail
    });

    // Log the email sending
    logger.info(`Admin/Staff email sent`, {
      sender: senderName,
      senderEmail: senderEmail,
      recipient: recipientName || 'Unknown',
      recipientEmail: recipientEmail,
      subject: subject,
      timestamp: new Date().toISOString(),
      action: 'send_admin_email',
      userId: req.user?.id
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully.',
      data: {
        sentAt,
        recipient: recipientName || recipientEmail,
        subject
      }
    });
  } catch (err) {
    logger.error('Admin/Staff email error', { 
      error: err.message,
      sender: senderName,
      recipient: recipientEmail,
      subject: subject,
      userId: req.user?.id
    });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send email. Please try again later.' 
    });
  }
};
