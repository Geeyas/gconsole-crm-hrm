const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Malformed token' });

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    // Check if password was changed after token was issued
    try {
      const [rows] = await db.query('SELECT updatedat FROM Users WHERE id = ?', [decoded.id]);
      if (!rows.length) return res.status(401).json({ message: 'User not found' });
      const userUpdatedAt = new Date(rows[0].updatedat).getTime() / 1000; // seconds
      if (decoded.iat && userUpdatedAt > decoded.iat) {
        return res.status(401).json({ message: 'Token invalid due to password change. Please log in again.' });
      }
      req.user = decoded; // Adds the decoded user data to the request
      next();
    } catch (dbErr) {
      return res.status(500).json({ message: 'Auth DB error', error: dbErr });
    }
  });
};

const authorizeManager = (req, res, next) => {
  if (req.user?.usertype !== 'Staff - Standard User' && req.user?.usertype !== 'System Admin') {
    return res.status(403).json({ message: "Access denied: 'Staff - Standard User' only" });
  }
  next();
};

// Middleware to allow only client users to raise shift requests
const authorizeClient = (req, res, next) => {
  if (req.user?.usertype !== 'Client - Standard User' && req.user?.usertype !== 'System Admin') {
    return res.status(403).json({ message: "Access denied: Clients only" });
  }
  next();
};

// Middleware to allow only staff or system admin
const authorizeStaffOrAdmin = (req, res, next) => {
  if (req.user?.usertype !== 'Staff - Standard User' && req.user?.usertype !== 'System Admin') {
    return res.status(403).json({ message: 'Access denied: Only staff or admin allowed.' });
  }
  next();
};

module.exports = {
  authenticate,
  authorizeManager,
  authorizeClient,
  authorizeStaffOrAdmin
};

