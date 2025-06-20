const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { hashPassword, generateSalt } = require('../utils/hashUtils');
const winston = require('winston');

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

exports.updatePassword = async (req, res) => {
  const { username, newPassword } = req.body;
  const updaterId = req.user?.id;

  // Only Staff - Standard User or System Admin can update passwords
  if (req.user?.usertype !== 'Staff - Standard User' && req.user?.usertype !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can update passwords.' });
  }

  // Defensive: Accept both application/json and urlencoded
  if (!username || !newPassword) {
    // Try to parse from req.body if nested (sometimes body is {body: {username, newPassword}})
    if (req.body.body && req.body.body.username && req.body.body.newPassword) {
      req.body = req.body.body;
    }
  }

  if (!username || !newPassword)
    return res.status(400).json({ message: 'Missing fields' });

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
    // Debug: log all keys and values to diagnose case-sensitivity
    console.log('[updateUserProfile] personRows[0] keys/values:', Object.entries(personRows[0]));
    // Print type and value for deletedAt for deep debugging
    const deletedAt = personRows[0].Deletedat || personRows[0].deletedat || personRows[0].DELETEDAT;
    console.log('[updateUserProfile] typeof deletedAt:', typeof deletedAt, 'value:', deletedAt);
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

// Create a client shift request and related staff shifts
exports.createClientShiftRequest = async (req, res) => {
  const dbConn = db;
  const {
    clientlocationid,
    shiftdate,
    starttime,
    endtime,
    qualificationid,
    totalrequiredstaffnumber,
    additionalvalue
  } = req.body;
  const createdbyid = req.user?.id || req.body.createdbyid;
  const updatedbyid = createdbyid;
  const now = new Date();
  const userType = req.user?.usertype;

  try {
    // Get clientid from Clientlocations
    const [locationRows] = await dbConn.query(
      'SELECT clientid FROM Clientlocations WHERE id = ?',
      [clientlocationid]
    );
    if (!locationRows.length) {
      return res.status(400).json({ message: 'Invalid client location.' });
    }
    const clientid = locationRows[0].clientid;

    // ENFORCE: Client users can only raise shifts for their assigned locations
    if (userType === 'Client - Standard User') {
      const [userClientRows] = await dbConn.query(
        'SELECT 1 FROM Userclients WHERE userid = ? AND clientid = ?',
        [createdbyid, clientid]
      );
      if (!userClientRows.length) {
        return res.status(403).json({ message: 'Access denied: You are not authorized for this client/location.' });
      }
    }
    // Staff - Standard User and System Admin can raise for any location (no restriction)

    // Validate qualification
    const [qualRows] = await dbConn.query(
      'SELECT 1 FROM Lookups WHERE id = ? AND Typeid = (SELECT ID FROM Lookuptypes WHERE Name = \'Qualification\')',
      [qualificationid]
    );
    if (!qualRows.length) {
      return res.status(400).json({ message: 'Invalid qualification.' });
    }

    // Insert into Clientshiftrequests
    const [result] = await dbConn.query(
      `INSERT INTO Clientshiftrequests
        (Clientid, Clientlocationid, Shiftdate, Starttime, Endtime, Qualificationid, Totalrequiredstaffnumber, Additionalvalue, Createdat, Createdbyid, Updatedat, Updatedbyid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientid, clientlocationid, shiftdate, starttime, endtime, qualificationid, totalrequiredstaffnumber, additionalvalue, now, createdbyid, now, updatedbyid]
    );
    const clientshiftrequestid = result.insertId;

    // Insert into Clientstaffshifts (one row per required staff)
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
      await dbConn.query(
        'INSERT INTO Clientstaffshifts (Clientshiftrequestid, Clientid, `Order`, Status, Createdat, Createdbyid, Updatedat, Updatedbyid) VALUES ?',
        [staffShiftInserts]
      );
    }

    // Return the created shift request and staff shifts
    const [createdShift] = await dbConn.query('SELECT csr.*, c.Name as clientname FROM Clientshiftrequests csr LEFT JOIN Clients c ON csr.Clientid = c.id WHERE csr.id = ?', [clientshiftrequestid]);
    const [createdStaffShifts] = await dbConn.query('SELECT * FROM Clientstaffshifts WHERE Clientshiftrequestid = ?', [clientshiftrequestid]);
    res.status(201).json({
      message: 'Shift request created successfully.',
      shift: createdShift[0],
      staffShifts: createdStaffShifts
    });
  } catch (err) {
    logger.error('Create shift request error', { error: err });
    res.status(500).json({ message: 'Failed to create shift request.', error: err.message });
  }
};

// Link a client user to a client (can only be done by Staff - Standard User or System Admin)
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

// Get client locations assigned to the logged-in client user
exports.getMyClientLocations = async (req, res) => {
  const userId = req.user?.id;
  const userType = req.user?.usertype;
  if (userType !== 'Client - Standard User' && userType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Clients only' });
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

// Get all clients and their linked locations (for staff/sys admin)
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

// Soft-delete a person (People table) by setting deletedat and deletedbyid
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
      console.log(`[softDeletePerson] Attempting to soft-delete Users.id=${linkedUserId}`);
      const [userUpdateResult] = await db.query(
        'UPDATE Users SET Deletedat = NOW(), Deletedbyid = ? WHERE id = ?',
        [deleterId, linkedUserId]
      );
      console.log(`[softDeletePerson] Users update result:`, userUpdateResult);
      if (userUpdateResult.affectedRows === 0) {
        console.warn(`[softDeletePerson] WARNING: No rows updated in Users for id=${linkedUserId}`);
      }
    } else {
      console.log(`[softDeletePerson] No linked user for People.id=${personId}`);
    }
    res.status(200).json({ message: 'Person soft-deleted (and user if linked)' });
  } catch (err) {
    logger.error('Soft-delete person error', { error: err });
    res.status(500).json({ message: 'Soft-delete error', error: err });
  }
};

const formatDate = (isoString) => {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: '2-digit' });
};
const formatDateTime = (isoString) => {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  return d.toLocaleString('en-AU', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// Staff: View available client shifts
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
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationid, l.Name AS qualificationname,
               csr.Totalrequiredstaffnumber
        FROM Clientshiftrequests csr
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        LEFT JOIN Lookups l ON csr.Qualificationid = l.ID
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
      // Format output
      const formatted = rows.map(row => ({
        ...row,
        Shiftdate: formatDate(row.Shiftdate),
        Starttime: formatDateTime(row.Starttime),
        Endtime: formatDateTime(row.Endtime),
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
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationid, l.Name AS qualificationname,
               csr.Totalrequiredstaffnumber
        FROM Clientshiftrequests csr
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        LEFT JOIN Lookups l ON csr.Qualificationid = l.ID
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
      // Format output
      const formatted = shiftRows.map(row => ({
        ...row,
        Shiftdate: formatDate(row.Shiftdate),
        Starttime: formatDateTime(row.Starttime),
        Endtime: formatDateTime(row.Endtime),
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
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationid, l.Name AS qualificationname,
               cl.LocationName, cl.LocationAddress, c.Name AS clientname
        FROM Clientstaffshifts css
        LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        LEFT JOIN Lookups l ON csr.Qualificationid = l.ID
        WHERE css.Status = 'open' AND css.Deletedat IS NULL
        ORDER BY csr.Shiftdate DESC, csr.Starttime DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      const formatted = rows.map(row => ({
        ...row,
        Shiftdate: formatDate(row.Shiftdate),
        Starttime: formatDateTime(row.Starttime),
        Endtime: formatDateTime(row.Endtime)
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
    logger.error('Get available client shifts error', { error: err });
    res.status(500).json({ message: 'Error fetching available shifts', error: err });
  }
};

// Accept a client staff shift (Employee, Staff, Admin)
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
      SELECT css.*, cl.LocationName, cl.LocationAddress, c.Name as clientname
      FROM Clientstaffshifts css
      LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
      LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
      LEFT JOIN Clients c ON cl.clientid = c.id
      WHERE css.id = ?
    `, [staffShiftId]);
    const updatedShift = updatedShiftRows[0] || null;
    res.status(200).json({ message: 'Shift accepted and pending admin approval', shift: updatedShift });
  } catch (err) {
    res.status(500).json({ message: 'Failed to accept shift', error: err.message });
  }
};

// Approve a client staff shift (Staff/Admin)
exports.approveClientStaffShift = async (req, res) => {
  // Placeholder implementation
  res.status(501).json({ message: 'Not implemented: approveClientStaffShift' });
};

// Reject a client staff shift (Staff/Admin)
exports.rejectClientStaffShift = async (req, res) => {
  // Placeholder implementation
  res.status(501).json({ message: 'Not implemented: rejectClientStaffShift' });
};

// Get all clients with their locations (no auth required)
exports.getClientLocations = async (req, res) => {
  try {
    // Debug: log that the function is called
    console.log('[getClientLocations] Called');
    // Get all clients
    const [clients] = await db.query('SELECT * FROM Clients');
    // Get all locations
    const [locations] = await db.query('SELECT * FROM Clientlocations');
    // Debug: log counts
    console.log(`[getClientLocations] Clients: ${clients.length}, Locations: ${locations.length}`);
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


