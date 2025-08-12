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
    // Insert link (fill all required columns including Sysstarttime)
    await db.query(
      'INSERT INTO Staffqualifications (Userid, QualificationID, Createdat, Createdbyid, Updatedat, Updatedbyid, Sysstarttime) VALUES (?, ?, NOW(), ?, NOW(), ?, NOW())',
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
      'INSERT INTO Userclients (userid, clientid, clientlocationid, Sysstarttime) VALUES (?, ?, ?, NOW())',
      [user.id, clientid, locationid]
    );
    res.status(201).json({ message: 'User linked to location successfully.' });
  } catch (err) {
    logger.error('Link client user to specific location by email error', { error: err });
    res.status(500).json({ message: 'Error linking client user to location', error: err });
  }
};
// ================== end linkClientUserToSpecificLocationByEmail ==================
const { pool: db } = require('../config/db');
const jwt = require('jsonwebtoken');
const { hashPassword, verifyPassword, migrateLegacyHash, generateSalt } = require('../utils/hashUtils');
const winston = require('winston');
const { sendMail } = require('../mailer/mailer');
const mailTemplates = require('../mailer/templates');
const { DateTime } = require('luxon');
const { 
  toUTC, 
  formatForMySQL, 
  utcToMelbourneForAPI, 
  formatDate, 
  formatDateTime,
  formatDateForEmail,
  formatDateTimeForEmail
} = require('../utils/timezoneUtils');

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
    // Try to verify password (supports both bcrypt and legacy SHA-256)
    const isValidPassword = await verifyPassword(password, user.passwordhash, user.salt);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // If password is valid and user has a salt (legacy SHA-256), migrate to bcrypt
    if (user.salt && user.salt.trim() !== '') {
      try {
        console.log(`Migrating password for user ${user.username} from SHA-256 to bcrypt...`);
        const newHash = await migrateLegacyHash(password, user.passwordhash, user.salt);
        
        // Update the user's password hash and remove the salt
        await db.query(
          'UPDATE Users SET passwordhash = ?, salt = NULL, updatedat = NOW(), updatedbyid = ? WHERE id = ?',
          [newHash, user.id, user.id]
        );
        
        console.log(`Password migration completed for user ${user.username}`);
      } catch (error) {
        console.error(`Password migration failed for user ${user.username}:`, error);
        // Don't fail the login, just log the error
      }
    }

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
      { expiresIn: '15m' } // Short-lived access token
    );

    // Refresh Token (long-lived)
    const refreshToken = jwt.sign(
      { 
        id: user.id,
        type: 'refresh',
        version: user.updatedat ? new Date(user.updatedat).getTime() : 0
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      refreshToken, // Also send in response for mobile apps
      usertype: user.usertype_name,
      portal: user.portal_name,
      expiresIn: 15 * 60 // 15 minutes in seconds
    });
  } catch (err) {
    logger.error('Login DB error', { error: err });
    res.status(500).json({ message: 'DB error', error: err.message, code: 'DB_ERROR' });
  }
};
// ================== end login ==================

