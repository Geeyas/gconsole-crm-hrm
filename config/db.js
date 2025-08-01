// config/db.js
// const mysql = require('mysql2');
// require('dotenv').config();

// const db = mysql.createConnection({
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME
// });

// db.connect(err => {
//   if (err) {
//     console.error('Database connection failed:', err);
//     process.exit(1);
//   }
//   console.log('Connected to the MySQL database');
// });

// module.exports = db;


const mysql = require('mysql2/promise'); // use promise-based version
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Test database connectivity
 * @returns {Promise<boolean>} - True if connection is successful
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

/**
 * Get database health status
 * @returns {Promise<Object>} - Database health information
 */
async function getHealthStatus() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    
    // Get some basic stats
    const [versionResult] = await connection.query('SELECT VERSION() as version');
    const [uptimeResult] = await connection.query('SHOW STATUS LIKE "Uptime"');
    
    connection.release();
    
    return {
      status: 'healthy',
      version: versionResult[0]?.version,
      uptime: uptimeResult[0]?.Value,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Test connection on startup
testConnection();

module.exports = {
  pool,
  testConnection,
  getHealthStatus
};
