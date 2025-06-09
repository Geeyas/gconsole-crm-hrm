const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { hashPassword, generateSalt } = require('../utils/hashUtils');

const jwtSecret = process.env.JWT_SECRET;

exports.login = async (req, res) => {
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
      return res.status(401).json({ message: 'Invalid username or password' });

    const user = results[0];
    const hashedInput = hashPassword(password, user.salt);
    if (hashedInput !== user.passwordhash)
      return res.status(401).json({ message: 'Invalid credentials' });

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
    console.error('Login DB error:', err);
    res.status(500).json({ message: 'DB error', error: err });
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
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed', error: err });
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
    console.error('Password update error:', err);
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
    console.error('Table fetch error:', err);
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
    console.error('Usertype fetch error:', err);
    res.status(500).json({ message: 'Database error', error: err });
  }
};

exports.updateUserProfile = async (req, res) => {
  const targetUserId = req.params.id;
  const updaterId = req.user?.id;

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
    // Check if user exists in People table
    const [personRows] = await db.query(`SELECT * FROM People WHERE Linkeduserid = ?`, [targetUserId]);

    if (personRows.length === 0) {
      return res.status(404).json({ message: 'User not found in People table' });
    }

    await db.query(
      `UPDATE People SET
        Firstname = ?, Lastname = ?, Middlename = ?, Preferredname = ?, Emailaddress = ?, 
        Country = ?, State = ?, Suburb = ?, Postcode = ?, HomeAddress = ?, Workaddress = ?, 
        TFN = ?, BSB = ?, Bankaccountnumber = ?, 
        Updatedat = NOW(), Updatedbyid = ?
       WHERE Linkeduserid = ?`,
      [
        Firstname, Lastname, Middlename, Preferredname, Emailaddress,
        Country, State, Suburb, Postcode, HomeAddress, Workaddress,
        TFN, BSB, Bankaccountnumber,
        updaterId, targetUserId
      ]
    );

    const fullname = `${Firstname} ${Lastname}`;
    await db.query(
      `UPDATE Users SET fullname = ?, email = ?, updatedat = NOW(), updatedbyid = ?
       WHERE id = ?`,
      [fullname, Emailaddress, updaterId, targetUserId]
    );

    res.status(200).json({ message: 'User profile updated successfully' });

  } catch (err) {
    console.error('Update error:', err);
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
      return res.status(400).json({ message: 'Invalid client location' });
    }
    const clientid = locationRows[0].clientid;

    // ENFORCE: Client users can only raise shifts for their assigned locations
    if (userType === 'Client - Standard User') {
      const [userClientRows] = await dbConn.query(
        'SELECT 1 FROM Userclients WHERE userid = ? AND clientid = ?',
        [createdbyid, clientid]
      );
      if (!userClientRows.length) {
        return res.status(403).json({ message: 'Client user not authorized for this client/location' });
      }
    }
    // Staff - Standard User and System Admin can raise for any location (no restriction)

    // Validate qualification
    const [qualRows] = await dbConn.query(
      'SELECT 1 FROM Lookups WHERE id = ? AND Typeid = (SELECT ID FROM Lookuptypes WHERE Name = \'Qualification\')',
      [qualificationid]
    );
    if (!qualRows.length) {
      return res.status(400).json({ message: 'Invalid qualification' });
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
    const [createdShift] = await dbConn.query('SELECT * FROM Clientshiftrequests WHERE id = ?', [clientshiftrequestid]);
    const [createdStaffShifts] = await dbConn.query('SELECT * FROM Clientstaffshifts WHERE Clientshiftrequestid = ?', [clientshiftrequestid]);
    res.status(201).json({
      message: 'Shift request created',
      shift: createdShift[0],
      staffShifts: createdStaffShifts
    });
  } catch (err) {
    console.error('Create shift request error:', err);
    res.status(500).json({ message: 'Create shift request error', error: err });
  }
};

