const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { hashPassword, generateSalt } = require('../utils/hashUtils');
const winston = require('winston');
const { sendMail } = require('../mailer/mailer');
const mailTemplates = require('../mailer/templates');

const jwtSecret = process.env.JWT_SECRET;

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

// Date formatting helpers for shift endpoints
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDateTime(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 16); // YYYY-MM-DD HH:mm
}

// ================== login ==================
// Authenticates a user and returns a JWT token if credentials are valid.
exports.login = async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required' });

  const query = `
    SELECT u.*, ut.ID AS usertype_id, ut.Name AS usertype_name, p.ID AS portal_id, p.Name AS portal_name
    FROM Users u
    LEFT JOIN Assignedusertypes au ON au.Userid = u.id
    LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
    LEFT JOIN Portals p ON ut.Portalid = p.ID
    WHERE u.username = ?
  `;

  try {
    const [results] = await db.query(query, [username]);
    if (results.length === 0)
      return res.status(401).json({ message: 'Invalid username or password', code: 'INVALID_CREDENTIALS' });

    const user = results[0];
    if (user.deletedat) {
      return res.status(403).json({ message: 'User account has been deleted', code: 'USER_DELETED' });
    }
    const hashedInput = hashPassword(password, user.salt);
    if (hashedInput !== user.passwordhash)
      return res.status(401).json({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });

    // Access Token (short-lived)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        usertype_id: user.usertype_id,
        usertype: user.usertype_name,
        portal_id: user.portal_id,
        portal: user.portal_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Refresh Token (long-lived)
    // const refreshToken = jwt.sign(
    //   { id: user.id },
    //   process.env.REFRESH_TOKEN_SECRET,
    //   { expiresIn: '4h' }
    // );

    // Send refresh token as HTTP-only cookie
    // res.cookie('refreshToken', refreshToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production', // true in production
    //   sameSite: 'Strict',
    //   maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days

    // });

    res.status(200).json({
      message: 'Login successful',
      token,
      usertype: user.usertype_name,
      portal: user.portal_name
    });
  } catch (err) {
    logger.error('Login DB error', { error: err });
    res.status(500).json({ message: 'DB error', error: err.message, code: 'DB_ERROR' });
  }
};
// ================== end login ==================

// ================== refreshToken ==================
// Issues a new JWT token using a valid refresh token.
exports.refreshToken = (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token found' });

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired refresh token' });

    const newtoken = jwt.sign(
      {
        id: decoded.id
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({ token: newtoken });
  });
};
// ================== end refreshToken ==================

// ================== register ==================
// Registers a new user and links them to a person and usertype.
exports.register = async (req, res) => {
  const { firstname, lastname, username, email, password, usertype_id } = req.body;
  const creatorId = req.user?.id;

  if (!creatorId) {
    return res.status(401).json({ message: 'Unauthorized. Creator ID not found.' });
  }

  if (!firstname || !lastname || !username || !email || !password || !usertype_id) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [existing] = await db.query(
      'SELECT COUNT(*) AS count FROM Users WHERE email = ?',
      [email]
    );

    if (existing[0].count > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    const fullname = `${firstname} ${lastname}`;

    const [peopleResult] = await db.query(
      `INSERT INTO People (Firstname, Lastname, Emailaddress, Createdat, Createdbyid, Updatedat, Updatedbyid)
       VALUES (?, ?, ?, NOW(), ?, NOW(), ?)`,
      [firstname, lastname, email, creatorId, creatorId]
    );

    const personId = peopleResult.insertId;

    const [userResult] = await db.query(
      `INSERT INTO Users (fullname, username, email, passwordhash, salt, createdat, createdbyid, updatedat, updatedbyid)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)`,
      [fullname, username, email, hash, salt, creatorId, creatorId]
    );

    const userId = userResult.insertId;

    await db.query(
      'UPDATE People SET Linkeduserid = ? WHERE ID = ?',
      [userId, personId]
    );

    await db.query(
      `INSERT INTO Assignedusertypes (Userid, Usertypeid, Createdat, Createdbyid, Updatedbyid)
       VALUES (?, ?, NOW(), ?, ?)`,
      [userId, usertype_id, creatorId, creatorId]
    );

    res.status(201).json({ message: 'User registered successfully', userId });

  } catch (err) {
    logger.error('Register error', { error: err });
    res.status
  }
};
// ================== end register ==================

// ================== updatePassword ==================
// Allows staff or admin to update a user's password.
exports.updatePassword = async (req, res) => {
  const { username, newPassword } = req.body;
  const updaterId = req.user?.id;

  // Only Staff - Standard User or System Admin can update passwords
  if (req.user?.usertype !== 'Staff - Standard User' && req.user?.usertype !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can update passwords.' });
  }

  // Defensive: Accept both application/json and urlencoded
  if (!username || !newPassword) {
    if (req.body.body && req.body.body.username && req.body.body.newPassword) {
      req.body = req.body.body;
    }
  }

  if (!username || !newPassword)
    return res.status(400).json({ message: 'Missing fields' });

  // Password security validation
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!passwordPolicy.test(newPassword)) {
    return res.status(400).json({
      message: 'Password does not meet security requirements. It must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
    });
  }

  try {
    const [results] = await db.query('SELECT * FROM Users WHERE username = ?', [username]);
    if (results.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const newSalt = generateSalt();
    const newHash = hashPassword(newPassword, newSalt);

    await db.query(
      'UPDATE Users SET passwordhash = ?, salt = ?, updatedat = NOW(), updatedbyid = ? WHERE username = ?',
      [newHash, newSalt, updaterId, username]
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error('Password update error', { error: err });
    res.status(500).json({ message: 'Password update failed', error: err });
  }
};
// ================== end updatePassword ==================

// ================== getAllTables ==================
// Returns a list of all tables in the current database.
exports.getAllTables = async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
    );
    const tables = results.map(row => row.TABLE_NAME);
    res.status(200).json({ tables });
  } catch (err) {
    logger.error('Table fetch error', { error: err });
    res.status(500).json({ message: 'Database error', error: err });
  }
};
// ================== end getAllTables ==================

// ================== getUsertypeByPersonId ==================
// Retrieves usertype and portal info for a given person ID.
exports.getUsertypeByPersonId = async (req, res) => {
  const personId = req.params.id;

  const query = `
    SELECT u.*, ut.ID AS usertype_id, ut.Name AS usertype_name, 
           p.ID AS portal_id, p.Name AS portal_name
    FROM Users u
    LEFT JOIN Assignedusertypes au ON au.Userid = u.id
    LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
    LEFT JOIN Portals p ON ut.Portalid = p.ID
    WHERE u.id = ?
  `;

  try {
    const [results] = await db.query(query, [personId]);
    if (results.length === 0)
      return res.status(404).json({ message: 'User not found' });

    res.status(200).json(results[0]);
  } catch (err) {
    logger.error('Usertype fetch error', { error: err });
    res.status(500).json({ message: 'Database error', error: err });
  }
};
// ================== end getUsertypeByPersonId ==================

