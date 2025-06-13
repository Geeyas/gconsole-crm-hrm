// Helper to generate a JWT for test users
const jwt = require('jsonwebtoken');

function generateTestJWT(userOverrides = {}) {
  const defaultUser = {
    id: 1,
    username: 'testuser',
    email: 'testuser@example.com',
    usertype_id: 1,
    usertype: 'System Admin',
    portal_id: 1,
    portal: 'Test Portal'
  };
  const payload = { ...defaultUser, ...userOverrides };
  return jwt.sign(payload, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
}

module.exports = { generateTestJWT };