// Link a client user to a location (can only be done by Staff - Standard User or System Admin)
exports.linkClientUserToLocation = async (req, res) => {
  const { userid, clientlocationid } = req.body;
  const requesterType = req.user?.usertype;

  // Only Staff - Standard User or System Admin can use this endpoint
  if (requesterType !== 'Staff - Standard User' && requesterType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can link users to locations.' });
  }

  try {
    // Check if the user is a client user
    const [userRows] = await db.query(
      `SELECT u.id, ut.Name as usertype FROM Users u
       LEFT JOIN Assignedusertypes au ON au.Userid = u.id
       LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
       WHERE u.id = ?`,
      [userid]
    );
    if (!userRows.length || userRows[0].usertype !== 'Client - Standard User') {
      return res.status(400).json({ message: 'Target user is not a Client - Standard User.' });
    }

    // Get clientid from the location
    const [locationRows] = await db.query(
      'SELECT clientid FROM Clientlocations WHERE id = ?',
      [clientlocationid]
    );
    if (!locationRows.length) {
      return res.status(400).json({ message: 'Invalid client location.' });
    }
    const clientid = locationRows[0].clientid;

    // Link user to client in Userclients if not already linked
    const [existing] = await db.query(
      'SELECT * FROM Userclients WHERE userid = ? AND clientid = ?',
      [userid, clientid]
    );
    if (existing.length) {
      return res.status(200).json({ message: 'User is already linked to this client.' });
    }
    await db.query(
      'INSERT INTO Userclients (userid, clientid) VALUES (?, ?)',
      [userid, clientid]
    );
    res.status(201).json({ message: 'User linked to client for this location.' });
  } catch (err) {
    console.error('Link client user to location error:', err);
    res.status(500).json({ message: 'Link client user to location error', error: err });
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
    // Get all locations for these clientids
    const [locations] = await db.query(
      `SELECT * FROM Clientlocations WHERE clientid IN (${clientIds.map(() => '?').join(',')})`,
      clientIds
    );
    res.status(200).json({ locations });
  } catch (err) {
    console.error('Get my client locations error:', err);
    res.status(500).json({ message: 'Error fetching client locations', error: err });
  }
};

// Get available client shifts for staff (using Assignedtouserid and Isadminapproved)
exports.getAvailableClientShifts = async (req, res) => {
  const staffUserId = req.user?.id;
  const staffUsertype = req.user?.usertype;
  if (staffUsertype !== 'Staff - Standard User' && staffUsertype !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can view available shifts.' });
  }
  try {
    // Only show shifts with Status 'open' (not assigned, not pending/approved)
    const [rows] = await db.query(`
      SELECT csf.*, csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationid, csr.Clientlocationid
      FROM Clientstaffshifts csf
      JOIN Clientshiftrequests csr ON csf.Clientshiftrequestid = csr.id
      WHERE csf.Status = 'open'
    `);
    res.status(200).json({ availableShifts: rows });
  } catch (err) {
    console.error('Get available client shifts error:', err);
    res.status(500).json({ message: 'Error fetching available shifts', error: err });
  }
};

