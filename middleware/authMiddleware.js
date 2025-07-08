const jwt = require('jsonwebtoken');
const { pool: db } = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Malformed token' });

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ message: 'Invalid token. Please log in again.', code: 'TOKEN_INVALID' });
    }
    // Check if password was changed after token was issued
    try {
      const [rows] = await db.query('SELECT updatedat FROM Users WHERE id = ?', [decoded.id]);
      if (!rows.length) return res.status(401).json({ message: 'User not found. Please log in again.', code: 'USER_NOT_FOUND' });
      const userUpdatedAt = new Date(rows[0].updatedat).getTime() / 1000; // seconds
      if (decoded.iat && userUpdatedAt > decoded.iat) {
        return res.status(401).json({ message: 'Session invalid. Please log in again.', code: 'TOKEN_PASSWORD_CHANGED' });
      }
      req.user = decoded; // Adds the decoded user data to the request
      // Do not reject here for unknown usertype; let controller handle it
      next();
    } catch (dbErr) {
      return res.status(500).json({ message: 'Authentication error. Please try again later.', code: 'AUTH_DB_ERROR' });
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

// Only allow staff or admin
const authorizeStaffOrAdmin = (req, res, next) => {
  if (req.user && (req.user.usertype === 'Staff - Standard User' || req.user.usertype === 'System Admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Staff or admin only.' });
};

// Only allow admin
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.usertype === 'System Admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Admin only.' });
};

// Custom middleware to allow Client, Staff, or System Admin to raise shifts
function authorizeClientOrStaffOrAdmin(req, res, next) {
  const type = req.user?.usertype;
  if (
    type === 'Client - Standard User' ||
    type === 'Staff - Standard User' ||
    type === 'System Admin'
  ) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Only client, staff, or admin can raise shifts.' });
}

// For compatibility with routes expecting authenticateJWT
module.exports.authenticateJWT = module.exports.authenticate;

module.exports = {
  authenticate,
  authenticateJWT: authenticate, // alias for compatibility
  authorizeManager,
  authorizeClient,
  authorizeStaffOrAdmin,
  authorizeAdmin,
  authorizeClientOrStaffOrAdmin
};