// ================== refreshToken ==================
// Issues a new JWT token using a valid refresh token.
exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ 
      message: 'No refresh token found',
      code: 'NO_REFRESH_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(403).json({ 
        message: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Get user data to check if account is still valid
    const [userRows] = await db.query(
      `SELECT u.*, ut.Name AS usertype_name, p.Name AS portal_name
       FROM Users u
       LEFT JOIN Assignedusertypes au ON au.Userid = u.id
       LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
       LEFT JOIN Portals p ON ut.Portalid = p.ID
       WHERE u.id = ? AND u.deletedat IS NULL`,
      [decoded.id]
    );

    if (!userRows.length) {
      return res.status(401).json({ 
        message: 'User not found or account deleted',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userRows[0];

    // Check if user was updated after token was issued
    if (decoded.version && user.updatedat) {
      const userVersion = new Date(user.updatedat).getTime();
      if (userVersion > decoded.version) {
        return res.status(401).json({ 
          message: 'Token invalidated due to account changes',
          code: 'TOKEN_INVALIDATED'
        });
      }
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        usertype: user.usertype_name,
        portal: user.portal_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { 
        id: user.id,
        type: 'refresh',
        version: user.updatedat ? new Date(user.updatedat).getTime() : 0
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ 
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    return res.status(403).json({ 
      message: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};
// ================== end refreshToken ==================

// ================== logout ==================
// Logs out a user by clearing the refresh token cookie
exports.logout = (req, res) => {
  // Clear the refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.status(200).json({ 
    message: 'Logout successful',
    code: 'LOGOUT_SUCCESS'
  });
};
// ================== end logout ==================

// ================== register ==================
// Registers a new user and links them to a person and usertype.
exports.register = async (req, res) => {
  const { firstname, lastname, email, password, usertype_id } = req.body;
  const username = email;
  const creatorId = req.user?.id;

  if (!creatorId) {
    return res.status(401).json({ message: 'Unauthorized. Creator ID not found.' });
  }

  if (!firstname || !lastname || !email || !password || !usertype_id) {
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

    const hash = await hashPassword(password);
    const fullname = `${firstname} ${lastname}`;

    const now = new Date();
    const [peopleResult] = await db.query(
      `INSERT INTO People (Firstname, Lastname, Emailaddress, Hiredate, Createdat, Createdbyid, Updatedat, Updatedbyid, Sysstarttime)
       VALUES (?, ?, ?, NOW(), NOW(), ?, NOW(), ?, ?)`,
      [firstname, lastname, email, creatorId, creatorId, now]
    );

    const personId = peopleResult.insertId;

    const [userResult] = await db.query(
      `INSERT INTO Users (fullname, username, email, passwordhash, createdat, createdbyid, updatedat, updatedbyid, Sysstarttime)
       VALUES (?, ?, ?, ?, NOW(), ?, NOW(), ?, ?)`,
      [fullname, email, email, hash, creatorId, creatorId, now]
    );

    const userId = userResult.insertId;

    await db.query(
      'UPDATE People SET Linkeduserid = ? WHERE ID = ?',
      [userId, personId]
    );

    await db.query(
      `INSERT INTO Assignedusertypes (Userid, Usertypeid, Createdat, Createdbyid, Updatedat, Updatedbyid, Sysstarttime)
       VALUES (?, ?, NOW(), ?, NOW(), ?, ?)`,
      [userId, usertype_id, creatorId, creatorId, now]
    );

    res.status(201).json({ message: 'User registered successfully', userId });

  } catch (err) {
    logger.error('Register error', { error: err });
    res.status(500).json({ message: 'Failed to register user', error: err.message });
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

    const newHash = await hashPassword(newPassword);

    await db.query(
      'UPDATE Users SET passwordhash = ?, updatedat = NOW(), updatedbyid = ? WHERE username = ?',
      [newHash, updaterId, username]
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error('Password update error', { error: err });
    res.status(500).json({ message: 'Password update failed', error: err.message });
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

  // Map payload fields (accept both lowercase and capitalized)
  const updateFields = {
    Firstname: getField(req.body, 'Firstname'),
    Lastname: getField(req.body, 'Lastname'),
    Middlename: getField(req.body, 'Middlename'),
    Preferredname: getField(req.body, 'Preferredname'),
    Emailaddress: getField(req.body, 'Emailaddress'),
    Contact: getField(req.body, 'Contact'),
    Country: getField(req.body, 'Country'),
    State: getField(req.body, 'State'),
    Suburb: getField(req.body, 'Suburb'),
    Postcode: getField(req.body, 'Postcode'),
    HomeAddress: getField(req.body, 'HomeAddress'),
    Workaddress: getField(req.body, 'Workaddress'),
    Phonemobile: getField(req.body, 'Phonemobile'),
    Phonehome: getField(req.body, 'Phonehome'),
    Phonework: getField(req.body, 'Phonework'),
    Gender: getField(req.body, 'Gender'),
    Issubcontractor: getField(req.body, 'Issubcontractor'),
    Isaustraliantaxresident: getField(req.body, 'Isaustraliantaxresident'),
    Isworkingholidaymarker: getField(req.body, 'Isworkingholidaymarker'),
    Isterminated: getField(req.body, 'Isterminated'),
    Hasvehicle: getField(req.body, 'Hasvehicle'),
    Terminatedat: getField(req.body, 'Terminatedat'),
    TFN: getField(req.body, 'TFN'),
    ABN: getField(req.body, 'ABN'),
    BSB: getField(req.body, 'BSB'),
    Bankaccountnumber: getField(req.body, 'Bankaccountnumber'),
    SuperfundID: getField(req.body, 'SuperfundID'),
    AdditionalInformation: getField(req.body, 'AdditionalInformation')
  };

  // Validate required fields
  if (!updateFields.Firstname || !updateFields.Lastname) {
    return res.status(400).json({ message: 'Firstname and Lastname are required.' });
  }

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
        updateFields.Firstname, updateFields.Lastname, updateFields.Middlename, updateFields.Preferredname, updateFields.Emailaddress,
        updateFields.Contact, updateFields.Country, updateFields.State, updateFields.Suburb, updateFields.Postcode, updateFields.HomeAddress, updateFields.Workaddress,
        updateFields.Phonemobile, updateFields.Phonehome, updateFields.Phonework, updateFields.Gender,
        updateFields.Issubcontractor, updateFields.Isaustraliantaxresident, updateFields.Isworkingholidaymarker, updateFields.Isterminated, updateFields.Hasvehicle,
        updateFields.Terminatedat, updateFields.TFN, updateFields.ABN, updateFields.BSB, updateFields.Bankaccountnumber, updateFields.SuperfundID,
        updateFields.AdditionalInformation,
        updaterId, personId
      ]
    );

    // If linked user exists, update Users table as well
    if (linkedUserId) {
      const userEmail = updateFields.Emailaddress || getField(req.body, 'email');
      if (!userEmail) {
        return res.status(400).json({ message: 'Email is required for user profile.' });
      }
      const fullname = `${updateFields.Firstname} ${updateFields.Lastname}`;
      await db.query(
        `UPDATE Users SET fullname = ?, email = ?, username = ?, updatedat = NOW(), updatedbyid = ? WHERE id = ?`,
        [fullname, userEmail, userEmail, updaterId, linkedUserId]
      );
    }

    res.status(200).json({ message: 'User profile updated successfully' });
  } catch (err) {
    logger.error('Update error', {
      error: err,
      message: err && err.message,
      stack: err && err.stack,
      sql: err && err.sql,
      code: err && err.code,
      full: JSON.stringify(err)
    });
    // Provide a clear error message to the frontend
    let userMessage = 'Failed to update profile.';
    if (err && err.code === 'ER_BAD_NULL_ERROR') {
      userMessage = 'A required field is missing. Please check all required fields.';
    } else if (err && err.code === 'ER_DUP_ENTRY') {
      userMessage = 'A unique field value already exists. Please use a different value.';
    } else if (err && err.sqlMessage) {
      userMessage = err.sqlMessage;
    }
    res.status(500).json({
      message: userMessage,
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
//
// TIMEZONE POLICY:
// - All times (shiftdate, starttime, endtime) received from the frontend are interpreted as Australia/Melbourne time.
// - All times are converted to UTC before storing in the database.
// - All times sent to the frontend are converted from UTC to Australia/Melbourne time and formatted as strings.
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

  // --- Ensure all date/time fields are stored as UTC ---
  // All times received from frontend are in Melbourne time
  const shiftdateForDB = normalizeDate(shiftdate);
  const starttimeForDB = normalizeDateTime(starttime);
  const endtimeForDB = normalizeDateTime(endtime);

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

    // Check for duplicate shifts (same location, date, time, and qualification)
    const duplicateCheckSql = `
      SELECT csr.id, csr.Totalrequiredstaffnumber, cl.LocationName 
      FROM Clientshiftrequests csr
      LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.ID
      WHERE csr.Clientlocationid = ? 
        AND csr.Shiftdate = ? 
        AND csr.Starttime = ? 
        AND csr.Endtime = ? 
        AND csr.Qualificationgroupid = ? 
        AND csr.Deletedat IS NULL
    `;
    const [duplicateRows] = await dbConn.query(duplicateCheckSql, [
      clientlocationid, 
      shiftdateForDB, 
      starttimeForDB, 
      endtimeForDB, 
      qualificationgroupid
    ]);
    
    if (duplicateRows.length > 0) {
      const existingShift = duplicateRows[0];
      logger.info('Duplicate shift creation prevented', { 
        existingShiftId: existingShift.id, 
        locationId: clientlocationid,
        shiftDate: shiftdateForDB,
        startTime: starttimeForDB,
        endTime: endtimeForDB,
        qualificationGroupId: qualificationgroupid,
        userId: createdbyid,
        userType: userType
      });
      return res.status(409).json({ 
        message: `A shift already exists for the same location, date, time, and qualification. Please modify the existing shift instead of creating a new one.`,
        existingShift: {
          id: existingShift.id,
          locationName: existingShift.LocationName,
          currentStaffNumber: existingShift.Totalrequiredstaffnumber,
          suggestedAction: `Consider updating the staff count on shift ID ${existingShift.id} instead of creating a duplicate shift.`
        }
      });
    }

    // Insert into Clientshiftrequests (case sensitive columns)
    const insertShiftSql = `INSERT INTO Clientshiftrequests
      (Clientid, Clientlocationid, Shiftdate, Starttime, Endtime, Qualificationgroupid, Totalrequiredstaffnumber, Additionalvalue, Createdat, Createdbyid, Updatedat, Updatedbyid, Sysstarttime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const insertShiftParams = [clientid, clientlocationid, shiftdateForDB, starttimeForDB, endtimeForDB, qualificationgroupid, totalrequiredstaffnumber, additionalvalue, now, createdbyid, now, updatedbyid, now];
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
        updatedbyid,
        now // Sysstarttime
      ]);
    }
    if (staffShiftInserts.length) {
      try {
        // Build placeholders for bulk insert
        const placeholders = staffShiftInserts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = staffShiftInserts.flat();
        const staffShiftSql = `INSERT INTO Clientstaffshifts (Clientshiftrequestid, Clientid, ` +
          '`Order`, Status, Createdat, Createdbyid, Updatedat, Updatedbyid, Sysstarttime) VALUES ' + placeholders;
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
      logger.info('Shift data for email notification', { shift: shift, createdShiftLength: createdShift.length });
      const locationName = shift.LocationName || '';
      const clientName = shift.clientname || '';
      logger.info('Email notification data', { locationName, clientName, shiftDate: shift.Shiftdate });
      // Await all emails before responding
      await Promise.all(qualifiedEmployeeRows.map(async (emp) => {
        logger.info('Sending shift notification email', { to: emp.email });
        // Format dates for email - handle VARCHAR strings from database
        const formattedShiftDate = formatDateForEmail(shift.Shiftdate);
        const formattedStartTime = formatDateTimeForEmail(shift.Starttime);
        const formattedEndTime = formatDateTimeForEmail(shift.Endtime);
        
        logger.info('Email template data', { formattedShiftDate, formattedStartTime, formattedEndTime, qualificationNames: qualificationname });
        
        const template = mailTemplates.shiftNewEmployee({
          employeeName: emp.fullname,
          locationName,
          clientName,
          shiftDate: formattedShiftDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          qualificationNames: qualificationname
        });
        try {
          logger.info('Attempting to send email', { to: emp.email, subject: template.subject });
          await sendMail({
            to: emp.email,
            subject: template.subject,
            html: template.html
          });
          logger.info('Email sent successfully', { to: emp.email });
        } catch (e) {
          logger.error('Email send error (new shift to employee)', { error: e, email: emp.email });
        }
      }));
    }

    // Send notification to Admin and Staff users when Client creates a shift
    if (userType === 'Client - Standard User') {
      logger.info('📧 DEBUG: Client user created shift, sending admin/staff notifications');
      
      try {
        // Get all Admin and Staff users
        const [adminStaffUsers] = await db.query(`
          SELECT u.id, u.email, u.fullname, p.Firstname, p.Lastname, ut.Name as usertype_name
          FROM Users u
          LEFT JOIN People p ON u.id = p.Linkeduserid
          LEFT JOIN Assignedusertypes au ON au.Userid = u.id
          LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
          WHERE ut.Name IN ('System Admin', 'Staff - Standard User')
            AND u.email IS NOT NULL
            AND u.email != ''
            AND u.Deletedat IS NULL
        `);

        logger.info('📧 DEBUG: Found admin/staff users for notification', { count: adminStaffUsers.length });

        if (adminStaffUsers && adminStaffUsers.length > 0) {
          const shift = createdShift[0];
          const clientContactEmail = req.user.email || 'Not provided';
          
          // Send notification to each admin/staff user
          await Promise.all(adminStaffUsers.map(async (adminUser) => {
            logger.info('📧 DEBUG: Sending admin/staff notification', { to: adminUser.email, userType: adminUser.usertype_name });
            
            const formattedShiftDate = formatDateForEmail(shift.Shiftdate);
            const formattedStartTime = formatDateTimeForEmail(shift.Starttime);
            const formattedEndTime = formatDateTimeForEmail(shift.Endtime);
            
            const template = mailTemplates.shiftNewClientToAdminStaff({
              clientName: shift.clientname || '',
              clientContactEmail: clientContactEmail,
              locationName: shift.LocationName || '',
              shiftDate: formattedShiftDate,
              startTime: formattedStartTime,
              endTime: formattedEndTime,
              qualificationNames: qualificationname,
              totalRequiredStaff: shift.Totalrequiredstaffnumber || 1
            });

            try {
              logger.info('📧 DEBUG: Attempting to send admin/staff email', { to: adminUser.email, subject: template.subject });
              await sendMail({
                to: adminUser.email,
                subject: template.subject,
                html: template.html
              });
              logger.info('📧 DEBUG: Admin/staff email sent successfully', { to: adminUser.email });
            } catch (e) {
              logger.error('Email send error (new shift to admin/staff)', { error: e, email: adminUser.email });
            }
          }));
        }
      } catch (e) {
        logger.error('Error sending admin/staff notifications', { error: e });
      }
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
      // Fetch all active locations for this client
      const [locations] = await db.query('SELECT * FROM Clientlocations WHERE clientid = ? AND Deletedat IS NULL', [clientid]);
      return res.status(200).json({ message: 'User is already linked to this client.', client: { id: clientid, name: clientName }, locations });
    }
    await db.query(
      'INSERT INTO Userclients (userid, clientid) VALUES (?, ?)',
      [userid, clientid]
    );
    // Fetch all active locations for this client
    const [locations] = await db.query('SELECT * FROM Clientlocations WHERE clientid = ? AND Deletedat IS NULL', [clientid]);
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
      // Return ALL client locations, grouped by client, EXCLUDING soft-deleted AND inactive clients
      const [locations] = await db.query(
        `SELECT cl.*, c.Name as clientname
         FROM Clientlocations cl
         LEFT JOIN Clients c ON cl.clientid = c.id
         WHERE cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)`
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
      // Client - Standard User: only their directly linked client locations, EXCLUDING soft-deleted
      // Get all clientlocationids for this user from Userclients
      const [linkRows] = await db.query('SELECT Clientlocationid FROM Userclients WHERE userid = ? AND Clientlocationid IS NOT NULL', [userId]);
      if (!linkRows.length) {
        return res.status(200).json({ locations: [] });
      }
      const locationIds = linkRows.map(row => row.Clientlocationid);
      // Get only those locations, join with client info, EXCLUDING soft-deleted AND inactive clients
      const [locations] = await db.query(
        `SELECT cl.*, c.Name as clientname
         FROM Clientlocations cl
         LEFT JOIN Clients c ON cl.clientid = c.id
         WHERE cl.ID IN (${locationIds.map(() => '?').join(',')}) AND cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)`,
        locationIds
      );
      // Flat list of locations
      const result = locations.map(loc => ({
        id: loc.ID,
        clientid: loc.clientid,
        clientname: loc.clientname,
        locationname: loc.LocationName,
        locationaddress: loc.LocationAddress || '',
      }));
      return res.status(200).json({ locations: result });
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
      LEFT JOIN Clients c ON cl.clientid = c.id
      WHERE ut.Name = 'Client - Standard User' AND cl.id IS NOT NULL AND p.Emailaddress IS NOT NULL 
        AND cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
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
//
// TIMEZONE POLICY:
// - All times sent to the frontend are converted from UTC to Australia/Melbourne time and formatted as strings.
exports.getAvailableClientShifts = async (req, res) => {
  const userType = req.user?.usertype;
  const userId = req.user?.id;
  const responseFormat = req.query.format || 'full'; // 'full' or 'simple'
  // Pagination params
  let limit = parseInt(req.query.limit) || 10;
  let page = parseInt(req.query.page) || 1;
  if (limit > 50) limit = 50;
  if (limit < 1) limit = 10;
  if (page < 1) page = 1;
  const offset = (page - 1) * limit;

  // Date filter logic
  const dateParam = req.query.date;
  const allParam = req.query.all === 'true';
  let dateFilterSql, dateFilterParams;
  if ((userType === 'System Admin' || userType === 'Staff - Standard User') && allParam) {
    // Admin/staff requested all shifts, no date filter
    dateFilterSql = '1=1';
    dateFilterParams = [];
    // Get all non-deleted shifts from active clients only
    const [rows] = await db.query(
      `SELECT csr.id AS shiftrequestid, csr.Clientlocationid, cl.LocationName, cl.LocationAddress, cl.clientid, c.Name AS clientname,
             csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid, csr.Totalrequiredstaffnumber,
             u.fullname AS creatorName
      FROM Clientshiftrequests csr
      LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
      LEFT JOIN Clients c ON cl.clientid = c.id
      LEFT JOIN Users u ON csr.Createdbyid = u.id
      WHERE csr.deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
      ORDER BY csr.Shiftdate ASC, csr.Starttime ASC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    // For each shift request, get its staff shifts (all statuses)
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
      staffShifts = staffRows; // No filter on status
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
    // Convert UTC times to Melbourne time for API response
    const formatted = rows.map(row => ({
      ...row,
      Shiftdate: row.Shiftdate,
      Starttime: row.Starttime,
      Endtime: row.Endtime,
      qualificationname: qualMap[row.Qualificationgroupid] || [],
      StaffShifts: (staffShiftsByRequest[row.shiftrequestid] || [])
    }));
    // Get total count of all non-deleted shifts (always show complete count)
    const [countResult] = await db.query(
      `SELECT COUNT(DISTINCT csr.id) as total FROM Clientshiftrequests csr WHERE csr.deletedat IS NULL`
    );
    const total = countResult[0]?.total || 0;
    // Return response based on format
    if (responseFormat === 'simple') {
      return res.status(200).json(formatted);
    } else {
      return res.status(200).json({ availableShifts: formatted, pagination: { page, limit, total } });
    }
  } else if (dateParam) {
    // When a specific date is requested, we need to handle the date format properly
    // The database might store dates in different formats, so we use DATE() function
    dateFilterSql = 'DATE(csr.Shiftdate) = ?';
    dateFilterParams = [dateParam];
    // Get total count from active clients only
    const [countResult] = await db.query(
      `SELECT COUNT(DISTINCT csr.id) as total FROM Clientshiftrequests csr 
       LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
       LEFT JOIN Clients c ON cl.clientid = c.id
       WHERE csr.deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL) AND ${dateFilterSql}`,
      dateFilterParams
    );
    total = countResult[0]?.total || 0;
    // Admin/Staff: See all shifts for all hospitals/locations from active clients only
    [rows] = await db.query(
      `SELECT csr.id AS shiftrequestid, csr.Clientlocationid, cl.LocationName, cl.LocationAddress, cl.clientid, c.Name AS clientname,
             csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid, csr.Totalrequiredstaffnumber,
             u.fullname AS creatorName
      FROM Clientshiftrequests csr
      LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
      LEFT JOIN Clients c ON cl.clientid = c.id
      LEFT JOIN Users u ON csr.Createdbyid = u.id
      WHERE csr.deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL) AND ${dateFilterSql}
      ORDER BY csr.Shiftdate ASC, csr.Starttime ASC
      LIMIT ? OFFSET ?
    `, [...dateFilterParams, limit, offset]);
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
    // Return raw DB values for date/time fields (no conversion)
    const formatted = rows
      .filter(row => !row.Deletedat) // Defensive: filter out soft-deleted parent shifts
      .map(row => {
        return {
          ...row,
          Shiftdate: row.Shiftdate,
          Starttime: row.Starttime,
          Endtime: row.Endtime,
          qualificationname: qualMap[row.Qualificationgroupid] || [],
          StaffShifts: (staffShiftsByRequest[row.shiftrequestid] || [])
        };
      });
    
    // Debug log to see what's being returned
    console.log('DEBUG: getAvailableClientShifts (Admin/Staff) response structure:', {
      availableShiftsCount: formatted.length,
      sampleShift: formatted[0] || 'No shifts found',
      pagination: { page, limit, total }
    });
    
    // Return response based on format
    if (responseFormat === 'simple') {
      return res.status(200).json(formatted); // Just the array
    } else {
      return res.status(200).json({ availableShifts: formatted, pagination: { page, limit, total } });
    }
  } else {
    // Get today's date in Melbourne timezone to avoid timezone issues
    const today = DateTime.now().setZone('Australia/Melbourne').startOf('day');
    const todayStr = today.toFormat('yyyy-MM-dd');
    dateFilterSql = 'csr.Shiftdate >= ?';
    dateFilterParams = [todayStr];
    
    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(DISTINCT csr.id) as total FROM Clientshiftrequests csr WHERE csr.deletedat IS NULL AND ${dateFilterSql}`,
      dateFilterParams
    );
    total = countResult[0]?.total || 0;
    
    // Different logic based on user type
    if (userType === 'Employee - Standard User') {
      // Employee: Only show shifts they are qualified for with slot-based logic
      const userId = req.user?.id;
      
      // Get employee's qualifications
      const [employeeQuals] = await db.query(
        `SELECT sq.QualificationID 
         FROM Staffqualifications sq 
         WHERE sq.Userid = ? AND sq.Deletedat IS NULL`,
        [userId]
      );
      
      if (!employeeQuals.length) {
        // Employee has no qualifications, return empty result
        return res.status(200).json({ 
          availableShifts: [], 
          pagination: { page, limit, total: 0 } 
        });
      }
      
      const employeeQualIds = employeeQuals.map(q => q.QualificationID);
      
      // Get qualification groups that contain employee's qualifications
      const [qualGroupRows] = await db.query(
        `SELECT DISTINCT qgi.Qualificationgroupid 
         FROM Qualificationgroupitems qgi 
         WHERE qgi.Qualificationid IN (${employeeQualIds.map(() => '?').join(',')})`,
        employeeQualIds
      );
      
      if (!qualGroupRows.length) {
        // Employee's qualifications don't match any qualification groups, return empty
        return res.status(200).json({ 
          availableShifts: [], 
          pagination: { page, limit, total: 0 } 
        });
      }
      
      const qualGroupIds = qualGroupRows.map(q => q.Qualificationgroupid);
      
      // SLOT-BASED LOGIC: Get shifts with available slots and employee assignment status
      [rows] = await db.query(
        `SELECT DISTINCT csr.id AS shiftrequestid, csr.Clientlocationid, cl.LocationName, cl.LocationAddress, cl.clientid, c.Name AS clientname,
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid, csr.Totalrequiredstaffnumber,
               u.fullname AS creatorName,
               -- Check if employee has any slot for this shift
               (SELECT COUNT(*) FROM Clientstaffshifts css_check 
                WHERE css_check.Clientshiftrequestid = csr.id 
                AND css_check.Assignedtouserid = ? 
                AND css_check.Deletedat IS NULL) as employee_has_slot,
               -- Get employee's slot status if exists
               (SELECT css_status.Status FROM Clientstaffshifts css_status 
                WHERE css_status.Clientshiftrequestid = csr.id 
                AND css_status.Assignedtouserid = ? 
                AND css_status.Deletedat IS NULL 
                LIMIT 1) as employee_slot_status,
               -- Get employee's slot ID if exists (using uppercase ID)
               (SELECT css_id.ID FROM Clientstaffshifts css_id 
                WHERE css_id.Clientshiftrequestid = csr.id 
                AND css_id.Assignedtouserid = ? 
                AND css_id.Deletedat IS NULL 
                LIMIT 1) as employee_slot_id,
               -- Count available open slots (truly available - open and unassigned)
               (SELECT COUNT(*) FROM Clientstaffshifts css_open 
                WHERE css_open.Clientshiftrequestid = csr.id 
                AND css_open.Status = 'open' 
                AND css_open.Assignedtouserid IS NULL
                AND css_open.Deletedat IS NULL) as available_slots
        FROM Clientshiftrequests csr
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        LEFT JOIN Users u ON csr.Createdbyid = u.id
        WHERE csr.deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
        AND ${dateFilterSql} AND csr.Qualificationgroupid IN (${qualGroupIds.map(() => '?').join(',')})
        -- For Available Shifts: only show shifts where employee has NO slot AND there are available open slots
        AND (SELECT COUNT(*) FROM Clientstaffshifts css_check 
              WHERE css_check.Clientshiftrequestid = csr.id 
              AND css_check.Assignedtouserid = ? 
              AND css_check.Deletedat IS NULL) = 0
        AND (SELECT COUNT(*) FROM Clientstaffshifts css_open 
              WHERE css_open.Clientshiftrequestid = csr.id 
              AND css_open.Status = 'open' 
              AND css_open.Assignedtouserid IS NULL
              AND css_open.Deletedat IS NULL) > 0
        ORDER BY csr.Shiftdate ASC, csr.Starttime ASC
        LIMIT ? OFFSET ?
      `, [userId, userId, userId, ...dateFilterParams, ...qualGroupIds, userId, limit, offset]);
      
      // Get total count for qualified shifts with slot availability
      const [qualifiedCountResult] = await db.query(
        `SELECT COUNT(DISTINCT csr.id) as total 
         FROM Clientshiftrequests csr 
         LEFT JOIN Clients c ON csr.id IN (
           SELECT cs.Clientshiftrequestid FROM Clientstaffshifts cs 
           LEFT JOIN Clientshiftrequests csr2 ON cs.Clientshiftrequestid = csr2.id
           LEFT JOIN Clientlocations cl2 ON csr2.Clientlocationid = cl2.id
           WHERE cl2.clientid = c.id
         )
         WHERE csr.deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
         AND ${dateFilterSql} AND csr.Qualificationgroupid IN (${qualGroupIds.map(() => '?').join(',')})
         AND ((SELECT COUNT(*) FROM Clientstaffshifts css_check 
               WHERE css_check.Clientshiftrequestid = csr.id 
               AND css_check.Assignedtouserid = ? 
               AND css_check.Deletedat IS NULL) > 0
              OR 
              (SELECT COUNT(*) FROM Clientstaffshifts css_open 
               WHERE css_open.Clientshiftrequestid = csr.id 
               AND css_open.Status = 'open' 
               AND css_open.Deletedat IS NULL) > 0)`,
        [...dateFilterParams, ...qualGroupIds, userId]
      );
      total = qualifiedCountResult[0]?.total || 0;
      
    } else {
      // Admin/Staff: See all shifts for all hospitals/locations
      [rows] = await db.query(
        `SELECT csr.id AS shiftrequestid, csr.Clientlocationid, cl.LocationName, cl.LocationAddress, cl.clientid, c.Name AS clientname,
               csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid, csr.Totalrequiredstaffnumber,
               u.fullname AS creatorName
        FROM Clientshiftrequests csr
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.id
        LEFT JOIN Clients c ON cl.clientid = c.id
        LEFT JOIN Users u ON csr.Createdbyid = u.id
        WHERE csr.deletedat IS NULL AND ${dateFilterSql}
        ORDER BY csr.Shiftdate ASC, csr.Starttime ASC
        LIMIT ? OFFSET ?
      `, [...dateFilterParams, limit, offset]);
    }
    
    // For each shift request, get its staff shifts and their statuses
    const shiftIds = rows.map(row => row.shiftrequestid);
    let staffShifts = [];
    if (shiftIds.length) {
      if (userType === 'Employee - Standard User') {
        // For employees, get all slots including open ones to ensure we have slot IDs
        const [staffRows] = await db.query(
          `SELECT css.*, u.fullname AS employee_name, u.email AS employee_email
           FROM Clientstaffshifts css
           LEFT JOIN Users u ON css.Assignedtouserid = u.id
           WHERE css.Clientshiftrequestid IN (${shiftIds.map(() => '?').join(',')})
           AND css.Deletedat IS NULL`,
          shiftIds
        );
        staffShifts = staffRows;
      } else {
        // For admin/staff, get all slots as before
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
    
    // Show all shifts (no date filter)
    const filteredRows = rows.filter(row => !row.Deletedat);
    
    // Format response based on user type
    const formatted = filteredRows.map(row => {
      const baseShift = {
        ...row,
        Shiftdate: row.Shiftdate,
        Starttime: row.Starttime,
        Endtime: row.Endtime,
        qualificationname: qualMap[row.Qualificationgroupid] || []
      };

      if (userType === 'Employee - Standard User') {
        // EMPLOYEE SLOT-BASED LOGIC for Available Shifts only
        console.log('DEBUG: Processing employee shift:', {
          shiftrequestid: row.shiftrequestid,
          employee_has_slot: row.employee_has_slot,
          available_slots: row.available_slots,
          userType: userType
        });
        
        // Since we filtered out shifts where employee has a slot, 
        // we only need to handle the case where employee doesn't have a slot but there are available slots
        if (row.available_slots > 0) {
          // Employee doesn't have a slot but there are available slots - show one available slot
          const shiftSlots = staffShiftsByRequest[row.shiftrequestid] || [];
          const availableSlots = shiftSlots.filter(s => s.Status === 'open' && !s.Assignedtouserid);
          const firstAvailableSlot = availableSlots[0];
          
          // Debug logging to see what's happening
          console.log('DEBUG SLOT ID ISSUE:', {
            shiftrequestid: row.shiftrequestid,
            shiftSlots: shiftSlots.length,
            availableSlots: availableSlots.length,
            firstAvailableSlot: firstAvailableSlot ? {
              ID: firstAvailableSlot.ID,
              Status: firstAvailableSlot.Status,
              Assignedtouserid: firstAvailableSlot.Assignedtouserid
            } : null,
            slotId: firstAvailableSlot?.ID || null,
            allSlots: shiftSlots.map(s => ({
              ID: s.ID,
              Status: s.Status,
              Assignedtouserid: s.Assignedtouserid
            }))
          });
          
          return {
            ...baseShift,
            slotStatus: 'available',
            slotId: firstAvailableSlot?.ID || null, // Use uppercase ID
            availableSlots: 1, // Always show only 1 slot to employee
            hasUserSlot: false,
            canAccept: !!firstAvailableSlot, // Only allow accept if we have a valid slot
            StaffShifts: firstAvailableSlot ? [{
              ID: firstAvailableSlot.ID, // Use uppercase ID to match database
              Status: 'open',
              Assignedtouserid: null,
              employee_name: null
            }] : []
          };
        }
        
        // Fallback - no slots available or assigned
        return {
          ...baseShift,
          slotStatus: 'unavailable',
          slotId: null,
          availableSlots: 0,
          hasUserSlot: false,
          canAccept: false,
          StaffShifts: []
        };
      } else {
        // ADMIN/STAFF - Show all slots as before
        return {
          ...baseShift,
          StaffShifts: (staffShiftsByRequest[row.shiftrequestid] || [])
        };
      }
    });
    
    // Return response based on format
    if (responseFormat === 'simple') {
      return res.status(200).json(formatted); // Just the array
    } else {
      return res.status(200).json({ availableShifts: formatted, pagination: { page, limit, total } });
    }
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
      SELECT css.*, cl.LocationName, cl.LocationAddress, c.Name as clientname, u.fullname as employeeName, 
             csr.Shiftdate, csr.Starttime, csr.Endtime
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
        // Format dates for email - handle VARCHAR strings from database
        const formattedShiftDate = formatDateForEmail(updatedShift.Shiftdate);
        const formattedStartTime = formatDateTimeForEmail(updatedShift.Starttime);
        const formattedEndTime = formatDateTimeForEmail(updatedShift.Endtime);
        
        // Log email template data for debugging
        logger.info('Shift acceptance email data', {
          clientName: client.clientName,
          locationName: updatedShift.LocationName,
          shiftDate: formattedShiftDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          employeeName: updatedShift.employeeName,
          rawShiftDate: updatedShift.Shiftdate,
          rawStartTime: updatedShift.Starttime,
          rawEndTime: updatedShift.Endtime
        });
        
        const template = mailTemplates.shiftAcceptedClient({
          clientName: client.clientName,
          locationName: updatedShift.LocationName,
          shiftDate: formattedShiftDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
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
        // Format dates for email - handle VARCHAR strings from database
        const formattedShiftDate = formatDateForEmail(updatedShift.Shiftdate);
        const formattedStartTime = formatDateTimeForEmail(updatedShift.Starttime);
        const formattedEndTime = formatDateTimeForEmail(updatedShift.Endtime);
        
        const templateEmp = mailTemplates.shiftApprovedEmployee({
          employeeName: updatedShift.employeeName,
          clientName: updatedShift.clientname,
          locationName: updatedShift.LocationName,
          shiftDate: formattedShiftDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime
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
        // Format dates for email - handle VARCHAR strings from database
        const formattedShiftDate = formatDateForEmail(updatedShift.Shiftdate);
        const formattedStartTime = formatDateTimeForEmail(updatedShift.Starttime);
        const formattedEndTime = formatDateTimeForEmail(updatedShift.Endtime);
        
        const templateClient = mailTemplates.shiftApprovedClient({
          clientName: client.clientName,
          employeeName: updatedShift.employeeName,
          locationName: updatedShift.LocationName,
          shiftDate: formattedShiftDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime
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
      // Format dates for email - handle VARCHAR strings from database
      const formattedShiftDate = formatDateForEmail(updatedShiftRows[0]?.Shiftdate);
      const formattedStartTime = formatDateTimeForEmail(updatedShiftRows[0]?.Starttime);
      const formattedEndTime = formatDateTimeForEmail(updatedShiftRows[0]?.Endtime);
      
      const templateEmp = mailTemplates.shiftRejectedEmployee({
        employeeName: prevEmployee.employeeName,
        clientName: updatedShiftRows[0]?.clientname,
        locationName: updatedShiftRows[0]?.LocationName,
        shiftDate: formattedShiftDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime
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
    // Get all active clients (exclude inactive and soft-deleted)
    const [clients] = await db.query('SELECT * FROM Clients WHERE Deletedat IS NULL AND (IsInactive = 0 OR IsInactive IS NULL)');
    // Get all locations for active clients only
    const [locations] = await db.query(`
      SELECT cl.* FROM Clientlocations cl
      LEFT JOIN Clients c ON cl.clientid = c.id
      WHERE cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)
    `);
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
    // Get all clientlocationids for this user from Userclients
    const [linkRows] = await db.query('SELECT Clientlocationid FROM Userclients WHERE userid = ? AND Clientlocationid IS NOT NULL', [user.id]);
    if (!linkRows.length) {
      return res.status(200).json({ locations: [] });
    }
    const locationIds = linkRows.map(row => row.Clientlocationid);
    // Get only those locations from active clients
    const [locations] = await db.query(
      `SELECT cl.*, c.Name as clientname
       FROM Clientlocations cl
       LEFT JOIN Clients c ON cl.clientid = c.id
       WHERE cl.ID IN (${locationIds.map(() => '?').join(',')}) AND cl.Deletedat IS NULL AND c.Deletedat IS NULL AND (c.IsInactive = 0 OR c.IsInactive IS NULL)`,
      locationIds
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
// Updates a client shift request.
//
// TIMEZONE POLICY:
// - All times (shiftdate, starttime, endtime) received from the frontend are interpreted as Australia/Melbourne time.
// - All times are converted to UTC before storing in the database.
// - All times sent to the frontend are converted from UTC to Australia/Melbourne time and formatted as strings.
exports.updateClientShiftRequest = async (req, res) => {
  const dbConn = db;
  const shiftId = Number(req.params.id);
  if (isNaN(shiftId)) {
    return res.status(400).json({ message: 'Invalid shift ID.' });
  }
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
    const updates = [];
    const params = [];
    const updateBody = { ...req.body };

    if (updateBody.shiftdate !== undefined) {
      updates.push('Shiftdate = ?');
      params.push(normalizeDate(updateBody.shiftdate));
    }
    if (updateBody.starttime !== undefined) {
      updates.push('Starttime = ?');
      params.push(normalizeDateTime(updateBody.starttime));
    }
    if (updateBody.endtime !== undefined) {
      updates.push('Endtime = ?');
      params.push(normalizeDateTime(updateBody.endtime));
    }
    if (updateBody.qualificationgroupid !== undefined) {
      updates.push('Qualificationgroupid = ?');
      params.push(updateBody.qualificationgroupid);
    }
    if (updateBody.totalrequiredstaffnumber !== undefined) {
      updates.push('Totalrequiredstaffnumber = ?');
      params.push(Number(updateBody.totalrequiredstaffnumber));
    }
    if (updateBody.additionalvalue !== undefined) {
      updates.push('Additionalvalue = ?');
      params.push(updateBody.additionalvalue);
    }
    // Always update audit fields
    updates.push('Updatedat = ?');
    params.push(now);
    updates.push('Updatedbyid = ?');
    params.push(userId);

    // Check for duplicate shifts if relevant fields are being updated
    const isDuplicationFieldUpdated = updateBody.shiftdate !== undefined || 
                                     updateBody.starttime !== undefined || 
                                     updateBody.endtime !== undefined || 
                                     updateBody.qualificationgroupid !== undefined;
    
    if (isDuplicationFieldUpdated) {
      // Prepare values for duplicate check (use new values if provided, otherwise existing values)
      const checkClientLocationId = shift.Clientlocationid; // Location cannot be changed in update
      const checkShiftDate = updateBody.shiftdate !== undefined ? normalizeDate(updateBody.shiftdate) : shift.Shiftdate;
      const checkStartTime = updateBody.starttime !== undefined ? normalizeDateTime(updateBody.starttime) : shift.Starttime;
      const checkEndTime = updateBody.endtime !== undefined ? normalizeDateTime(updateBody.endtime) : shift.Endtime;
      const checkQualificationGroupId = updateBody.qualificationgroupid !== undefined ? updateBody.qualificationgroupid : shift.Qualificationgroupid;

      const duplicateCheckSql = `
        SELECT csr.id, csr.Totalrequiredstaffnumber, cl.LocationName 
        FROM Clientshiftrequests csr
        LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.ID
        WHERE csr.Clientlocationid = ? 
          AND csr.Shiftdate = ? 
          AND csr.Starttime = ? 
          AND csr.Endtime = ? 
          AND csr.Qualificationgroupid = ? 
          AND csr.Deletedat IS NULL
          AND csr.id != ?
      `;
      const [duplicateRows] = await dbConn.query(duplicateCheckSql, [
        checkClientLocationId, 
        checkShiftDate, 
        checkStartTime, 
        checkEndTime, 
        checkQualificationGroupId,
        shiftId
      ]);
      
      if (duplicateRows.length > 0) {
        const existingShift = duplicateRows[0];
        logger.info('Duplicate shift update prevented', { 
          existingShiftId: existingShift.id,
          currentShiftId: shiftId,
          locationId: checkClientLocationId,
          shiftDate: checkShiftDate,
          startTime: checkStartTime,
          endTime: checkEndTime,
          qualificationGroupId: checkQualificationGroupId,
          userId: userId,
          userType: userType
        });
        return res.status(409).json({ 
          message: `This update would create a duplicate shift. A shift already exists for the same location, date, time, and qualification. Please modify the existing shift instead.`,
          existingShift: {
            id: existingShift.id,
            locationName: existingShift.LocationName,
            currentStaffNumber: existingShift.Totalrequiredstaffnumber,
            suggestedAction: `Consider updating the staff count on shift ID ${existingShift.id} instead of creating a duplicate shift.`
          }
        });
      }
    }

    // Add the shiftId for the WHERE clause
    params.push(shiftId);
    if (!updates.length) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }
    const updateSql = `UPDATE Clientshiftrequests SET ${updates.join(', ')} WHERE id = ?`;
    logger.info('UpdateClientShiftRequest - SQL and params', { updateSql, params });
    const updateResult = await dbConn.query(updateSql, params);
    logger.info('UpdateClientShiftRequest - updateResult', { affectedRows: updateResult[0]?.affectedRows, updateResult });
    // Fetch the shift again to confirm update
    const [updatedRows] = await dbConn.query('SELECT * FROM Clientshiftrequests WHERE id = ?', [shiftId]);
    logger.info('UpdateClientShiftRequest - DB value after update', { Totalrequiredstaffnumber: updatedRows[0]?.Totalrequiredstaffnumber, updatedRow: updatedRows[0] });
    // ================== STAFF SHIFT SLOT ADJUSTMENT ==================
    if (updateBody.totalrequiredstaffnumber !== undefined && updateBody.totalrequiredstaffnumber !== shift.Totalrequiredstaffnumber) {
      logger.info('UpdateClientShiftRequest - slot adjustment start', { oldTotalRequired: shift.Totalrequiredstaffnumber, newTotalRequired: updateBody.totalrequiredstaffnumber });
      // Restore soft-deleted slots first
      const [softDeletedSlots] = await dbConn.query('SELECT * FROM Clientstaffshifts WHERE Clientshiftrequestid = ? AND Deletedat IS NOT NULL ORDER BY `Order`', [shiftId]);
      let restored = 0;
      for (let i = 0; i < softDeletedSlots.length && restored < (updateBody.totalrequiredstaffnumber - shift.Totalrequiredstaffnumber); i++) {
        const slot = softDeletedSlots[i];
        await dbConn.query('UPDATE Clientstaffshifts SET Deletedat = NULL, Deletedbyid = NULL, Updatedat = ?, Updatedbyid = ? WHERE id = ?', [now, userId, slot.ID]);
        restored++;
      }
      // Re-fetch the count of active slots after restoration
      const [activeSlots] = await dbConn.query('SELECT * FROM Clientstaffshifts WHERE Clientshiftrequestid = ? AND Deletedat IS NULL ORDER BY `Order`', [shiftId]);
      const currentActiveCount = activeSlots.length;
      if (updateBody.totalrequiredstaffnumber > currentActiveCount) {
        // Find the max `Order` value among all slots (including soft-deleted)
        const [allSlots] = await dbConn.query('SELECT MAX(`Order`) as maxOrder FROM Clientstaffshifts WHERE Clientshiftrequestid = ?', [shiftId]);
        let maxOrder = allSlots[0]?.maxOrder || 0;
        const slotsToCreate = updateBody.totalrequiredstaffnumber - currentActiveCount;
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
            userId,
            now // Sysstarttime
          ]);
        }
        if (staffShiftInserts.length) {
          const placeholders = staffShiftInserts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const flatValues = staffShiftInserts.flat();
          const staffShiftSql = `INSERT INTO Clientstaffshifts (Clientshiftrequestid, Clientid, ` +
            '`Order`, Status, Createdat, Createdbyid, Updatedat, Updatedbyid, Sysstarttime) VALUES ' + placeholders;
          await dbConn.query(staffShiftSql, flatValues);
        }
      } else if (updateBody.totalrequiredstaffnumber < currentActiveCount) {
        // Remove (soft-delete) unassigned slots, starting from the highest order
        let toRemove = currentActiveCount - updateBody.totalrequiredstaffnumber;
        for (let i = activeSlots.length - 1; i >= 0 && toRemove > 0; i--) {
          const slot = activeSlots[i];
          if (!slot.Assignedtouserid && slot.Status === 'open' && !slot.Deletedat) {
            await dbConn.query('UPDATE Clientstaffshifts SET Deletedat = ?, Deletedbyid = ? WHERE id = ?', [now, userId, slot.ID]);
            toRemove--;
          }
        }
      }
      logger.info('UpdateClientShiftRequest - slot adjustment end', { oldTotalRequired: shift.Totalrequiredstaffnumber, newTotalRequired: updateBody.totalrequiredstaffnumber });
    }
    // ================== END STAFF SHIFT SLOT ADJUSTMENT ==================
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
        // Format dates for email - handle VARCHAR strings from database
        const formattedShiftDate = formatDateForEmail(updatedRows[0].Shiftdate);
        const formattedStartTime = formatDateTimeForEmail(updatedRows[0].Starttime);
        const formattedEndTime = formatDateTimeForEmail(updatedRows[0].Endtime);
        
        const templateEmp = mailTemplates.shiftUpdatedEmployee({
          employeeName: slot.fullname,
          clientName: slot.clientname,
          locationName: slot.LocationName,
          shiftDate: formattedShiftDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime
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
// Returns all shifts assigned to the logged-in user (employee)
//
// TIMEZONE POLICY:
// - All times sent to the frontend are converted from UTC to Australia/Melbourne time and formatted as strings.
exports.getMyShifts = async (req, res) => {
  const userId = req.user?.id;
  const userType = req.user?.usertype;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
  }
  try {
    // Only employees, staff, or admin can view their shifts
    if (
      userType !== 'Employee - Standard User' &&
      userType !== 'Staff - Standard User' &&
      userType !== 'System Admin'
    ) {
      return res.status(403).json({ message: 'Access denied: Only employees, staff, or admin can view their shifts.' });
    }

    // Get all client staff shifts assigned to this user, not soft-deleted
    const [shifts] = await db.query(
      `SELECT css.*, csr.Shiftdate, csr.Starttime, csr.Endtime, cl.LocationName, cl.LocationAddress, c.Name AS clientname, 
              qg.Name AS qualificationgroupname
       FROM Clientstaffshifts css
       LEFT JOIN Clientshiftrequests csr ON css.Clientshiftrequestid = csr.ID
       LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.ID
       LEFT JOIN Clients c ON cl.clientid = c.ID
       LEFT JOIN Qualificationgroups qg ON csr.Qualificationgroupid = qg.ID
       WHERE css.Assignedtouserid = ? AND css.Deletedat IS NULL
       ORDER BY csr.Shiftdate ASC, csr.Starttime ASC`,
      [userId]
    );

    // Convert UTC times to Melbourne time for frontend
    const formatted = shifts.map(s => {
      // Handle MySQL datetime values that may be Date objects or strings
      let safeStart = null;
      let safeEnd = null;
      
      return {
        ...s,
        Shiftdate: s.Shiftdate,
        Starttime: s.Starttime,
        Endtime: s.Endtime
      };
    });
    return res.status(200).json({ myShifts: formatted });
  } catch (err) {
    logger.error('Get my shifts error', { error: err });
    return res.status(500).json({ message: 'Failed to fetch shifts.', error: err.message });
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
      // Format dates for email - handle VARCHAR strings from database
      const formattedShiftDate = formatDateForEmail(shiftSlot.Shiftdate);
      const formattedStartTime = formatDateTimeForEmail(shiftSlot.Starttime);
      const formattedEndTime = formatDateTimeForEmail(shiftSlot.Endtime);
      
      const templateEmp = mailTemplates.shiftApprovedEmployee({
        employeeName: employee.fullname,
        clientName: shiftSlot.clientname,
        locationName: shiftSlot.LocationName,
        shiftDate: formattedShiftDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime
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
      // Format dates for email - handle VARCHAR strings from database
      const formattedShiftDate = formatDateForEmail(shiftSlot.Shiftdate);
      const formattedStartTime = formatDateTimeForEmail(shiftSlot.Starttime);
      const formattedEndTime = formatDateTimeForEmail(shiftSlot.Endtime);
      
      const templateClient = mailTemplates.shiftApprovedClient({
        clientName: client.clientName,
        employeeName: employee.fullname,
        locationName: shiftSlot.LocationName,
        shiftDate: formattedShiftDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime
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
      // Format dates for email - handle VARCHAR strings from database
      const formattedShiftDate = formatDateForEmail(slot.Shiftdate);
      const formattedStartTime = formatDateTimeForEmail(slot.Starttime);
      const formattedEndTime = formatDateTimeForEmail(slot.Endtime);
      
      const templateEmp = mailTemplates.shiftRemovedEmployee({
        employeeName: slot.fullname,
        clientName: slot.clientname,
        locationName: slot.LocationName,
        shiftDate: formattedShiftDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime
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

// Helper to get value from either capitalized or lowercase key
function getField(obj, key) {
  return obj[key] !== undefined ? obj[key] : obj[key.toLowerCase()];
}

// Add normalization helpers at the top of the file (after imports):
function normalizeDate(val) {
  if (!val) return val;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val)) return val;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val + ' 00:00:00';
  return val;
}
function normalizeDateTime(val) {
  if (!val) return val;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val)) return val;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(val)) return val + ':00';
  return val;
}

// ================== getMyQualifications ==================
// Returns all qualifications assigned to the logged-in employee (from JWT token)
exports.getMyQualifications = async (req, res) => {
  const userId = req.user?.id;
  const userType = req.user?.usertype;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID in token.' });
  }

  // Only Employee - Standard User can use this endpoint
  if (userType !== 'Employee - Standard User') {
    return res.status(403).json({ message: 'Access denied: Only employees can use this endpoint.' });
  }

  try {
    // Find the People record linked to this user
    const [peopleRows] = await db.query('SELECT * FROM People WHERE Linkeduserid = ? AND Deletedat IS NULL', [userId]);
    if (!peopleRows.length) {
      return res.status(404).json({ message: 'No People record found for this user.' });
    }

    // Get all qualifications for this user, excluding soft deleted
    const [qualRows] = await db.query(
      `SELECT q.ID, q.Name, sq.Createdat, sq.Updatedat, sq.Registrationnumber, sq.Dateofregistration, sq.Dateofexpiry
       FROM Staffqualifications sq
       JOIN Qualifications q ON sq.QualificationID = q.ID
       WHERE sq.Userid = ? AND sq.Deletedat IS NULL
       ORDER BY q.Name ASC`,
      [userId]
    );

    return res.status(200).json({ 
      message: 'Qualifications retrieved successfully',
      qualifications: qualRows 
    });
  } catch (err) {
    logger.error('Get my qualifications error', { error: err });
    return res.status(500).json({ message: 'Failed to fetch qualifications.', error: err.message });
  }
};
// ================== end getMyQualifications ==================