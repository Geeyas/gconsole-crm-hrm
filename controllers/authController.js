// ================== removeQualificationFromEmployee ==================
// Removes a qualification from an employee (person) by deleting from Staffqualifications
exports.removeQualificationFromEmployee = async (req, res) => {
  const idParam = parseInt(req.params.id, 10);
  const qualificationId = parseInt(req.params.qualificationId, 10);
  const requesterType = req.user?.usertype;
  const requesterId = req.user?.id;

  if (!idParam || !qualificationId) {
    return res.status(400).json({ message: 'Missing person/user id or qualificationId.' });
  }

  try {
    // Find People record by ID or Linkeduserid, not soft-deleted
    const [peopleRows] = await db.query(
      `SELECT * FROM People WHERE (ID = ? OR Linkeduserid = ?) AND Deletedat IS NULL`,
      [idParam, idParam]
    );
    if (!peopleRows.length) {
      return res.status(404).json({ message: 'No People record found for this id (as ID or Linkeduserid).' });
    }
    const person = peopleRows[0];
    const userId = person.Linkeduserid;
    if (!userId) {
      return res.status(400).json({ message: 'No Linkeduserid found for this person.' });
    }

    // Only staff/admin or the user themselves can remove
    if (
      requesterType !== 'Staff - Standard User' &&
      requesterType !== 'System Admin' &&
      requesterId !== userId // allow self-remove if user is the linked user
    ) {
      return res.status(403).json({ message: 'Access denied: Only staff/admin or the user themselves can remove qualifications.' });
    }

    // Check if qualification exists
    const [qualRows] = await db.query('SELECT * FROM Qualifications WHERE ID = ?', [qualificationId]);
    if (!qualRows.length) {
      return res.status(404).json({ message: 'Qualification not found.' });
    }
    // Check if link exists and not already soft deleted
    const [existing] = await db.query('SELECT * FROM Staffqualifications WHERE Userid = ? AND QualificationID = ? AND Deletedat IS NULL', [userId, qualificationId]);
    if (!existing.length) {
      return res.status(404).json({ message: 'Qualification is not assigned to this user or already removed.' });
    }
    // Soft delete: set Deletedat and Deletedbyid
    await db.query('UPDATE Staffqualifications SET Deletedat = NOW(), Deletedbyid = ? WHERE Userid = ? AND QualificationID = ?', [requesterId, userId, qualificationId]);
    return res.status(200).json({ message: 'Qualification removed (soft deleted) from employee.' });
  } catch (err) {
    logger.error('Remove qualification from employee error', { error: err });
    return res.status(500).json({ message: 'Failed to remove qualification.', error: err.message });
  }
};
// ================== end removeQualificationFromEmployee ==================
// ================== addQualificationToEmployee ==================
// Adds a qualification to an employee (person) by inserting into Staffqualifications
exports.addQualificationToEmployee = async (req, res) => {
  const idParam = parseInt(req.params.id, 10);
  const qualificationId = parseInt(req.body.qualificationId, 10);
  const requesterType = req.user?.usertype;
  const requesterId = req.user?.id;

  if (!idParam || !qualificationId) {
    return res.status(400).json({ message: 'Missing person/user id or qualificationId.' });
  }

  try {
    // Find People record by ID or Linkeduserid, not soft-deleted
    const [peopleRows] = await db.query(
      `SELECT * FROM People WHERE (ID = ? OR Linkeduserid = ?) AND Deletedat IS NULL`,
      [idParam, idParam]
    );
    if (!peopleRows.length) {
      return res.status(404).json({ message: 'No People record found for this id (as ID or Linkeduserid).' });
    }
    const person = peopleRows[0];
    const userId = person.Linkeduserid;
    if (!userId) {
      return res.status(400).json({ message: 'No Linkeduserid found for this person.' });
    }

    // Only staff/admin or the user themselves can add
    if (
      requesterType !== 'Staff - Standard User' &&
      requesterType !== 'System Admin' &&
      requesterId !== userId // allow self-add if user is the linked user
    ) {
      return res.status(403).json({ message: 'Access denied: Only staff/admin or the user themselves can add qualifications.' });
    }

    // Check if qualification exists
    const [qualRows] = await db.query('SELECT * FROM Qualifications WHERE ID = ?', [qualificationId]);
    if (!qualRows.length) {
      return res.status(404).json({ message: 'Qualification not found.' });
    }

    // Check if already linked (including soft deleted)
    const [existing] = await db.query('SELECT * FROM Staffqualifications WHERE Userid = ? AND QualificationID = ?', [userId, qualificationId]);
    if (existing.length) {
      // If the only existing link is soft deleted, allow re-adding by inserting a new row
      const notDeleted = existing.find(e => !e.Deletedat);
      if (notDeleted) {
        return res.status(409).json({ message: 'Qualification already assigned to this user.' });
      }
      // else, allow re-adding (insert new row)
    }
    // Insert link (fill all required columns)
    await db.query(
      'INSERT INTO Staffqualifications (Userid, QualificationID, Createdat, Createdbyid, Updatedat, Updatedbyid) VALUES (?, ?, NOW(), ?, NOW(), ?)',
      [userId, qualificationId, requesterId, requesterId]
    );
    return res.status(201).json({ message: 'Qualification added to employee.' });
  } catch (err) {
    logger.error('Add qualification to employee error', { error: err });
    return res.status(500).json({ message: 'Failed to add qualification.', error: err.message });
  }
};
// ================== end addQualificationToEmployee ==================

