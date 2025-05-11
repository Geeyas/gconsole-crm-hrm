// controllers/authController.js
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { hashPassword, generateSalt } = require('../utils/hashUtils');

const jwtSecret = process.env.JWT_SECRET;

exports.login = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });

  db.query('SELECT * FROM Users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });
    if (results.length === 0) return res.status(401).json({ message: 'Invalid username or password' });

    const user = results[0];
    const hashedInput = hashPassword(password, user.salt);
    if (hashedInput !== user.passwordhash) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, jwtSecret, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful', token });
  });
};

exports.register = (req, res) => {
  const { fullname, username, email, password } = req.body;
  if (!fullname || !username || !email || !password) return res.status(400).json({ message: 'All fields required' });

  db.query('SELECT COUNT(*) AS count FROM Users WHERE email = ?', [email], (err, result) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });
    if (result[0].count > 0) return res.status(400).json({ message: 'Email already in use' });

    const salt = generateSalt();
    const hash = hashPassword(password, salt);

    const insert = `
      INSERT INTO Users (fullname, username, email, passwordhash, salt, createdat)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    db.query(insert, [fullname, username, email, hash, salt], (err, result) => {
      if (err) return res.status(500).json({ message: 'Error creating user', error: err });
      res.status(201).json({ message: 'User registered', userId: result.insertId });
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
