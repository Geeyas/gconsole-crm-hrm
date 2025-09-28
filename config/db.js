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
const winston = require('winston');
require('dotenv').config();

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 100,      // Increased from 10 to 100 for load testing
  queueLimit: 0,            // No limit on queued connection requests
  // Remove invalid MySQL2 config options
  // acquireTimeout: 60000,  // Not supported in MySQL2
  // timeout: 60000,         // Not supported in MySQL2  
  // idleTimeout: 600000,    // Not supported in MySQL2
  // maxReconnects: 3,       // Not supported in MySQL2
  // reconnectDelay: 2000    // Not supported in MySQL2
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
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error: error.message });
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

/**
 * Get connection pool status for monitoring
 * @returns {Object} - Connection pool statistics
 */
function getPoolStatus() {
  try {
    return {
      connectionLimit: pool.config.connectionLimit || 100,
      acquiringConnections: pool._acquiringConnections?.length || 0,
      allConnections: pool._allConnections?.length || 0,
      freeConnections: pool._freeConnections?.length || 0,
      queuedRequests: pool._connectionQueue?.length || 0,
      host: pool.config.host || 'unknown',
      database: pool.config.database || 'unknown',
      user: pool.config.user || 'unknown'
    };
  } catch (error) {
    return {
      connectionLimit: 100,
      acquiringConnections: 'unknown',
      allConnections: 'unknown', 
      freeConnections: 'unknown',
      queuedRequests: 'unknown',
      host: 'unknown',
      database: 'unknown',
      user: 'unknown',
      error: error.message
    };
  }
}

// Test connection on startup
testConnection();

module.exports = {
  pool,
  testConnection,
  getHealthStatus,
  getPoolStatus
};