// Staff accepts a client staff shift (set Assignedtouserid, Isadminapproved=0, Status='pending approval')
exports.acceptClientStaffShift = async (req, res) => {
  const userId = req.user?.id;
  const userType = req.user?.usertype;
  const shiftId = req.params.id;
  // Allow Employee - Standard User, Staff - Standard User, and System Admin
  if (userType !== 'Employee - Standard User' && userType !== 'Staff - Standard User' && userType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only employees, staff, or admin can accept shifts.' });
  }
  try {
    // Check if shift is available
    const [rows] = await db.query('SELECT * FROM Clientstaffshifts WHERE id = ?', [shiftId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    const shift = rows[0];
    if (shift.Assignedtouserid && shift.Assignedtouserid !== 0) {
      return res.status(400).json({ message: 'Shift already assigned' });
    }
    if (shift.Isadminapproved && shift.Isadminapproved !== 0) {
      return res.status(400).json({ message: 'Shift already admin approved' });
    }
    // Assign user, set Isadminapproved to 0 (pending approval), and Status to 'pending approval'
    await db.query(
      'UPDATE Clientstaffshifts SET Assignedtouserid = ?, Isadminapproved = 0, Status = \'pending approval\', Updatedat = NOW(), Updatedbyid = ? WHERE id = ?',
      [userId, userId, shiftId]
    );
    // TODO: Notify admin for approval
    res.status(200).json({ message: 'Shift accepted and pending admin approval' });
  } catch (err) {
    console.error('Accept client staff shift error:', err);
    res.status(500).json({ message: 'Error accepting shift', error: err });
  }
};

// Admin approves a client staff shift (set Isadminapproved=1, Adminapprovedat=NOW(), Status='approved')
exports.approveClientStaffShift = async (req, res) => {
  const adminUserId = req.user?.id;
  const adminUsertype = req.user?.usertype;
  const shiftId = req.params.id;
  if (adminUsertype !== 'System Admin' && adminUsertype !== 'Staff - Standard User') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can approve shifts.' });
  }
  try {
    // Check if shift is pending admin approval
    const [rows] = await db.query('SELECT * FROM Clientstaffshifts WHERE id = ?', [shiftId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    const shift = rows[0];
    if (!shift.Assignedtouserid || shift.Assignedtouserid === 0) {
      return res.status(400).json({ message: 'Shift has not been accepted by staff' });
    }
    if (shift.Isadminapproved && shift.Isadminapproved !== 0) {
      return res.status(400).json({ message: 'Shift already admin approved' });
    }
    // Approve shift: set Isadminapproved=1, Adminapprovedat=NOW(), Status='approved'
    await db.query(
      'UPDATE Clientstaffshifts SET Isadminapproved = 1, Adminapprovedat = NOW(), Status = \'approved\', Updatedat = NOW(), Updatedbyid = ? WHERE id = ?',
      [adminUserId, shiftId]
    );
    // TODO: Notify staff and client
    res.status(200).json({ message: 'Shift approved' });
  } catch (err) {
    console.error('Approve client staff shift error:', err);
    res.status(500).json({ message: 'Error approving shift', error: err });
  }
};

// Admin rejects a client staff shift (set Assignedtouserid = NULL, Isadminapproved = 0, Status = 'open')
exports.rejectClientStaffShift = async (req, res) => {
  const adminUserId = req.user?.id;
  const adminUsertype = req.user?.usertype;
  const shiftId = req.params.id;
  if (adminUsertype !== 'System Admin' && adminUsertype !== 'Staff - Standard User') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can reject shifts.' });
  }
  try {
    // Check if shift exists
    const [rows] = await db.query('SELECT * FROM Clientstaffshifts WHERE id = ?', [shiftId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    // Reject shift: set Assignedtouserid = NULL, Isadminapproved = 0, Status = 'open'
    await db.query(
      'UPDATE Clientstaffshifts SET Assignedtouserid = NULL, Isadminapproved = 0, Status = \'open\', Updatedat = NOW(), Updatedbyid = ? WHERE id = ?',
      [adminUserId, shiftId]
    );
    res.status(200).json({ message: 'Shift rejected and reopened' });
  } catch (err) {
    console.error('Reject client staff shift error:', err);
    res.status(500).json({ message: 'Error rejecting shift', error: err });
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
    // Get all locations for these clientids
    const [locations] = await db.query(
      `SELECT * FROM Clientlocations WHERE clientid IN (${clientIds.map(() => '?').join(',')})`,
      clientIds
    );
    res.status(200).json({ locations });
  } catch (err) {
    console.error('Get my client locations error:', err);
    res.status(500).json({ message: 'Error fetching client locations', error: err });
  }
};