// ================== updateUserProfile ==================
// Updates the profile information for a person and their linked user.
exports.updateUserProfile = async (req, res) => {
  const personId = req.params.id;
  const updaterId = req.user?.id;

  // Extract all fields for People table
  const {
    Firstname,
    Lastname,
    Middlename,
    Preferredname,
    Emailaddress,
    Country,
    State,
    Suburb,
    Postcode,
    HomeAddress,
    Workaddress,
    TFN,
    BSB,
    Bankaccountnumber
  } = req.body;

  try {
    // Check if person exists in People table
    const [personRows] = await db.query(`SELECT * FROM People WHERE ID = ?`, [personId]);
    if (personRows.length === 0) {
      return res.status(404).json({ message: 'User not found in People table' });
    }
    // Print type and value for deletedAt for deep debugging
    const deletedAt = personRows[0].Deletedat || personRows[0].deletedat || personRows[0].DELETEDAT;
    if (deletedAt !== null && deletedAt !== undefined && String(deletedAt).trim() !== '') {
      return res.status(400).json({ message: 'Cannot update a soft-deleted person.' });
    }
    const linkedUserId = personRows[0].Linkeduserid;

    // Update People table
    await db.query(
      `UPDATE People SET
        Firstname = ?, Lastname = ?, Middlename = ?, Preferredname = ?, Emailaddress = ?, 
        Country = ?, State = ?, Suburb = ?, Postcode = ?, HomeAddress = ?, Workaddress = ?, 
        TFN = ?, BSB = ?, Bankaccountnumber = ?, 
        Updatedat = NOW(), Updatedbyid = ?
       WHERE ID = ?`,
      [
        Firstname, Lastname, Middlename, Preferredname, Emailaddress,
        Country, State, Suburb, Postcode, HomeAddress, Workaddress,
        TFN, BSB, Bankaccountnumber,
        updaterId, personId
      ]
    );

    // If linked user exists, update Users table as well
    if (linkedUserId) {
      const fullname = `${Firstname} ${Lastname}`;
      await db.query(
        `UPDATE Users SET fullname = ?, email = ?, username = ?, updatedat = NOW(), updatedbyid = ? WHERE id = ?`,
        [fullname, Emailaddress, Emailaddress, updaterId, linkedUserId]
      );
    }

    res.status(200).json({ message: 'User profile updated successfully' });
  } catch (err) {
    logger.error('Update error', { error: err });
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};
// ================== end updateUserProfile ==================

// ================== createClientShiftRequest ==================
// Creates a new client shift request and related staff shifts.
exports.createClientShiftRequest = async (req, res) => {
  const dbConn = db;
  const {
    clientlocationid,
    shiftdate,
    starttime,
    endtime,
    qualificationgroupid, // NEW: use group instead of qualificationid
    totalrequiredstaffnumber,
    additionalvalue
  } = req.body;
  const createdbyid = req.user?.id || req.body.createdbyid;
  const updatedbyid = createdbyid;
  const now = new Date();
  const userType = req.user?.usertype;

  try {
    // Get Clientid from Clientlocations (case sensitive)
    const locationSql = 'SELECT Clientid FROM Clientlocations WHERE ID = ?';
    const [locationRows] = await dbConn.query(locationSql, [clientlocationid]);
    if (!locationRows.length) {
      return res.status(400).json({ message: 'Invalid client location.' });
    }
    const clientid = locationRows[0].Clientid;

    // ENFORCE: Client users can only raise shifts for their assigned locations
    if (userType === 'Client - Standard User') {
      const userClientSql = 'SELECT 1 FROM Userclients WHERE Userid = ? AND Clientid = ?';
      const [userClientRows] = await dbConn.query(userClientSql, [createdbyid, clientid]);
      if (!userClientRows.length) {
        return res.status(403).json({ message: 'Access denied: You are not authorized for this client/location.' });
      }
    }
    // Staff - Standard User and System Admin can raise for any location (no restriction)

    // Validate qualification group
    const qualGroupSql = 'SELECT 1 FROM Qualificationgroups WHERE ID = ?';
    const [qualGroupRows] = await dbConn.query(qualGroupSql, [qualificationgroupid]);
    if (!qualGroupRows.length) {
      return res.status(400).json({ message: 'Invalid qualification group.' });
    }

    // Insert into Clientshiftrequests (case sensitive columns)
    const insertShiftSql = `INSERT INTO Clientshiftrequests
      (Clientid, Clientlocationid, Shiftdate, Starttime, Endtime, Qualificationgroupid, Totalrequiredstaffnumber, Additionalvalue, Createdat, Createdbyid, Updatedat, Updatedbyid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const insertShiftParams = [clientid, clientlocationid, shiftdate, starttime, endtime, qualificationgroupid, totalrequiredstaffnumber, additionalvalue, now, createdbyid, now, updatedbyid];
    const [result] = await dbConn.query(insertShiftSql, insertShiftParams);
    const clientshiftrequestid = result.insertId;

    // Insert into Clientstaffshifts (one row per required staff, case sensitive columns)
    const staffShiftInserts = [];
    for (let i = 1; i <= totalrequiredstaffnumber; i++) {
      staffShiftInserts.push([
        clientshiftrequestid,
        clientid,
        i,
        'open', // Status
        now,
        createdbyid,
        now,
        updatedbyid
      ]);
    }
    if (staffShiftInserts.length) {
      try {
        // Build placeholders for bulk insert
        const placeholders = staffShiftInserts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = staffShiftInserts.flat();
        const staffShiftSql = `INSERT INTO Clientstaffshifts (Clientshiftrequestid, Clientid, ` +
          '`Order`, Status, Createdat, Createdbyid, Updatedat, Updatedbyid) VALUES ' + placeholders;
        await dbConn.query(staffShiftSql, flatValues);
      } catch (err) {
        logger.error('Error inserting into Clientstaffshifts', { error: err, attemptedSql: 'bulk insert', values: staffShiftInserts });
        return res.status(500).json({ message: 'Failed to insert staff shifts.', error: err.message });
      }
    }

    // Return the created shift request and staff shifts
    const fetchShiftSql = 'SELECT csr.*, c.Name as clientname, cl.LocationName FROM Clientshiftrequests csr LEFT JOIN Clients c ON csr.Clientid = c.ID LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.ID WHERE csr.ID = ?';
    const [createdShift] = await dbConn.query(fetchShiftSql, [clientshiftrequestid]);
    const fetchStaffShiftsSql = 'SELECT * FROM Clientstaffshifts WHERE Clientshiftrequestid = ?';
    const [createdStaffShifts] = await dbConn.query(fetchStaffShiftsSql, [clientshiftrequestid]);

    // Fetch qualifications for the group and return as qualificationname (array of names)
    const qualNamesSql = `SELECT q.Name, q.Additionalvalue
     FROM Qualificationgroupitems qgi
     JOIN Qualifications q ON qgi.Qualificationid = q.ID
     WHERE qgi.Qualificationgroupid = ?`;
    const [qualRows] = await dbConn.query(qualNamesSql, [qualificationgroupid]);
    const qualificationname = qualRows.map(q => q.Name);

    // ================== send notifications to employees ==================
    // Fetch all Employee - Standard User users' emails
    const [employeeRows] = await dbConn.query(`
      SELECT u.email, u.fullname
      FROM Users u
      LEFT JOIN Assignedusertypes au ON au.Userid = u.id
      LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
      WHERE ut.Name = 'Employee - Standard User' AND u.email IS NOT NULL
    `);
    logger.info('Employee notification target list', { count: employeeRows.length, emails: employeeRows.map(e => e.email) });
    if (employeeRows && employeeRows.length) {
      const shift = createdShift[0];
      const locationName = shift.LocationName || '';
      const clientName = shift.clientname || '';
      const shiftDate = shift.Shiftdate;
      const startTime = shift.Starttime;
      const endTime = shift.Endtime;
      // Await all emails before responding
      await Promise.all(employeeRows.map(async (emp) => {
        logger.info('Sending shift notification email', { to: emp.email });
        const template = mailTemplates.shiftNewEmployee({
          employeeName: emp.fullname,
          locationName,
          clientName,
          shiftDate,
          startTime,
          endTime,
          qualificationNames: qualificationname
        });
        try {
          await sendMail({
            to: emp.email,
            subject: template.subject,
            html: template.html
          });
        } catch (e) {
          logger.error('Email send error (new shift to employee)', { error: e, email: emp.email });
        }
      }));
    }

    // Respond only after notifications
    res.status(201).json({
      message: 'Shift request created successfully',
      shift: {
        ...createdShift[0],
        qualificationname, // keep variable name for frontend
        StaffShifts: createdStaffShifts
      }
    });
  } catch (err) {
    logger.error('Create shift request error', { error: err, sql: err.sql || undefined });
    res.status(500).json({ message: 'Failed to create shift request.', error: err.message, sql: err.sql || undefined });
  }
};
// ================== end createClientShiftRequest ==================

// ================== linkClientUserToLocation ==================
// Links a client user to a client and returns their locations.
exports.linkClientUserToLocation = async (req, res) => {
  const { emailaddress, clientid } = req.body;
  const requesterType = req.user?.usertype;

  // Only Staff - Standard User or System Admin can use this endpoint
  if (requesterType !== 'Staff - Standard User' && requesterType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can link users to clients.' });
  }

  try {
    // Look up the user by emailaddress
    const [userRows] = await db.query(
      `SELECT u.id, u.email, ut.Name as usertype FROM Users u
       LEFT JOIN Assignedusertypes au ON au.Userid = u.id
       LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
       WHERE u.email = ?`,
      [emailaddress]
    );
    if (!userRows.length) {
      return res.status(404).json({ message: 'User not found with the provided email address.' });
    }
    const user = userRows[0];
    if (user.usertype !== 'Client - Standard User') {
      return res.status(400).json({ message: 'Target user is not a Client - Standard User.' });
    }
    const userid = user.id;

    // Get client name from Clients table
    const [clientRows] = await db.query('SELECT id, Name FROM Clients WHERE id = ?', [clientid]);
    if (!clientRows.length) {
      return res.status(400).json({ message: 'Invalid client.' });
    }
    const clientName = clientRows[0].Name;

    // Link user to client in Userclients if not already linked
    const [existing] = await db.query(
      'SELECT * FROM Userclients WHERE userid = ? AND clientid = ?',
      [userid, clientid]
    );
    if (existing.length) {
      // Fetch all locations for this client
      const [locations] = await db.query('SELECT * FROM Clientlocations WHERE clientid = ?', [clientid]);
      return res.status(200).json({ message: 'User is already linked to this client.', client: { id: clientid, name: clientName }, locations });
    }
    await db.query(
      'INSERT INTO Userclients (userid, clientid) VALUES (?, ?)',
      [userid, clientid]
    );
    // Fetch all locations for this client
    const [locations] = await db.query('SELECT * FROM Clientlocations WHERE clientid = ?', [clientid]);
    res.status(201).json({
      message: 'User linked to client. User now has access to all locations for this client.',
      client: { id: clientid, name: clientName },
      locations
    });
  } catch (err) {
    logger.error('Link client user to client error', { error: err });
    res.status(500).json({ message: 'Failed to link client user to client.', error: err.message });
  }
};
// ================== end linkClientUserToLocation ==================

// ================== getMyClientLocations ==================
// Returns all client locations assigned to the logged-in client user.
exports.getMyClientLocations = async (req, res) => {
  const userId = req.user?.id;
  const userType = req.user?.usertype;
  if (userType !== 'Client - Standard User' && userType !== 'System Admin' && userType !== 'Staff - Standard User') {
    return res.status(403).json({ message: 'Access denied: Clients, staff, or admin only' });
  }
  try {
    // Get all clientids for this user from Userclients
    const [clientRows] = await db.query('SELECT clientid FROM Userclients WHERE userid = ?', [userId]);
    if (!clientRows.length) {
      return res.status(200).json({ locations: [] });
    }
    const clientIds = clientRows.map(row => row.clientid);
    // Get all locations for these clientids, join with client info
    const [locations] = await db.query(
      `SELECT cl.*, c.Name as clientname
       FROM Clientlocations cl
       LEFT JOIN Clients c ON cl.clientid = c.id
       WHERE cl.clientid IN (${clientIds.map(() => '?').join(',')})`,
      clientIds
    );
    // Get user details (email, firstname, lastname) for the current user
    const [userDetails] = await db.query(
      `SELECT u.email, p.Firstname, p.Lastname
       FROM Users u
       LEFT JOIN People p ON u.id = p.Linkeduserid
       WHERE u.id = ?`,
      [userId]
    );
    const userInfo = userDetails[0] || {};
    // Attach user info to each location for clarity
    const result = locations.map(loc => ({
      ID: loc.ID,
      LocationName: loc.LocationName, // Use the correct field from Clientlocations
      clientid: loc.clientid,
      clientname: loc.clientname,
      useremail: userInfo.email,
      userfirstname: userInfo.Firstname,
      userlastname: userInfo.Lastname
    }));
    res.status(200).json({ locations: result });
  } catch (err) {
    logger.error('Get my client locations error', { error: err });
    res.status(500).json({ message: 'Error fetching client locations', error: err });
  }
};
// ================== end getMyClientLocations ==================

// ================== getAllClientLocations ==================
// Returns all clients and their linked locations (for staff/sys admin).
exports.getAllClientLocations = async (req, res) => {
  const userType = req.user?.usertype;
  if (userType !== 'Staff - Standard User' && userType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Staff or admin only' });
  }
  try {
    const [rows] = await db.query(`
      SELECT p.Firstname, p.Lastname, p.Emailaddress, cl.locationaddress AS locationname
      FROM Users u
      INNER JOIN People p ON u.id = p.Linkeduserid
      LEFT JOIN Assignedusertypes au ON au.Userid = u.id
      LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
      LEFT JOIN Userclients uc ON uc.userid = u.id
      LEFT JOIN Clientlocations cl ON cl.clientid = uc.clientid
      WHERE ut.Name = 'Client - Standard User' AND cl.id IS NOT NULL AND p.Emailaddress IS NOT NULL
      ORDER BY p.Emailaddress, cl.locationaddress
    `);

    const clientsMap = new Map();
    rows.forEach(row => {
      if (!row.Emailaddress) return; // Should be filtered by SQL, but as a safeguard

      if (!clientsMap.has(row.Emailaddress)) {
        clientsMap.set(row.Emailaddress, {
          Firstname: row.Firstname,
          Lastname: row.Lastname,
          Emailaddress: row.Emailaddress,
          locationnames: []
        });
      }
      if (row.locationname) {
        clientsMap.get(row.Emailaddress).locationnames.push(row.locationname);
      }
    });

    const groupedClients = Array.from(clientsMap.values());
    res.status(200).json({ clients: groupedClients });

  } catch (err) {
    logger.error('Get all client locations error', { error: err });
    res.status(500).json({ message: 'Error fetching client locations', error: err });
  }
};
// ================== end getAllClientLocations ==================

// ================== softDeletePerson ==================
// Soft-deletes a person and their linked user by setting deleted timestamps.
exports.softDeletePerson = async (req, res) => {
  const personId = req.params.id;
  const deleterId = req.user?.id;
  if (!deleterId) {
    return res.status(401).json({ message: 'Unauthorized. No user info.' });
  }
  try {
    // Check if person exists
    const [rows] = await db.query('SELECT * FROM People WHERE ID = ?', [personId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Person not found' });
    }
    // Soft-delete: set deletedat and deletedbyid in People
    await db.query(
      'UPDATE People SET deletedat = NOW(), deletedbyid = ? WHERE ID = ?',
      [deleterId, personId]
    );
    // Also soft-delete in Users if Linkeduserid exists
    const linkedUserId = rows[0].Linkeduserid;
    if (linkedUserId) {
      const [userUpdateResult] = await db.query(
        'UPDATE Users SET Deletedat = NOW(), Deletedbyid = ? WHERE id = ?',
        [deleterId, linkedUserId]
      );
      if (userUpdateResult.affectedRows === 0) {
        console.warn(`[softDeletePerson] WARNING: No rows updated in Users for id=${linkedUserId}`);
      }
    }
    res.status(200).json({ message: 'Person soft-deleted (and user if linked)' });
  } catch (err) {
    logger.error('Soft-delete person error', { error: err });
    res.status(500).json({ message: 'Soft-delete error', error: err });
  }
};
// ================== end softDeletePerson ==================

// ================== getAvailableClientShifts ==================
// Returns available client shifts based on user type and permissions.
exports.getAvailableClientShifts = async (req, res) => {
  const userType = req.user?.usertype;
  const userId = req.user?.id;
  // Pagination params
  let limit = parseInt(req.query.limit) || 10;
  let page = parseInt(req.query.page) || 1;
  if (limit > 50) limit = 50;
  if (limit < 1) limit = 10;
  if (page < 1) page = 1;
  const offset = (page - 1) * limit;
  try {
    let rows, total;
    if (userType === 'System Admin' || userType === 'Staff - Standard User') {
      // Get total count
      const [countResult] = await db.query(`SELECT COUNT(DISTINCT csr.id) as total FROM Clientshiftrequests csr WHERE csr.deletedat IS NULL`);
      total = countResult[0]?.total || 0;
      // Admin/Staff: See all shifts for all hospitals/locations
      [rows] = await db.query(`
        SELECT csr.id AS shiftrequestid, csr.Clientlocationid, cl.LocationName, cl.LocationAddress, cl.clientid, c.Name AS clientname,
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid, csr.Totalrequiredstaffnumber
        FROM Clientshiftrequests csr
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        WHERE csr.deletedat IS NULL
        ORDER BY csr.Shiftdate DESC, csr.Starttime DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      // For each shift request, get its staff shifts and their statuses
      const shiftIds = rows.map(row => row.shiftrequestid);
      let staffShifts = [];
      if (shiftIds.length) {
        const [staffRows] = await db.query(
          `SELECT css.*, u.fullname AS employee_name, u.email AS employee_email
           FROM Clientstaffshifts css
           LEFT JOIN Users u ON css.Assignedtouserid = u.id
           WHERE css.Clientshiftrequestid IN (${shiftIds.map(() => '?').join(',')}) AND css.Deletedat IS NULL`,
          shiftIds
        );
        staffShifts = staffRows;
      }
      // Group staff shifts by shiftrequestid
      const staffShiftsByRequest = {};
      staffShifts.forEach(s => {
        if (!staffShiftsByRequest[s.Clientshiftrequestid]) staffShiftsByRequest[s.Clientshiftrequestid] = [];
        staffShiftsByRequest[s.Clientshiftrequestid].push(s);
      });
      // Fetch qualifications for all qualificationgroupids
      const groupIds = [...new Set(rows.map(r => r.Qualificationgroupid).filter(Boolean))];
      let qualMap = {};
      if (groupIds.length) {
        const [qualRows] = await db.query(
          `SELECT qgi.Qualificationgroupid, q.Name
           FROM Qualificationgroupitems qgi
           JOIN Qualifications q ON qgi.Qualificationid = q.ID
           WHERE qgi.Qualificationgroupid IN (${groupIds.map(() => '?').join(',')})`,
          groupIds
        );
        qualMap = groupIds.reduce((acc, gid) => {
          acc[gid] = qualRows.filter(q => q.Qualificationgroupid === gid).map(q => q.Name);
          return acc;
        }, {});
      }
      // Format output
      const formatted = rows.map(row => ({
        ...row,
        Shiftdate: formatDate(row.Shiftdate),
        Starttime: formatDateTime(row.Starttime),
        Endtime: formatDateTime(row.Endtime),
        qualificationname: qualMap[row.Qualificationgroupid] || [], // keep variable name
        StaffShifts: staffShiftsByRequest[row.shiftrequestid] || []
      }));
      return res.status(200).json({ availableShifts: formatted, pagination: { page, limit, total } });
    } else if (userType === 'Client - Standard User' || userType === 'System Admin' || userType === 'Staff - Standard User') {
      // For Client, System Admin, and Staff - Standard User: See all shifts for their own hospital(s) or all
      let clientIds = [];
      if (userType === 'Client - Standard User') {
        const [clientRows] = await db.query('SELECT clientid FROM Userclients WHERE userid = ?', [userId]);
        if (!clientRows.length) return res.status(200).json({ availableShifts: [], pagination: { page, limit, total: 0 } });
        clientIds = clientRows.map(r => r.clientid);
      }
      // Get total count
      const countQuery = userType === 'Client - Standard User'
        ? `SELECT COUNT(DISTINCT csr.id) as total FROM Clientshiftrequests csr WHERE csr.deletedat IS NULL AND csr.clientid IN (${clientIds.map(() => '?').join(',')})`
        : `SELECT COUNT(DISTINCT csr.id) as total FROM Clientshiftrequests csr WHERE csr.deletedat IS NULL`;
      const countParams = userType === 'Client - Standard User' ? clientIds : [];
      const [countResult] = await db.query(countQuery, countParams);
      total = countResult[0]?.total || 0;
      const shiftQuery = `
        SELECT csr.id AS shiftrequestid, csr.Clientlocationid, cl.LocationName, cl.LocationAddress, cl.clientid, c.Name AS clientname,
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid, csr.Totalrequiredstaffnumber
        FROM Clientshiftrequests csr
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        ${userType === 'Client - Standard User' ? `WHERE csr.deletedat IS NULL AND csr.clientid IN (${clientIds.map(() => '?').join(',')})` : 'WHERE csr.deletedat IS NULL'}
        ORDER BY csr.Shiftdate DESC, csr.Starttime DESC
        LIMIT ? OFFSET ?
      `;
      const shiftParams = userType === 'Client - Standard User' ? [...clientIds, limit, offset] : [limit, offset];
      const [shiftRows] = await db.query(shiftQuery, shiftParams);
      // For each shift request, get its staff shifts and their statuses
      const shiftIds = shiftRows.map(row => row.shiftrequestid);
      let staffShifts = [];
      if (shiftIds.length) {
        const [staffRows] = await db.query(
          `SELECT css.*, u.fullname AS employee_name, u.email AS employee_email
           FROM Clientstaffshifts css
           LEFT JOIN Users u ON css.Assignedtouserid = u.id
           WHERE css.Clientshiftrequestid IN (${shiftIds.map(() => '?').join(',')}) AND css.Deletedat IS NULL`,
          shiftIds
        );
        staffShifts = staffRows;
      }
      // Group staff shifts by shiftrequestid
      const staffShiftsByRequest = {};
      staffShifts.forEach(s => {
        if (!staffShiftsByRequest[s.Clientshiftrequestid]) staffShiftsByRequest[s.Clientshiftrequestid] = [];
        staffShiftsByRequest[s.Clientshiftrequestid].push(s);
      });
      // Fetch qualifications for all qualificationgroupids
      const groupIds = [...new Set(shiftRows.map(r => r.Qualificationgroupid).filter(Boolean))];
      let qualMap = {};
      if (groupIds.length) {
        const [qualRows] = await db.query(
          `SELECT qgi.Qualificationgroupid, q.Name
           FROM Qualificationgroupitems qgi
           JOIN Qualifications q ON qgi.Qualificationid = q.ID
           WHERE qgi.Qualificationgroupid IN (${groupIds.map(() => '?').join(',')})`,
          groupIds
        );
        qualMap = groupIds.reduce((acc, gid) => {
          acc[gid] = qualRows.filter(q => q.Qualificationgroupid === gid).map(q => q.Name);
          return acc;
        }, {});
      }
      // Format output
      const formatted = shiftRows.map(row => ({
        ...row,
        Shiftdate: formatDate(row.Shiftdate),
        Starttime: formatDateTime(row.Starttime),
        Endtime: formatDateTime(row.Endtime),
        qualificationname: qualMap[row.Qualificationgroupid] || [], // keep variable name
        StaffShifts: staffShiftsByRequest[row.shiftrequestid] || []
      }));
      return res.status(200).json({ availableShifts: formatted, pagination: { page, limit, total } });
    } else if (userType === 'Employee - Standard User') {
      // Get total count
      const [countResult] = await db.query(`SELECT COUNT(*) as total FROM Clientstaffshifts WHERE Status = 'open' AND Deletedat IS NULL`);
      total = countResult[0]?.total || 0;
      // Employee: See only open shift slots that are not soft-deleted
      [rows] = await db.query(`
        SELECT css.id AS staffshiftid, css.Clientshiftrequestid, css.Clientid, css.Status, css.Order,
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid,
               cl.LocationName, cl.LocationAddress, c.Name AS clientname
        FROM Clientstaffshifts css
        LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        WHERE css.Status = 'open' AND css.Deletedat IS NULL
        ORDER BY csr.Shiftdate DESC, csr.Starttime DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      // Fetch qualifications for all qualificationgroupids
      const groupIds = [...new Set(rows.map(r => r.Qualificationgroupid).filter(Boolean))];
      let qualMap = {};
      if (groupIds.length) {
        const [qualRows] = await db.query(
          `SELECT qgi.Qualificationgroupid, q.Name
           FROM Qualificationgroupitems qgi
           JOIN Qualifications q ON qgi.Qualificationid = q.ID
           WHERE qgi.Qualificationgroupid IN (${groupIds.map(() => '?').join(',')})`,
          groupIds
        );
        qualMap = groupIds.reduce((acc, gid) => {
          acc[gid] = qualRows.filter(q => q.Qualificationgroupid === gid).map(q => q.Name);
          return acc;
        }, {});
      }
      const formatted = rows.map(row => ({
        ...row,
        Shiftdate: formatDate(row.Shiftdate),
        Starttime: formatDateTime(row.Starttime),
        Endtime: formatDateTime(row.Endtime),
        qualificationname: qualMap[row.Qualificationgroupid] || [] // keep variable name
      }));
      return res.status(200).json({ availableShifts: formatted, pagination: { page, limit, total } });
    } else if (userType) {
      // If userType is present but not recognized, return 403
      return res.status(403).json({ message: 'Access denied: Unknown user type', code: 'ACCESS_DENIED' });
    } else {
      // If userType is missing, treat as unauthorized
      return res.status(401).json({ message: 'Unauthorized: No user type', code: 'UNAUTHORIZED' });
    }
  } catch (err) {
    // Improved error logging for debugging
    logger.error('Get available client shifts error', {
      message: err.message,
      stack: err.stack,
      error: err
    });
    // Return full error details for debugging (remove in production)
    res.status(500).json({
      message: 'Error fetching available shifts',
      error: err.message,
      stack: err.stack,
      raw: err
    });
  }
};
// ================== end getAvailableClientShifts ==================

// ================== acceptClientStaffShift ==================
// Allows an employee, staff, or admin to accept a client staff shift.
exports.acceptClientStaffShift = async (req, res) => {
  const staffShiftId = req.params.id;
  const userId = req.user?.id;
  const userType = req.user?.usertype;
  try {
    // 1. Check if the shift exists, is open, and not soft-deleted
    const [rows] = await db.query('SELECT * FROM Clientstaffshifts WHERE id = ? AND Deletedat IS NULL', [staffShiftId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Shift slot not found or has been deleted' });
    }
    const shift = rows[0];
    if (shift.Status !== 'open') {
      return res.status(400).json({ message: 'Shift slot is not open for acceptance' });
    }
    // 2. Only allow Employee, Staff, or Admin
    if (
      userType !== 'Employee - Standard User' &&
      userType !== 'Staff - Standard User' &&
      userType !== 'System Admin'
    ) {
      return res.status(403).json({ message: 'Access denied: Only employees, staff, or admin can accept shifts.' });
    }
    // 2. Prevent double-booking: check if user already accepted/assigned to another slot for this shift request
    const [existingAssignments] = await db.query(
      'SELECT * FROM Clientstaffshifts WHERE Clientshiftrequestid = ? AND Assignedtouserid = ? AND Deletedat IS NULL AND id != ? AND Status IN ("pending approval", "approved", "open")',
      [shift.Clientshiftrequestid, userId, staffShiftId]
    );
    if (existingAssignments.length > 0) {
      return res.status(400).json({ message: 'You have already accepted or are assigned to another slot for this shift.' });
    }
    // 3. Mark the shift as pending approval and assign to user
    await db.query(
      'UPDATE Clientstaffshifts SET Status = ?, Assignedtouserid = ?, Approvedbyid = ?, Approvedat = NOW() WHERE id = ?',
      ['pending approval', userId, userId, staffShiftId]
    );
    // Fetch updated shift info with client name
    const [updatedShiftRows] = await db.query(`
      SELECT css.*, cl.LocationName, cl.LocationAddress, c.Name as clientname, u.fullname as employeeName
      FROM Clientstaffshifts css
      LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
      LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
      LEFT JOIN Clients c ON cl.clientid = c.id
      LEFT JOIN Users u ON css.Assignedtouserid = u.id
      WHERE css.id = ?
    `, [staffShiftId]);
    const updatedShift = updatedShiftRows[0] || null;
    // Notify all clients for this shift
    if (updatedShift) {
      // Get all client emails for this client
      const [clientUsers] = await db.query(`
        SELECT u.email, c.Name as clientName
        FROM Userclients uc
        LEFT JOIN Users u ON uc.userid = u.id
        LEFT JOIN Clients c ON uc.clientid = c.id
        WHERE uc.clientid = ?
      `, [updatedShift.Clientid]);
      for (const client of clientUsers) {
        const template = mailTemplates.shiftAcceptedClient({
          clientName: client.clientName,
          locationName: updatedShift.LocationName,
          shiftDate: updatedShift.Shiftdate,
          startTime: updatedShift.Starttime,
          endTime: updatedShift.Endtime,
          employeeName: updatedShift.employeeName || 'An employee'
        });
        if (client.email) {
          sendMail({
            to: client.email,
            subject: template.subject,
            html: template.html
          }).catch(e => logger.error('Email send error (accept shift)', { error: e }));
        }
      }
    }
    res.status(200).json({ message: 'Shift accepted and pending admin approval', shift: updatedShift });
  } catch (err) {
    res.status(500).json({ message: 'Failed to accept shift', error: err.message });
  }
};
// ================== end acceptClientStaffShift ==================

// ================== approveClientStaffShift ==================
// Allows staff or admin to approve a client staff shift and sends notifications.
exports.approveClientStaffShift = async (req, res) => {
  const staffShiftId = req.params.id;
  const approverId = req.user?.id;
  const userType = req.user?.usertype;
  if (userType !== 'Staff - Standard User' && userType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can approve shifts.' });
  }
  try {
    // 1. Get the shift
    const [rows] = await db.query('SELECT * FROM Clientstaffshifts WHERE id = ? AND Deletedat IS NULL', [staffShiftId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Shift slot not found or has been deleted' });
    }
    const shift = rows[0];
    if (shift.Status !== 'pending approval') {
      return res.status(400).json({ message: 'Shift slot is not pending approval' });
    }
    // 2. Approve the shift
    await db.query(
      'UPDATE Clientstaffshifts SET Status = ?, Approvedbyid = ?, Approvedat = NOW() WHERE id = ?',
      ['approved', approverId, staffShiftId]
    );
    // 3. Fetch updated shift info
    const [updatedShiftRows] = await db.query(`
      SELECT css.*, cl.LocationName, cl.LocationAddress, c.Name as clientname, u.fullname as employeeName, u.email as employeeEmail, csr.Shiftdate AS Shiftdate, csr.Starttime AS Starttime, csr.Endtime AS Endtime
      FROM Clientstaffshifts css
      LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
      LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
      LEFT JOIN Clients c ON cl.clientid = c.id
      LEFT JOIN Users u ON css.Assignedtouserid = u.id
      WHERE css.id = ?
    `, [staffShiftId]);
    const updatedShift = updatedShiftRows[0] || null;
    // 4. Notify employee and client
    if (updatedShift) {
      // Notify employee
      if (updatedShift.employeeEmail) {
        const templateEmp = mailTemplates.shiftApprovedEmployee({
          employeeName: updatedShift.employeeName,
          clientName: updatedShift.clientname,
          locationName: updatedShift.LocationName,
          shiftDate: updatedShift.Shiftdate,
          startTime: updatedShift.Starttime,
          endTime: updatedShift.Endtime
        });
        sendMail({
          to: updatedShift.employeeEmail,
          subject: templateEmp.subject,
          html: templateEmp.html
        }).catch(e => logger.error('Email send error (approve shift to employee)', { error: e }));
      }
      // Notify all client users
      const [clientUsers] = await db.query(`
        SELECT u.email, c.Name as clientName
        FROM Userclients uc
        LEFT JOIN Users u ON uc.userid = u.id
        LEFT JOIN Clients c ON uc.clientid = c.id
        WHERE uc.clientid = ?
      `, [updatedShift.Clientid]);
      for (const client of clientUsers) {
        const templateClient = mailTemplates.shiftApprovedClient({
          clientName: client.clientName,
          employeeName: updatedShift.employeeName,
          locationName: updatedShift.LocationName,
          shiftDate: updatedShift.Shiftdate,
          startTime: updatedShift.Starttime,
          endTime: updatedShift.Endtime
        });
        if (client.email) {
          sendMail({
            to: client.email,
            subject: templateClient.subject,
            html: templateClient.html
          }).catch(e => logger.error('Email send error (approve shift to client)', { error: e }));
        }
      }
    }
    res.status(200).json({ message: 'Shift approved and notifications sent', shift: updatedShift });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve shift', error: err.message });
  }
};
// ================== end approveClientStaffShift ==================

// ================== rejectClientStaffShift ==================
// Allows staff or admin to reject a client staff shift and notifies the employee.
exports.rejectClientStaffShift = async (req, res) => {
  const staffShiftId = req.params.id;
  const rejectorId = req.user?.id;
  const userType = req.user?.usertype;
  if (userType !== 'Staff - Standard User' && userType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can reject shifts.' });
  }
  try {
    // 1. Get the shift
    const [rows] = await db.query('SELECT * FROM Clientstaffshifts WHERE id = ? AND Deletedat IS NULL', [staffShiftId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Shift slot not found or has been deleted' });
    }
    const shift = rows[0];
    if (shift.Status !== 'pending approval') {
      return res.status(400).json({ message: 'Shift slot is not pending approval' });
    }
    // 2. Reject the shift
    await db.query(
      'UPDATE Clientstaffshifts SET Status = ?, Approvedbyid = ?, Approvedat = NOW() WHERE id = ?',
      ['rejected', rejectorId, staffShiftId]
    );
    // 3. Fetch updated shift info
    const [updatedShiftRows] = await db.query(`
      SELECT css.*, cl.LocationName, cl.LocationAddress, c.Name as clientname, u.fullname as employeeName, u.email as employeeEmail, csr.Shiftdate AS Shiftdate, csr.Starttime AS Starttime, csr.Endtime AS Endtime
      FROM Clientstaffshifts css
      LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
      LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
      LEFT JOIN Clients c ON cl.clientid = c.id
      LEFT JOIN Users u ON css.Assignedtouserid = u.id
      WHERE css.id = ?
    `, [staffShiftId]);
    const updatedShift = updatedShiftRows[0] || null;
    // 4. Notify employee
    if (updatedShift && updatedShift.employeeEmail) {
      const templateEmp = mailTemplates.shiftRejectedEmployee({
        employeeName: updatedShift.employeeName,
        clientName: updatedShift.clientname,
        locationName: updatedShift.LocationName,
        shiftDate: updatedShift.Shiftdate,
        startTime: updatedShift.Starttime,
        endTime: updatedShift.Endtime
      });
      sendMail({
        to: updatedShift.employeeEmail,
        subject: templateEmp.subject,
        html: templateEmp.html
      }).catch(e => logger.error('Email send error (reject shift to employee)', { error: e }));
    }
    res.status(200).json({ message: 'Shift rejected and employee notified', shift: updatedShift });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject shift', error: err.message });
  }
};
// ================== end rejectClientStaffShift ==================

// ================== getClientLocations ==================
// Returns all clients with their locations (no auth required).
exports.getClientLocations = async (req, res) => {
  try {
    // Get all clients
    const [clients] = await db.query('SELECT * FROM Clients');
    // Get all locations
    const [locations] = await db.query('SELECT * FROM Clientlocations');
    // Map locations to their client
    const clientMap = clients.map(client => {
      return {
        ...client,
        locations: locations.filter(loc => loc.Clientid === client.ID)
      };
    });
    res.status(200).json({ clients: clientMap });
  } catch (err) {
    console.error('[getClientLocations] Error:', err);
    res.status(500).json({ message: 'Error fetching client locations', error: err.message });
  }
};
// ================== end getClientLocations ==================

// ================== getClientUserLocationsByEmail ==================
// Admin staff: Get all client locations linked to a client user by email address.
exports.getClientUserLocationsByEmail = async (req, res) => {
  const requesterType = req.user?.usertype;
  if (requesterType !== 'Staff - Standard User' && requesterType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can use this endpoint.' });
  }
  const email = req.query.emailaddress;
  if (!email) {
    return res.status(400).json({ message: 'Missing emailaddress query parameter.' });
  }
  try {
    // Find the user by email and check usertype
    const [userRows] = await db.query(
      `SELECT u.id, u.email, ut.Name as usertype, p.Firstname, p.Lastname
       FROM Users u
       LEFT JOIN Assignedusertypes au ON au.Userid = u.id
       LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
       LEFT JOIN People p ON u.id = p.Linkeduserid
       WHERE u.email = ?` , [email]
    );
    if (!userRows.length) {
      return res.status(404).json({ message: 'User not found with the provided email address.' });
    }
    const user = userRows[0];
    if (user.usertype !== 'Client - Standard User') {
      return res.status(400).json({ message: 'Target user is not a Client - Standard User.' });
    }
    // Get all clientids for this user from Userclients
    const [clientRows] = await db.query('SELECT clientid FROM Userclients WHERE userid = ?', [user.id]);
    if (!clientRows.length) {
      return res.status(200).json({ locations: [] });
    }
    const clientIds = clientRows.map(row => row.clientid);
    // Get all locations for these clientids, join with client info
    const [locations] = await db.query(
      `SELECT cl.*, c.Name as clientname
       FROM Clientlocations cl
       LEFT JOIN Clients c ON cl.clientid = c.id
       WHERE cl.clientid IN (${clientIds.map(() => '?').join(',')})`,
      clientIds
    );
    // Attach user info to each location for clarity
    const result = locations.map(loc => ({
      ID: loc.ID,
      LocationName: loc.LocationName,
      clientid: loc.clientid,
      clientname: loc.clientname,
      useremail: user.email,
      userfirstname: user.Firstname,
      userlastname: user.Lastname
    }));
    res.status(200).json({ locations: result });
  } catch (err) {
    logger.error('Get client user locations by email error', { error: err });
    res.status(500).json({ message: 'Error fetching client user locations', error: err });
  }
};
// ================== end getClientUserLocationsByEmail ==================

// ================== unlinkClientUserFromClient ==================
// Admin staff: Unlink a client user from a client by email and clientid.
exports.unlinkClientUserFromClient = async (req, res) => {
  const requesterType = req.user?.usertype;
  if (requesterType !== 'Staff - Standard User' && requesterType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can use this endpoint.' });
  }
  const { emailaddress, clientid } = req.body;
  if (!emailaddress || !clientid) {
    return res.status(400).json({ message: 'Missing emailaddress or clientid in request body.' });
  }
  try {
    // Find the user by email and check usertype
    const [userRows] = await db.query(
      `SELECT u.id, ut.Name as usertype
       FROM Users u
       LEFT JOIN Assignedusertypes au ON au.Userid = u.id
       LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
       WHERE u.email = ?`, [emailaddress]
    );
    if (!userRows.length) {
      return res.status(404).json({ message: 'User not found with the provided email address.' });
    }
    const user = userRows[0];
    if (user.usertype !== 'Client - Standard User') {
      return res.status(400).json({ message: 'Target user is not a Client - Standard User.' });
    }
    // Check if the link exists
    const [linkRows] = await db.query(
      'SELECT * FROM Userclients WHERE userid = ? AND clientid = ?',
      [user.id, clientid]
    );
    if (!linkRows.length) {
      return res.status(404).json({ message: 'User is not linked to this client.' });
    }
    // Delete the link
    await db.query('DELETE FROM Userclients WHERE userid = ? AND clientid = ?', [user.id, clientid]);
    res.status(200).json({ message: 'User unlinked from client successfully.' });
  } catch (err) {
    logger.error('Unlink client user from client error', { error: err });
    res.status(500).json({ message: 'Error unlinking client user from client', error: err });
  }
};
// ================== end unlinkClientUserFromClient ==================

// ================== updateClientShiftRequest ==================
// Edit an existing client shift request (only by creator or staff/admin)
exports.updateClientShiftRequest = async (req, res) => {
  const dbConn = db;
  const shiftId = req.params.id;
  const userId = req.user?.id;
  const userType = req.user?.usertype;
  const now = new Date();
  try {
    // Fetch the shift request
    const [rows] = await dbConn.query('SELECT * FROM Clientshiftrequests WHERE id = ? AND Deletedat IS NULL', [shiftId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Shift request not found.' });
    }
    const shift = rows[0];
    // Only creator or staff/admin can edit
    if (userType !== 'System Admin' && userType !== 'Staff - Standard User' && shift.Createdbyid !== userId) {
      return res.status(403).json({ message: 'Access denied: Only the creator or staff/admin can edit this shift.' });
    }
    // Prevent editing if shift has started or is not editable
    const shiftStart = new Date(shift.Starttime);
    if (shiftStart <= now) {
      return res.status(400).json({ message: 'Cannot edit shift: already started or not in editable state.' });
    }
    // Build update fields
    const allowedFields = ['clientlocationid', 'shiftdate', 'starttime', 'endtime', 'qualificationgroupid', 'totalrequiredstaffnumber', 'additionalvalue'];
    const updates = [];
    const params = [];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field.charAt(0).toUpperCase() + field.slice(1) } = ?`);
        params.push(req.body[field]);
      }
    }
    if (!updates.length) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }
    // Always update audit fields
    updates.push('Updatedat = ?');
    updates.push('Updatedbyid = ?');
    params.push(now, userId);
    params.push(shiftId);
    await dbConn.query(`UPDATE Clientshiftrequests SET ${updates.join(', ')} WHERE id = ?`, params);
    // Return updated shift
    const [updatedRows] = await dbConn.query('SELECT * FROM Clientshiftrequests WHERE id = ?', [shiftId]);
    // Fetch qualifications for the group and return as qualificationname (array of names)
    let qualificationname = [];
    if (updatedRows[0]?.Qualificationgroupid) {
      const [qualRows] = await dbConn.query(
        `SELECT q.Name FROM Qualificationgroupitems qgi JOIN Qualifications q ON qgi.Qualificationid = q.ID WHERE qgi.Qualificationgroupid = ?`,
        [updatedRows[0].Qualificationgroupid]
      );
      qualificationname = qualRows.map(q => q.Name);
    }
    res.status(200).json({ message: 'Shift request updated successfully.', shift: { ...updatedRows[0], qualificationname } });
  } catch (err) {
    logger.error('Update shift request error', { error: err });
    res.status(500).json({ message: 'Failed to update shift request.', error: err.message });
  }
};
// ================== end updateClientShiftRequest ==================

