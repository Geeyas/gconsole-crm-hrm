// controllers/authController.js
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { hashPassword, generateSalt } = require('../utils/hashUtils');

const jwtSecret = process.env.JWT_SECRET;


exports.login = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required' });

  const query = `
    SELECT u.*, ut.Name AS usertype_name, p.Name AS portal_name
    FROM Users u
    LEFT JOIN Usertypes ut ON u.usertypeid = ut.ID
    LEFT JOIN Portals p ON ut.PortalID = p.ID
    WHERE u.username = ?
  `;

  db.query(query, [username], (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });
    if (results.length === 0) return res.status(401).json({ message: 'Invalid username or password' });

    const user = results[0];
    const hashedInput = hashPassword(password, user.salt);
    if (hashedInput !== user.passwordhash)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        usertype: user.usertype_name,
        portal: user.portal_name
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      usertype: user.usertype_name,
      portal: user.portal_name
    });
  });
};




exports.register = (req, res) => {
  const { firstname, lastname, username, email, password, usertype_id } = req.body;

  // Validate input
  if (!firstname || !lastname || !username || !email || !password || !usertype_id)
    return res.status(400).json({ message: 'All fields are required' });

  // Check for duplicate email
  db.query('SELECT COUNT(*) AS count FROM Users WHERE email = ?', [email], (err, result) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });
    if (result[0].count > 0)
      return res.status(400).json({ message: 'Email already in use' });

    const salt = generateSalt();
    const hash = hashPassword(password, salt);

    // Step 1: Lookup the portal_id using the usertype_id
    db.query('SELECT PortalID FROM Usertypes WHERE ID = ?', [usertype_id], (err, portalResult) => {
      if (err || portalResult.length === 0)
        return res.status(400).json({ message: 'Invalid usertype_id or no portal associated', error: err });

      const portal_id = portalResult[0].PortalID;

      // Step 2: Insert into People
      db.query(
        'INSERT INTO People (Firstname, Lastname, Emailaddress, Createdat) VALUES (?, ?, ?, NOW())',
        [firstname, lastname, email],
        (err, peopleResult) => {
          if (err) return res.status(500).json({ message: 'Error saving person', error: err });

          const personId = peopleResult.insertId;
          const fullname = `${firstname} ${lastname}`;

          // Step 3: Insert into Users
          const insertUser = `
            INSERT INTO Users (fullname, username, email, passwordhash, salt, createdat, usertypeid, portalid, linkeduserid)
            VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?)
          `;
          db.query(
            insertUser,
            [fullname, username, email, hash, salt, usertype_id, portal_id, personId],
            (err, userResult) => {
              if (err)
                return res.status(500).json({ message: 'Error creating user', error: err });

              res.status(201).json({ message: 'User registered successfully', userId: userResult.insertId });
            }
          );
        }
      );
    });
  });
};



exports.updatePassword = (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  if (!username || !oldPassword || !newPassword) return res.status(400).json({ message: 'Missing fields' });

  db.query('SELECT * FROM Users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = results[0];
    const oldHash = hashPassword(oldPassword, user.salt);
    if (oldHash !== user.passwordhash) return res.status(401).json({ message: 'Old password is incorrect' });

    const newSalt = generateSalt();
    const newHash = hashPassword(newPassword, newSalt);

    const update = `UPDATE Users SET passwordhash = ?, salt = ?, updatedat = NOW(), updatedbyid = 1 WHERE username = ?`;
    db.query(update, [newHash, newSalt, username], err => {
      if (err) return res.status(500).json({ message: 'Password update failed', error: err });
      res.status(200).json({ message: 'Password updated successfully' });
    });
  });
};