// ================== getQualificationsForEmployee ==================
// Returns all qualifications assigned to a person (People.ID)
exports.getQualificationsForEmployee = async (req, res) => {
  const idParam = parseInt(req.params.id, 10);
  const requesterType = req.user?.usertype;
  const requesterId = req.user?.id;

  if (!idParam) {
    return res.status(400).json({ message: 'Missing person/user id.' });
  }

  try {
    // Find People record by ID or Linkeduserid, not soft-deleted
    const [peopleRows] = await db.query(
      `SELECT * FROM People WHERE (ID = ? OR Linkeduserid = ?) AND Deletedat IS NULL`,
      [idParam, idParam]
    );
    if (!peopleRows.length) {
      return res.status(404).json({ message: 'No People record found for this id (as ID or Linkeduserid).' });
    }
    const person = peopleRows[0];
    const userId = person.Linkeduserid;
    if (!userId) {
      return res.status(400).json({ message: 'No Linkeduserid found for this person.' });
    }

    // Only staff/admin or the user themselves can view
    if (
      requesterType !== 'Staff - Standard User' &&
      requesterType !== 'System Admin' &&
      requesterId !== userId // allow self-view if user is the linked user
    ) {
      return res.status(403).json({ message: 'Access denied: Only staff/admin or the user themselves can view qualifications.' });
    }

    // Get all qualifications for this user, excluding soft deleted
    const [qualRows] = await db.query(
      `SELECT q.ID, q.Name, sq.Createdat, sq.Updatedat
       FROM Staffqualifications sq
       JOIN Qualifications q ON sq.QualificationID = q.ID
       WHERE sq.Userid = ? AND sq.Deletedat IS NULL`,
      [userId]
    );
    return res.status(200).json({ qualifications: qualRows });
  } catch (err) {
    logger.error('Get qualifications for employee error', { error: err });
    return res.status(500).json({ message: 'Failed to fetch qualifications.', error: err.message });
  }
};
// ================== end getQualificationsForEmployee ==================
// ================== unlinkClientUserFromSpecificLocationByEmail ==================
// Staff/admin: Unlink a client user (by email) from a specific client location (by locationid) using Userclients table
exports.unlinkClientUserFromSpecificLocationByEmail = async (req, res) => {
  const requesterType = req.user?.usertype;
  if (requesterType !== 'Staff - Standard User' && requesterType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can use this endpoint.' });
  }
  const { emailaddress, locationid } = req.body;
  if (!emailaddress || !locationid) {
    return res.status(400).json({ message: 'Missing emailaddress or locationid in request body.' });
  }
  try {
    // Find the user by email and check usertype
    const [userRows] = await db.query(
      `SELECT u.id, ut.Name as usertype FROM Users u
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
    // Check if location exists and get clientid
    const [locRows] = await db.query('SELECT * FROM Clientlocations WHERE ID = ?', [locationid]);
    if (!locRows.length) {
      return res.status(400).json({ message: 'Invalid locationid.' });
    }
    const clientid = locRows[0].Clientid;
    // Check if link exists
    const [existing] = await db.query(
      'SELECT * FROM Userclients WHERE userid = ? AND clientid = ? AND clientlocationid = ?',
      [user.id, clientid, locationid]
    );
    if (!existing.length) {
      return res.status(404).json({ message: 'User is not linked to this location.' });
    }
    // Unlink user from location
    await db.query(
      'DELETE FROM Userclients WHERE userid = ? AND clientid = ? AND clientlocationid = ?',
      [user.id, clientid, locationid]
    );
    res.status(200).json({ message: 'User unlinked from location successfully.' });
  } catch (err) {
    logger.error('Unlink client user from specific location by email error', { error: err });
    res.status(500).json({ message: 'Error unlinking client user from location', error: err });
  }
};
// ================== end unlinkClientUserFromSpecificLocationByEmail ==================
// ================== unlinkClientUserFromSpecificLocationByEmail ==================
// Staff/admin: Unlink a client user (by email) from a specific client location (by locationid) using Userclients table
exports.unlinkClientUserFromSpecificLocationByEmail = async (req, res) => {
  const requesterType = req.user?.usertype;
  if (requesterType !== 'Staff - Standard User' && requesterType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can use this endpoint.' });
  }
  const { emailaddress, locationid } = req.body;
  if (!emailaddress || !locationid) {
    return res.status(400).json({ message: 'Missing emailaddress or locationid in request body.' });
  }
  try {
    // Find the user by email and check usertype
    const [userRows] = await db.query(
      `SELECT u.id, ut.Name as usertype FROM Users u
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
    // Check if location exists and get clientid
    const [locRows] = await db.query('SELECT * FROM Clientlocations WHERE ID = ?', [locationid]);
    if (!locRows.length) {
      return res.status(400).json({ message: 'Invalid locationid.' });
    }
    const clientid = locRows[0].Clientid;
    // Check if link exists
    const [existing] = await db.query(
      'SELECT * FROM Userclients WHERE userid = ? AND clientid = ? AND clientlocationid = ?',
      [user.id, clientid, locationid]
    );
    if (!existing.length) {
      return res.status(404).json({ message: 'User is not linked to this location.' });
    }
    // Unlink user from location (delete Userclients row)
    await db.query(
      'DELETE FROM Userclients WHERE userid = ? AND clientid = ? AND clientlocationid = ?',
      [user.id, clientid, locationid]
    );
    res.status(200).json({ message: 'User unlinked from location successfully.' });
  } catch (err) {
    logger.error('Unlink client user from specific location by email error', { error: err });
    res.status(500).json({ message: 'Error unlinking client user from location', error: err });
  }
};
// ================== end unlinkClientUserFromSpecificLocationByEmail ==================
// ================== linkClientUserToSpecificLocationByEmail ==================
// Staff/admin: Link a client user (by email) to a specific client location (by locationid) using Userclients table
exports.linkClientUserToSpecificLocationByEmail = async (req, res) => {
  const requesterType = req.user?.usertype;
  if (requesterType !== 'Staff - Standard User' && requesterType !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin can use this endpoint.' });
  }
  const { emailaddress, locationid } = req.body;
  if (!emailaddress || !locationid) {
    return res.status(400).json({ message: 'Missing emailaddress or locationid in request body.' });
  }
  try {
    // Find the user by email and check usertype
    const [userRows] = await db.query(
      `SELECT u.id, ut.Name as usertype FROM Users u
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
    // Check if location exists and get clientid
    const [locRows] = await db.query('SELECT * FROM Clientlocations WHERE ID = ?', [locationid]);
    if (!locRows.length) {
      return res.status(400).json({ message: 'Invalid locationid.' });
    }
    const clientid = locRows[0].Clientid;
    // Check if already linked (Userclients table, with location)
    const [existing] = await db.query(
      'SELECT * FROM Userclients WHERE userid = ? AND clientid = ? AND clientlocationid = ?',
      [user.id, clientid, locationid]
    );
    if (existing.length) {
      return res.status(200).json({ message: 'User is already linked to this location.' });
    }
    // Link user to location (Userclients row with clientlocationid)
    await db.query(
      'INSERT INTO Userclients (userid, clientid, clientlocationid) VALUES (?, ?, ?)',
      [user.id, clientid, locationid]
    );
    res.status(201).json({ message: 'User linked to location successfully.' });
  } catch (err) {
    logger.error('Link client user to specific location by email error', { error: err });
    res.status(500).json({ message: 'Error linking client user to location', error: err });
  }
};
// ================== end linkClientUserToSpecificLocationByEmail ==================
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
      { expiresIn: '2h' }
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
      { expiresIn: '2h' }
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
      `INSERT INTO People (Firstname, Lastname, Emailaddress, Hiredate, Createdat, Createdbyid, Updatedat, Updatedbyid)
       VALUES (?, ?, ?, NOW(), NOW(), ?, NOW(), ?)`,
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
// Allows any authenticated user to update a user's password.
exports.updatePassword = async (req, res) => {
  const { username, newPassword } = req.body;
  const updaterId = req.user?.id;

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
  const updaterType = req.user?.usertype;

  // Check if person exists in People table
  let personRows;
  try {
    [personRows] = await db.query(`SELECT * FROM People WHERE ID = ?`, [personId]);
  } catch (err) {
    logger.error('DB error fetching People for updateUserProfile', { error: err });
    return res.status(500).json({ message: 'Database error', error: err.message });
  }
  if (!personRows.length) {
    return res.status(404).json({ message: 'User not found in People table' });
  }
  const person = personRows[0];
  const deletedAt = person.Deletedat || person.deletedat || person.DELETEDAT;
  if (deletedAt !== null && deletedAt !== undefined && String(deletedAt).trim() !== '') {
    return res.status(400).json({ message: 'Cannot update a soft-deleted person.' });
  }
  const linkedUserId = person.Linkeduserid;

  // Authorization logic: allow if staff/admin, or if user is updating their own record
  if (
    updaterId !== linkedUserId &&
    updaterType !== 'Staff - Standard User' &&
    updaterType !== 'System Admin'
  ) {
    return res.status(403).json({ message: 'Access denied: Only staff/admin or the user themselves can update this record.' });
  }

  // Extract all fields for People table (full schema)
  const {
    Firstname,
    Lastname,
    Middlename,
    Preferredname,
    Emailaddress,
    Contact,
    Country,
    State,
    Suburb,
    Postcode,
    HomeAddress,
    Workaddress,
    Phonemobile,
    Phonehome,
    Phonework,
    Gender,
    Issubcontractor,
    Isaustraliantaxresident,
    Isworkingholidaymarker,
    Isterminated,
    Hasvehicle,
    Terminatedat,
    TFN,
    ABN,
    BSB,
    Bankaccountnumber,
    SuperfundID,
    AdditionalInformation
  } = req.body;

  try {
    // Update People table with all fields
    await db.query(
      `UPDATE People SET
        Firstname = ?, Lastname = ?, Middlename = ?, Preferredname = ?, Emailaddress = ?, 
        Contact = ?, Country = ?, State = ?, Suburb = ?, Postcode = ?, HomeAddress = ?, Workaddress = ?,
        Phonemobile = ?, Phonehome = ?, Phonework = ?, Gender = ?,
        Issubcontractor = ?, Isaustraliantaxresident = ?, Isworkingholidaymarker = ?, Isterminated = ?, Hasvehicle = ?,
        Terminatedat = ?, TFN = ?, ABN = ?, BSB = ?, Bankaccountnumber = ?, SuperfundID = ?,
        AdditionalInformation = ?,
        Updatedat = NOW(), Updatedbyid = ?
       WHERE ID = ?`,
      [
        Firstname, Lastname, Middlename, Preferredname, Emailaddress,
        Contact, Country, State, Suburb, Postcode, HomeAddress, Workaddress,
        Phonemobile, Phonehome, Phonework, Gender,
        Issubcontractor, Isaustraliantaxresident, Isworkingholidaymarker, Isterminated, Hasvehicle,
        Terminatedat, TFN, ABN, BSB, Bankaccountnumber, SuperfundID,
        AdditionalInformation,
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
    // Improved error logging for debugging
    logger.error('Update error', {
      error: err,
      message: err && err.message,
      stack: err && err.stack,
      sql: err && err.sql,
      code: err && err.code,
      full: JSON.stringify(err)
    });
    res.status(500).json({
      message: 'Failed to update profile',
      error: err && err.message,
      stack: err && err.stack,
      sql: err && err.sql,
      code: err && err.code
    });
  }
};
// ================== end updateUserProfile ==================

// ================== getMyPeopleInfo ==================
// Returns all People table info for the logged-in user (from JWT)
exports.getMyPeopleInfo = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
    }
    // Find the People record linked to this user
    const [peopleRows] = await db.query('SELECT * FROM People WHERE Linkeduserid = ?', [userId]);
    if (!peopleRows.length) {
      return res.status(404).json({ message: 'No People record found for this user.' });
    }
    // Optionally, filter out soft-deleted
    const person = peopleRows[0];
    const deletedAt = person.Deletedat || person.deletedat || person.DELETEDAT;
    if (deletedAt !== null && deletedAt !== undefined && String(deletedAt).trim() !== '') {
      return res.status(400).json({ message: 'This People record is soft-deleted.' });
    }
    res.status(200).json({ person });
  } catch (err) {
    logger.error('getMyPeopleInfo error', { error: err });
    res.status(500).json({ message: 'Failed to fetch People info', error: err.message });
  }
};
// ================== end getMyPeopleInfo ==================

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
    // Fetch all Employee - Standard User users who are qualified for this shift
    // 1. Get all qualification IDs in this group
    const [groupQualRows] = await dbConn.query(
      `SELECT Qualificationid FROM Qualificationgroupitems WHERE Qualificationgroupid = ?`,
      [qualificationgroupid]
    );
    const groupQualIds = groupQualRows.map(q => q.Qualificationid);
    let qualifiedEmployeeRows = [];
    if (groupQualIds.length) {
      // 2. Find all employees who have at least one of these qualifications
      const placeholders = groupQualIds.map(() => '?').join(',');
      const [rows] = await dbConn.query(
        `SELECT DISTINCT u.email, u.fullname
         FROM Users u
         LEFT JOIN Assignedusertypes au ON au.Userid = u.id
         LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
         LEFT JOIN Staffqualifications sq ON sq.Userid = u.id
         WHERE ut.Name = 'Employee - Standard User' AND u.email IS NOT NULL
           AND sq.QualificationID IN (${placeholders})`,
        groupQualIds
      );
      qualifiedEmployeeRows = rows;
    }
    logger.info('Qualified employee notification target list', { count: qualifiedEmployeeRows.length, emails: qualifiedEmployeeRows.map(e => e.email) });
    if (qualifiedEmployeeRows && qualifiedEmployeeRows.length) {
      const shift = createdShift[0];
      const locationName = shift.LocationName || '';
      const clientName = shift.clientname || '';
      const shiftDate = shift.Shiftdate;
      const startTime = shift.Starttime;
      const endTime = shift.Endtime;
      // Await all emails before responding
      await Promise.all(qualifiedEmployeeRows.map(async (emp) => {
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
    return res.status(403).json({ message: 'Access denied: Only staff or admin can use this endpoint.' });
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
// Returns all client locations assigned to the logged-in client user, or all locations for staff/admin.
exports.getMyClientLocations = async (req, res) => {
  const userId = req.user?.id;
  const userType = req.user?.usertype;
  if (userType !== 'Client - Standard User' && userType !== 'System Admin' && userType !== 'Staff - Standard User') {
    return res.status(403).json({ message: 'Access denied: Clients, staff, or admin only' });
  }
  try {
    if (userType === 'System Admin' || userType === 'Staff - Standard User') {
      // Return ALL client locations, grouped by client, EXCLUDING soft-deleted
      const [locations] = await db.query(
        `SELECT cl.*, c.Name as clientname
         FROM Clientlocations cl
         LEFT JOIN Clients c ON cl.clientid = c.id
         WHERE cl.Deletedat IS NULL`
      );
      // Group by client
      const clientsMap = {};
      locations.forEach(loc => {
        if (!clientsMap[loc.clientid]) {
          clientsMap[loc.clientid] = {
            id: loc.clientid,
            name: loc.clientname,
            locations: []
          };
        }
        clientsMap[loc.clientid].locations.push({
          id: loc.ID,
          clientid: loc.clientid,
          locationname: loc.LocationName,
          locationaddress: loc.LocationAddress || '',
        });
      });
      return res.status(200).json({ clients: Object.values(clientsMap) });
    } else {
      // Client - Standard User: only their linked client locations, EXCLUDING soft-deleted
      // Get all clientids for this user from Userclients
      const [clientRows] = await db.query('SELECT clientid FROM Userclients WHERE userid = ?', [userId]);
      if (!clientRows.length) {
        return res.status(200).json({ clients: [] });
      }
      const clientIds = clientRows.map(row => row.clientid);
      // Get all locations for these clientids, join with client info, EXCLUDING soft-deleted
      const [locations] = await db.query(
        `SELECT cl.*, c.Name as clientname
         FROM Clientlocations cl
         LEFT JOIN Clients c ON cl.clientid = c.id
         WHERE cl.clientid IN (${clientIds.map(() => '?').join(',')}) AND cl.Deletedat IS NULL`,
        clientIds
      );
      // Group by client
      const clientsMap = {};
      locations.forEach(loc => {
        if (!clientsMap[loc.clientid]) {
          clientsMap[loc.clientid] = {
            id: loc.clientid,
            name: loc.clientname,
            locations: []
          };
        }
        clientsMap[loc.clientid].locations.push({
          id: loc.ID,
          clientid: loc.clientid,
          locationname: loc.LocationName,
          locationaddress: loc.LocationAddress || '',
        });
      });
      return res.status(200).json({ clients: Object.values(clientsMap) });
    }
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
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid, csr.Totalrequiredstaffnumber,
               u.fullname AS creatorName
        FROM Clientshiftrequests csr
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        LEFT JOIN Users u ON csr.Createdbyid = u.id
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
           WHERE css.Clientshiftrequestid IN (${shiftIds.map(() => '?').join(',')})`,
          shiftIds
        );
        // Filter out soft-deleted slots in code (defensive)
        staffShifts = staffRows.filter(s => !s.Deletedat);
      }
      // Group staff shifts by shiftrequestid
      const staffShiftsByRequest = {};
      staffShifts.forEach(s => {
        if (!staffShiftsByRequest[s.Clientshiftrequestid]) staffShiftsByRequest[s.Clientshiftrequestid] = [];
        // Defensive: filter out soft-deleted slots
        if (!s.Deletedat) staffShiftsByRequest[s.Clientshiftrequestid].push(s);
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
      const formatted = rows
        .filter(row => !row.Deletedat) // Defensive: filter out soft-deleted parent shifts
        .map(row => ({
          ...row,
          Shiftdate: formatDate(row.Shiftdate),
          Starttime: formatDateTime(row.Starttime),
          Endtime: formatDateTime(row.Endtime),
          qualificationname: qualMap[row.Qualificationgroupid] || [], // keep variable name
          StaffShifts: (staffShiftsByRequest[row.shiftrequestid] || [])
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
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid, csr.Totalrequiredstaffnumber,
               u.fullname AS creatorName
        FROM Clientshiftrequests csr
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        LEFT JOIN Users u ON csr.Createdbyid = u.id
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
           WHERE css.Clientshiftrequestid IN (${shiftIds.map(() => '?').join(',')})`,
          shiftIds
        );
        // Filter out soft-deleted slots in code (defensive)
        staffShifts = staffRows.filter(s => !s.Deletedat);
      }
      // Group staff shifts by shiftrequestid
      const staffShiftsByRequest = {};
      staffShifts.forEach(s => {
        if (!staffShiftsByRequest[s.Clientshiftrequestid]) staffShiftsByRequest[s.Clientshiftrequestid] = [];
        // Defensive: filter out soft-deleted slots
        if (!s.Deletedat) staffShiftsByRequest[s.Clientshiftrequestid].push(s);
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
      const formatted = shiftRows
        .filter(row => !row.Deletedat) // Defensive: filter out soft-deleted parent shifts
        .map(row => ({
          ...row,
          Shiftdate: formatDate(row.Shiftdate),
          Starttime: formatDateTime(row.Starttime),
          Endtime: formatDateTime(row.Endtime),
          qualificationname: qualMap[row.Qualificationgroupid] || [], // keep variable name
          StaffShifts: (staffShiftsByRequest[row.shiftrequestid] || [])
        }));
      return res.status(200).json({ availableShifts: formatted, pagination: { page, limit, total } });
    } else if (userType === 'Employee - Standard User') {
      // For Employee - Standard User:
      // - Only show one open slot per shift (first available)
      // - Hide shifts where user is already assigned (pending/approved/open)
      // - Only include shifts for which the employee is qualified (via Qualificationgroupid)
      // - Only show shifts for today or in the future

      // Step 1: Get employee's active qualification IDs (not soft-deleted)
      const [empQualRows] = await db.query(
        `SELECT QualificationID FROM Staffqualifications WHERE Userid = ? AND Deletedat IS NULL`,
        [userId]
      );
      const empQualIds = empQualRows.map(q => q.QualificationID);
      if (empQualIds.length === 0) {
        // Employee has no qualifications, so no shifts are available
        return res.status(200).json({ availableShifts: [], pagination: { page, limit, total: 0 } });
      }

      // Step 2: Get all open staff shifts not already assigned to this employee, for today or future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [rows] = await db.query(`
        SELECT css.id AS staffshiftid, css.Clientshiftrequestid, css.Clientid, css.Status, css.Order,
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid,
               cl.LocationName, cl.LocationAddress, c.Name AS clientname
        FROM Clientstaffshifts css
        LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        WHERE css.Status = 'open' AND css.Deletedat IS NULL
          AND csr.Shiftdate >= ?
          AND css.Clientshiftrequestid NOT IN (
            SELECT Clientshiftrequestid FROM Clientstaffshifts
            WHERE Assignedtouserid = ? AND Deletedat IS NULL AND Status IN ('pending approval', 'approved', 'open')
          )
        ORDER BY csr.Shiftdate DESC, csr.Starttime DESC, css.id ASC
      `, [formatDate(today), userId]);

      // Step 3: Group by shiftrequestid, pick only the first open slot per shift
      const seenShiftIds = new Set();
      const uniqueRows = [];
      for (const row of rows) {
        if (!seenShiftIds.has(row.Clientshiftrequestid)) {
          uniqueRows.push(row);
          seenShiftIds.add(row.Clientshiftrequestid);
        }
      }

      // Step 4: Fetch qualifications for all qualificationgroupids
      const groupIds = [...new Set(uniqueRows.map(r => r.Qualificationgroupid).filter(Boolean))];
      let qualMap = {};
      let groupQuals = {};
      if (groupIds.length) {
        const [qualRows] = await db.query(
          `SELECT qgi.Qualificationgroupid, qgi.Qualificationid, q.Name
           FROM Qualificationgroupitems qgi
           JOIN Qualifications q ON qgi.Qualificationid = q.ID
           WHERE qgi.Qualificationgroupid IN (${groupIds.map(() => '?').join(',')})`,
          groupIds
        );
        // Map groupId -> [qualification names]
        qualMap = groupIds.reduce((acc, gid) => {
          acc[gid] = qualRows.filter(q => q.Qualificationgroupid === gid).map(q => q.Name);
          return acc;
        }, {});
        // Map groupId -> [qualification IDs]
        groupQuals = groupIds.reduce((acc, gid) => {
          acc[gid] = qualRows.filter(q => q.Qualificationgroupid === gid).map(q => q.Qualificationid);
          return acc;
        }, {});
      }

      // Step 5: Filter shifts by employee's qualifications
      const qualifiedRows = uniqueRows.filter(row => {
        const groupQ = groupQuals[row.Qualificationgroupid] || [];
        // Employee is qualified if they have at least one qualification in the group
        return groupQ.some(qid => empQualIds.includes(qid));
      });

      // Step 6: Paginate
      const paginatedRows = qualifiedRows.slice((page - 1) * limit, (page - 1) * limit + limit);

      // Step 7: Format output
      const formatted = paginatedRows.map(row => ({
        ...row,
        Shiftdate: formatDate(row.Shiftdate),
        Starttime: formatDateTime(row.Starttime),
        Endtime: formatDateTime(row.Endtime),
        qualificationname: qualMap[row.Qualificationgroupid] || []
      }));
      return res.status(200).json({ availableShifts: formatted, pagination: { page, limit, total: qualifiedRows.length } });
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
    // 2. Reject the shift: set status back to 'open', clear assignment, approval fields
    await db.query(
      'UPDATE Clientstaffshifts SET Status = ?, Assignedtouserid = NULL, Approvedbyid = NULL, Approvedat = NULL WHERE id = ?',
      ['open', staffShiftId]
    );
    // 3. Fetch updated shift info (for notification)
    const [updatedShiftRows] = await db.query(`
      SELECT css.*, cl.LocationName, cl.LocationAddress, c.Name as clientname, u.fullname as employeeName, u.email as employeeEmail, csr.Shiftdate AS Shiftdate, csr.Starttime AS Starttime, csr.Endtime AS Endtime
      FROM Clientstaffshifts css
      LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
      LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
      LEFT JOIN Clients c ON cl.clientid = c.id
      LEFT JOIN Users u ON css.Assignedtouserid = u.id
      WHERE css.id = ?
    `, [staffShiftId]);
    // Note: After clearing assignment, employee info will be null, so use previous assignment for notification
    // Instead, get the previous employee info before clearing
    const [prevEmployeeRows] = await db.query(
      'SELECT u.fullname as employeeName, u.email as employeeEmail FROM Users u WHERE u.id = ?',
      [shift.Assignedtouserid]
    );
    const prevEmployee = prevEmployeeRows[0] || {};
    // 4. Notify employee (if there was one assigned)
    if (prevEmployee.employeeEmail) {
      const templateEmp = mailTemplates.shiftRejectedEmployee({
        employeeName: prevEmployee.employeeName,
        clientName: updatedShiftRows[0]?.clientname,
        locationName: updatedShiftRows[0]?.LocationName,
        shiftDate: updatedShiftRows[0]?.Shiftdate,
        startTime: updatedShiftRows[0]?.Starttime,
        endTime: updatedShiftRows[0]?.Endtime
      });
      sendMail({
        to: prevEmployee.employeeEmail,
        subject: templateEmp.subject,
        html: templateEmp.html
      }).catch(e => logger.error('Email send error (reject shift to employee)', { error: e }));
    }
    res.status(200).json({ message: 'Shift rejected, employee notified, and slot reopened for others.', shift: updatedShiftRows[0] });
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
    let newTotalRequired = undefined;
    let oldTotalRequired = shift.Totalrequiredstaffnumber;
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field.charAt(0).toUpperCase() + field.slice(1) } = ?`);
        params.push(req.body[field]);
        if (field === 'totalrequiredstaffnumber') newTotalRequired = req.body[field];
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

    // ================== STAFF SHIFT SLOT ADJUSTMENT ==================
    if (newTotalRequired !== undefined && newTotalRequired !== oldTotalRequired) {
      // Restore soft-deleted slots first
      const [softDeletedSlots] = await dbConn.query('SELECT * FROM Clientstaffshifts WHERE Clientshiftrequestid = ? AND Deletedat IS NOT NULL ORDER BY `Order`', [shiftId]);
      let restored = 0;
      for (let i = 0; i < softDeletedSlots.length && restored < (newTotalRequired - oldTotalRequired); i++) {
        const slot = softDeletedSlots[i];
        await dbConn.query('UPDATE Clientstaffshifts SET Deletedat = NULL, Deletedbyid = NULL, Updatedat = ?, Updatedbyid = ? WHERE id = ?', [now, userId, slot.ID]);
        restored++;
      }
      // Re-fetch the count of active slots after restoration
      const [activeSlots] = await dbConn.query('SELECT * FROM Clientstaffshifts WHERE Clientshiftrequestid = ? AND Deletedat IS NULL ORDER BY `Order`', [shiftId]);
      const currentActiveCount = activeSlots.length;
      if (newTotalRequired > currentActiveCount) {
        // Find the max `Order` value among all slots (including soft-deleted)
        const [allSlots] = await dbConn.query('SELECT MAX(`Order`) as maxOrder FROM Clientstaffshifts WHERE Clientshiftrequestid = ?', [shiftId]);
        let maxOrder = allSlots[0]?.maxOrder || 0;
        const slotsToCreate = newTotalRequired - currentActiveCount;
        const staffShiftInserts = [];
        for (let i = 1; i <= slotsToCreate; i++) {
          staffShiftInserts.push([
            shiftId,
            shift.Clientid,
            maxOrder + i,
            'open', // Status
            now,
            userId,
            now,
            userId
          ]);
        }
        if (staffShiftInserts.length) {
          const placeholders = staffShiftInserts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const flatValues = staffShiftInserts.flat();
          const staffShiftSql = `INSERT INTO Clientstaffshifts (Clientshiftrequestid, Clientid, ` +
            '`Order`, Status, Createdat, Createdbyid, Updatedat, Updatedbyid) VALUES ' + placeholders;
          await dbConn.query(staffShiftSql, flatValues);
        }
      } else if (newTotalRequired < currentActiveCount) {
        // Remove (soft-delete) unassigned slots, starting from the highest order
        let toRemove = currentActiveCount - newTotalRequired;
        for (let i = activeSlots.length - 1; i >= 0 && toRemove > 0; i--) {
          const slot = activeSlots[i];
          if (!slot.Assignedtouserid && slot.Status === 'open' && !slot.Deletedat) {
            await dbConn.query('UPDATE Clientstaffshifts SET Deletedat = ?, Deletedbyid = ? WHERE id = ?', [now, userId, slot.ID]);
            toRemove--;
          }
        }
      }
    }
    // ================== END STAFF SHIFT SLOT ADJUSTMENT ==================

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

    // ========== Notify assigned/approved employees about shift update =========
    // Find all staff shift slots for this request with status 'approved' and assigned employee
    const [approvedSlots] = await dbConn.query(
      `SELECT css.id, css.Assignedtouserid, u.email, u.fullname, cl.LocationName, cl.LocationAddress, c.Name as clientname
       FROM Clientstaffshifts css
       LEFT JOIN Users u ON css.Assignedtouserid = u.id
       LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
       LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
       LEFT JOIN Clients c ON cl.clientid = c.id
       WHERE css.Clientshiftrequestid = ? AND css.Status = 'approved' AND css.Assignedtouserid IS NOT NULL AND css.Deletedat IS NULL`,
      [shiftId]
    );
    for (const slot of approvedSlots) {
      if (slot.email) {
        const templateEmp = mailTemplates.shiftUpdatedEmployee({
          employeeName: slot.fullname,
          clientName: slot.clientname,
          locationName: slot.LocationName,
          shiftDate: updatedRows[0].Shiftdate,
          startTime: updatedRows[0].Starttime,
          endTime: updatedRows[0].Endtime
        });
        sendMail({
          to: slot.email,
          subject: templateEmp.subject,
          html: templateEmp.html
        }).catch(e => logger.error('Email send error (shift update to employee)', { error: e }));
      }
    }
    // ========== End notification ==========

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
    // Soft-delete: set Deletedat and Deletedbyid on the main shift request
    await dbConn.query('UPDATE Clientshiftrequests SET Deletedat = ?, Deletedbyid = ? WHERE id = ?', [now, userId, shiftId]);
    // Soft-delete all related staff shift slots
    await dbConn.query('UPDATE Clientstaffshifts SET Deletedat = ?, Deletedbyid = ? WHERE Clientshiftrequestid = ? AND Deletedat IS NULL', [now, userId, shiftId]);
    res.status(200).json({ message: 'Shift request and all related staff shift slots deleted successfully.' });
  } catch (err) {
    logger.error('Delete shift request error', { error: err });
    res.status(500).json({ message: 'Failed to delete shift request.', error: err.message });
  }
};
// ================== end deleteClientShiftRequest ==================

// ================== getMyShifts ==================
// Returns all shifts accepted, assigned, or rejected for the logged-in employee
exports.getMyShifts = async (req, res) => {
  const userId = req.user?.id;
  const userType = req.user?.usertype;
  if (userType !== 'Employee - Standard User') {
    return res.status(403).json({ message: 'Access denied: Employees only' });
  try {
    // Only show shifts for today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Get all staff shifts assigned to this user, status pending approval, approved, or rejected, and not in the past
    const [rows] = await db.query(`
      SELECT css.id AS staffshiftid, css.Clientshiftrequestid, css.Clientid, css.Status, css.Order,
             csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid,
             cl.LocationName, cl.LocationAddress, c.Name AS clientname
      FROM Clientstaffshifts css
      LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
      LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
      LEFT JOIN Clients c ON cl.clientid = c.id
      WHERE css.Assignedtouserid = ?
        AND css.Status IN ('pending approval', 'approved', 'rejected')
        AND css.Deletedat IS NULL
        AND csr.Shiftdate >= ?
      ORDER BY csr.Shiftdate DESC, csr.Starttime DESC
    `, [userId, formatDate(today)]);
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
      qualificationname: qualMap[row.Qualificationgroupid] || []
    }));
    res.status(200).json({ myShifts: formatted });
  } catch (err) {
    logger.error('Get my shifts error', { error: err });
    res.status(500).json({ message: 'Error fetching my shifts', error: err });
  }
  }
};
// ================== end getMyShifts ==================

// ================== assignEmployeeToStaffShift ==================
// Assign an employee to a staff shift slot by email ( admin/staff/client only)
exports.assignEmployeeToStaffShift = async (req, res) => {
  const staffShiftId = req.params.id;
  const { emailaddress } = req.body;
  const assignerId = req.user?.id;
  const userType = req.user?.usertype;
  const now = new Date();

  // Only Staff, Client, or System Admin can assign
  if (
    userType !== 'Staff - Standard User' &&
    userType !== 'System Admin' &&
    userType !== 'Client - Standard User'
  ) {
    return res.status(403).json({ message: 'Access denied: Only staff, client, or admin can assign employees.' });
  }

  if (!emailaddress) {
    return res.status(400).json({ message: 'Missing emailaddress in request body.' });
  }

  try {
    // 1. Find the employee by email and check usertype
    const [userRows] = await db.query(
     
          
      `SELECT u.id, u.fullname, u.email, ut.Name as usertype FROM Users u
       LEFT JOIN Assignedusertypes au ON au.Userid = u.id
       LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
       WHERE u.email = ?`,
      [emailaddress]
    );
    if (!userRows.length) {
      return res.status(404).json({ message: 'Employee not found with the provided email address.' });
    }
    const employee = userRows[0];
    if (employee.usertype !== 'Employee - Standard User') {
      return res.status(400).json({ message: 'Provided email does not belong to an employee user.' });
    }

    // 2. Get the staff shift slot and its shift request info
    const [shiftRows] = await db.query(
      `SELECT css.id, css.Clientshiftrequestid, csr.Shiftdate, csr.Starttime, csr.Endtime, cl.LocationName, cl.LocationAddress, c.Name as clientname
       FROM Clientstaffshifts css
       JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
       LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
       LEFT JOIN Clients c ON cl.clientid = c.id
       WHERE css.id = ? AND css.Deletedat IS NULL`,
      [staffShiftId]
    );
    if (!shiftRows.length) {
      return res.status(404).json({ message: 'Staff shift slot not found.' });
    }
    const shiftSlot = shiftRows[0];

    // 3. Check for overlapping shifts for this employee
    const [overlapRows] = await db.query(
      `SELECT css.id
       FROM Clientstaffshifts css
       JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
       WHERE css.Assignedtouserid = ?
         AND css.Status IN ('pending approval', 'approved')
         AND css.Deletedat IS NULL
         AND csr.Shiftdate = ?
         AND css.id != ?
         AND NOT (
           ? >= csr.Endtime OR
           ? <= csr.Starttime
         )`,
      [
        employee.id,
        shiftSlot.Shiftdate,
        staffShiftId,
        shiftSlot.Starttime, // new shift start
        shiftSlot.Endtime    // new shift end
      ]
    );
    if (overlapRows.length) {
      return res.status(400).json({ message: 'Employee already has a shift assigned that overlaps with this time.' });
    }

    // 4. Assign the employee and approve the slot, update audit fields
    await db.query(
      `UPDATE Clientstaffshifts
       SET Assignedtouserid = ?, Status = 'approved', Approvedbyid = ?, Approvedat = ?, Updatedat = ?, Updatedbyid = ?
       WHERE id = ?`,
      [employee.id, assignerId, now, now, assignerId, staffShiftId]
    );

    // 5. Send notification to employee and all client users for this client
    // Notify employee
    if (employee.email) {
      const templateEmp = mailTemplates.shiftApprovedEmployee({
        employeeName: employee.fullname,
        clientName: shiftSlot.clientname,
        locationName: shiftSlot.LocationName,
        shiftDate: shiftSlot.Shiftdate,
        startTime: shiftSlot.Starttime,
        endTime: shiftSlot.Endtime
      });
      sendMail({
        to: employee.email,
        subject: templateEmp.subject,
        html: templateEmp.html
      }).catch(e => logger.error('Email send error (assign shift to employee)', { error: e }));
    }
    // Notify all client users for this client
    const [clientUsers] = await db.query(`
      SELECT u.email, c.Name as clientName
      FROM Userclients uc
      LEFT JOIN Users u ON uc.userid = u.id
      LEFT JOIN Clients c ON uc.clientid = c.id
      WHERE uc.clientid = (
        SELECT cl.clientid FROM Clientstaffshifts css
        JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
        JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        WHERE css.id = ?
        LIMIT 1
      )
    `, [staffShiftId]);
    for (const client of clientUsers) {
      const templateClient = mailTemplates.shiftApprovedClient({
        clientName: client.clientName,
        employeeName: employee.fullname,
        locationName: shiftSlot.LocationName,
        shiftDate: shiftSlot.Shiftdate,
        startTime: shiftSlot.Starttime,
        endTime: shiftSlot.Endtime
      });
      if (client.email) {
        sendMail({
          to: client.email,
          subject: templateClient.subject,
          html: templateClient.html
        }).catch(e => logger.error('Email send error (assign shift to client)', { error: e }));
      }
    }

    res.status(200).json({ message: 'Employee assigned and shift approved.', staffshiftid: staffShiftId, employeeid: employee.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign employee to shift.', error: err.message });
  }
};
// ================== end assignEmployeeToStaffShift ==================

// ================== removeEmployeeFromStaffShift ==================
// Remove an employee from a staff shift slot and notify them
exports.removeEmployeeFromStaffShift = async (req, res) => {
  const staffShiftId = req.params.id;
  const removerId = req.user?.id;
  const userType = req.user?.usertype;
  const now = new Date();

  // Only Staff, Client, or System Admin can remove
  if (
    userType !== 'Staff - Standard User' &&
    userType !== 'System Admin' &&
    userType !== 'Client - Standard User'
  ) {
    return res.status(403).json({ message: 'Access denied: Only staff, client, or admin can remove employees.' });
  }

  try {
    // 1. Get the shift slot and assigned employee
    const [rows] = await db.query(
      `SELECT css.id, css.Assignedtouserid, u.email, u.fullname, cl.LocationName, c.Name as clientname, csr.Shiftdate, csr.Starttime, csr.Endtime
       FROM Clientstaffshifts css
       LEFT JOIN Users u ON css.Assignedtouserid = u.id
       LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.id
       LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
       LEFT JOIN Clients c ON cl.clientid = c.id
       WHERE css.id = ? AND css.Deletedat IS NULL`,
      [staffShiftId]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Staff shift slot not found.' });
    }
    const slot = rows[0];
    if (!slot.Assignedtouserid) {
      return res.status(400).json({ message: 'No employee is currently assigned to this shift slot.' });
    }

    // 2. Remove the employee from the slot
    await db.query(
      `UPDATE Clientstaffshifts
       SET Assignedtouserid = NULL, Status = 'open', Approvedbyid = NULL, Approvedat = NULL, Updatedat = ?, Updatedbyid = ?
       WHERE id = ?`,
      [now, removerId, staffShiftId]
    );

    // 3. Notify the removed employee
    if (slot.email) {
      const templateEmp = mailTemplates.shiftRemovedEmployee({
        employeeName: slot.fullname,
        clientName: slot.clientname,
        locationName: slot.LocationName,
        shiftDate: slot.Shiftdate,
        startTime: slot.Starttime,
        endTime: slot.Endtime
      });
      sendMail({
        to: slot.email,
        subject: templateEmp.subject,
        html: templateEmp.html
      }).catch(e => logger.error('Email send error (remove shift from employee)', { error: e }));
    }

    res.status(200).json({ message: 'Employee removed from shift slot and notified.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove employee from shift slot.', error: err.message });
  }
};
// ================== end removeEmployeeFromStaffShift ==================
// ================== setStaffQualificationRegistrationDetails ==================
// Sets registration details for a staff qualification (for a specific employee/qualification)
exports.setStaffQualificationRegistrationDetails = async (req, res) => {
  const personId = parseInt(req.params.id, 10);
  const qualificationId = parseInt(req.params.qualificationId, 10);
  const requesterType = req.user?.usertype;
  const requesterId = req.user?.id;
  const {
    registrationnumber,
    dateofregistration,
    dateofexpiry
  } = req.body;

  // Only staff/admin or the user themselves can update
  if (
    requesterType !== 'Staff - Standard User' &&
    requesterType !== 'System Admin' &&
    requesterId !== personId
  ) {
    return res.status(403).json({ message: 'Access denied: Only staff/admin or the user themselves can set registration details.' });
  }

  if (!personId || !qualificationId) {
    return res.status(400).json({ message: 'Missing personId or qualificationId.' });
  }

  // All fields are now mandatory
  if (!registrationnumber || !dateofregistration || !dateofexpiry) {
    return res.status(400).json({ message: 'All fields (registrationnumber, dateofregistration, dateofexpiry) are required.' });
  }

  try {
    // Check if the staff qualification exists
    const [existing] = await db.query('SELECT * FROM Staffqualifications WHERE Userid = ? AND QualificationID = ? AND Deletedat IS NULL', [personId, qualificationId]);
    if (!existing.length) {
      return res.status(404).json({ message: 'Staff qualification not found for this user.' });
    }

    // Build dynamic update
    const fields = [];
    const values = [];
    if (registrationnumber !== undefined) {
      fields.push('Registrationnumber = ?');
      values.push(registrationnumber);
    }
    if (dateofregistration !== undefined) {
      fields.push('Dateofregistration = ?');
      values.push(dateofregistration);
    }
    if (dateofexpiry !== undefined) {
      fields.push('Dateofexpiry = ?');
      values.push(dateofexpiry);
    }
    fields.push('Updatedat = NOW()');
    fields.push('Updatedbyid = ?');
    values.push(requesterId);
    values.push(personId, qualificationId);

    const sql = `UPDATE Staffqualifications SET ${fields.join(', ')} WHERE Userid = ? AND QualificationID = ? AND Deletedat IS NULL`;
    await db.query(sql, values);

    // Return the updated row
    const [updated] = await db.query('SELECT * FROM Staffqualifications WHERE Userid = ? AND QualificationID = ?', [personId, qualificationId]);
    return res.status(200).json({ message: 'Staff qualification registration details set.', staffqualification: updated[0] });
  } catch (err) {
    logger.error('Set staff qualification registration details error', { error: err });
    return res.status(500).json({ message: 'Failed to set staff qualification registration details.', error: err.message });
  }
};
// ================== end setStaffQualificationRegistrationDetails ==================

exports.getStaffQualificationRegistrationDetails = async (req, res) => {
  const personId = parseInt(req.params.id, 10);
  const qualificationId = parseInt(req.params.qualificationId, 10);
  // Only staff/admin or the user themselves can view
  const requesterType = req.user?.usertype;
  const requesterId = req.user?.id;
  if (
    requesterType !== 'Staff - Standard User' &&
    requesterType !== 'System Admin' &&
    requesterId !== personId
  ) {
    return res.status(403).json({ message: 'Access denied: Only staff/admin or the user themselves can view registration details.' });
  }
  if (!personId || !qualificationId) {
    return res.status(400).json({ message: 'Missing personId or qualificationId.' });
  }
  try {
    const [rows] = await db.query(
      'SELECT Registrationnumber, Dateofregistration, Dateofexpiry FROM Staffqualifications WHERE Userid = ? AND QualificationID = ? AND Deletedat IS NULL',
      [personId, qualificationId]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Staff qualification not found for this user.' });
    }
    return res.status(200).json({
      registrationnumber: rows[0].Registrationnumber,
      dateofregistration: rows[0].Dateofregistration,
      dateofexpiry: rows[0].Dateofexpiry
    });
  } catch (err) {
    logger.error('Get staff qualification registration details error', { error: err });
    return res.status(500).json({ message: 'Failed to get staff qualification registration details.', error: err.message });
  }
};
// ================== end getStaffQualificationRegistrationDetails ==================