// ================== deleteClientShiftRequest ==================
// Soft-delete a client shift request (only by creator or staff/admin)
exports.deleteClientShiftRequest = async (req, res) => {
  const dbConn = db;
  const shiftId = req.params.id;
  const userId = req.user?.id;
  const userType = req.user?.usertype;
  const now = new Date();
  try {
    // Fetch the shift request
    const [rows] = await dbConn.query('SELECT * FROM Clientshiftrequests WHERE id = ? AND Deletedat IS NULL', [shiftId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Shift request not found.' });
    }
    const shift = rows[0];
    // Only creator or staff/admin can delete
    if (userType !== 'System Admin' && userType !== 'Staff - Standard User' && shift.Createdbyid !== userId) {
      return res.status(403).json({ message: 'Access denied: Only the creator or staff/admin can delete this shift.' });
    }
    // Prevent deleting if shift has started or is not deletable
    const shiftStart = new Date(shift.Starttime);
    if (shiftStart <= now) {
      return res.status(400).json({ message: 'Cannot delete shift: already started or not in deletable state.' });
    }
    // Soft-delete: set Deletedat and Deletedbyid
    await dbConn.query('UPDATE Clientshiftrequests SET Deletedat = ?, Deletedbyid = ? WHERE id = ?', [now, userId, shiftId]);
    res.status(200).json({ message: 'Shift request deleted successfully.' });
  } catch (err) {
    logger.error('Delete shift request error', { error: err });
    res.status(500).json({ message: 'Failed to delete shift request.', error: err.message });
  }
};
// ================== end deleteClientShiftRequest ==================

exports.createClientShiftRequest = async (req, res) => {
  const dbConn = db;
  const {
    clientlocationid,
    shiftdate,
    starttime,
    endtime,
    qualificationgroupid, // NEW: use group instead of qualificationid
    totalrequiredstaffnumber,
    additionalvalue
  } = req.body;
  const createdbyid = req.user?.id || req.body.createdbyid;
  const updatedbyid = createdbyid;
  const now = new Date();
  const userType = req.user?.usertype;

  try {
    // Get Clientid from Clientlocations (case sensitive)
    const locationSql = 'SELECT Clientid FROM Clientlocations WHERE ID = ?';
    const [locationRows] = await dbConn.query(locationSql, [clientlocationid]);
    if (!locationRows.length) {
      return res.status(400).json({ message: 'Invalid client location.' });
    }
    const clientid = locationRows[0].Clientid;

    // ENFORCE: Client users can only raise shifts for their assigned locations
    if (userType === 'Client - Standard User') {
      const userClientSql = 'SELECT 1 FROM Userclients WHERE Userid = ? AND Clientid = ?';
      const [userClientRows] = await dbConn.query(userClientSql, [createdbyid, clientid]);
      if (!userClientRows.length) {
        return res.status(403).json({ message: 'Access denied: You are not authorized for this client/location.' });
      }
    }
    // Staff - Standard User and System Admin can raise for any location (no restriction)

    // Validate qualification group
    const qualGroupSql = 'SELECT 1 FROM Qualificationgroups WHERE ID = ?';
    const [qualGroupRows] = await dbConn.query(qualGroupSql, [qualificationgroupid]);
    if (!qualGroupRows.length) {
      return res.status(400).json({ message: 'Invalid qualification group.' });
    }

    // Insert into Clientshiftrequests (case sensitive columns)
    const insertShiftSql = `INSERT INTO Clientshiftrequests
      (Clientid, Clientlocationid, Shiftdate, Starttime, Endtime, Qualificationgroupid, Totalrequiredstaffnumber, Additionalvalue, Createdat, Createdbyid, Updatedat, Updatedbyid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const insertShiftParams = [clientid, clientlocationid, shiftdate, starttime, endtime, qualificationgroupid, totalrequiredstaffnumber, additionalvalue, now, createdbyid, now, updatedbyid];
    const [result] = await dbConn.query(insertShiftSql, insertShiftParams);
    const clientshiftrequestid = result.insertId;

    // Insert into Clientstaffshifts (one row per required staff, case sensitive columns)
    const staffShiftInserts = [];
    for (let i = 1; i <= totalrequiredstaffnumber; i++) {
      staffShiftInserts.push([
        clientshiftrequestid,
        clientid,
        i,
        'open', // Status
        now,
        createdbyid,
        now,
        updatedbyid
      ]);
    }
    if (staffShiftInserts.length) {
      try {
        // Build placeholders for bulk insert
        const placeholders = staffShiftInserts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = staffShiftInserts.flat();
        const staffShiftSql = `INSERT INTO Clientstaffshifts (Clientshiftrequestid, Clientid, ` +
          '`Order`, Status, Createdat, Createdbyid, Updatedat, Updatedbyid) VALUES ' + placeholders;
        await dbConn.query(staffShiftSql, flatValues);
      } catch (err) {
        logger.error('Error inserting into Clientstaffshifts', { error: err, attemptedSql: 'bulk insert', values: staffShiftInserts });
        return res.status(500).json({ message: 'Failed to insert staff shifts.', error: err.message });
      }
    }

    // Return the created shift request and staff shifts
    const fetchShiftSql = 'SELECT csr.*, c.Name as clientname, cl.LocationName FROM Clientshiftrequests csr LEFT JOIN Clients c ON csr.Clientid = c.ID LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.ID WHERE csr.ID = ?';
    const [createdShift] = await dbConn.query(fetchShiftSql, [clientshiftrequestid]);
    const fetchStaffShiftsSql = 'SELECT * FROM Clientstaffshifts WHERE Clientshiftrequestid = ?';
    const [createdStaffShifts] = await dbConn.query(fetchStaffShiftsSql, [clientshiftrequestid]);

    // Fetch qualifications for the group and return as qualificationname (array of names)
    const qualNamesSql = `SELECT q.Name, q.Additionalvalue
     FROM Qualificationgroupitems qgi
     JOIN Qualifications q ON qgi.Qualificationid = q.ID
     WHERE qgi.Qualificationgroupid = ?`;
    const [qualRows] = await dbConn.query(qualNamesSql, [qualificationgroupid]);
    const qualificationname = qualRows.map(q => q.Name);

    // ================== send notifications to employees ==================
    // Fetch all Employee - Standard User users' emails
    const [employeeRows] = await dbConn.query(`
      SELECT u.email, u.fullname
      FROM Users u
      LEFT JOIN Assignedusertypes au ON au.Userid = u.id
      LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
      WHERE ut.Name = 'Employee - Standard User' AND u.email IS NOT NULL
    `);
    logger.info('Employee notification target list', { count: employeeRows.length, emails: employeeRows.map(e => e.email) });
    if (employeeRows && employeeRows.length) {
      const shift = createdShift[0];
      const locationName = shift.LocationName || '';
      const clientName = shift.clientname || '';
      const shiftDate = shift.Shiftdate;
      const startTime = shift.Starttime;
      const endTime = shift.Endtime;
      // Await all emails before responding
      await Promise.all(employeeRows.map(async (emp) => {
        logger.info('Sending shift notification email', { to: emp.email });
        const template = mailTemplates.shiftNewEmployee({
          employeeName: emp.fullname,
          locationName,
          clientName,
          shiftDate,
          startTime,
          endTime,
          qualificationNames: qualificationname
        });
        try {
          await sendMail({
            to: emp.email,
            subject: template.subject,
            html: template.html
          });
        } catch (e) {
          logger.error('Email send error (new shift to employee)', { error: e, email: emp.email });
        }
      }));
    }

    // Respond only after notifications
    res.status(201).json({
      message: 'Shift request created successfully',
      shift: {
        ...createdShift[0],
        qualificationname, // keep variable name for frontend
        StaffShifts: createdStaffShifts
      }
    });
  } catch (err) {
    logger.error('Create shift request error', { error: err, sql: err.sql || undefined });
    res.status(500).json({ message: 'Failed to create shift request.', error: err.message, sql: err.sql || undefined });
  }
};
// ================== end createClientShiftRequest ==================


