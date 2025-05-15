// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const apiDocs = require('./docs/apiDocs');

// Routes
const authRoutes = require('./routes/authRoutes');
const crudRoutes = require('./routes/crudRoutes');


// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Docs Endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'API Endpoint Documentation',
    endpoints: apiDocs
  });
});


// 👉 /api/table - list all tables
app.get('/api/table', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = ?`, 
      [dbConfig.database]
    );
    res.json({ tables: rows });
    await connection.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve tables' });
  }
});

// 👉 /api/table/:tableName - table columns and foreign keys
app.get('/api/table/:tableName', async (req, res) => {
  const { tableName } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);

    // Get columns
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [dbConfig.database, tableName]
    );

    // Get foreign keys
    const [foreignKeys] = await connection.execute(`
      SELECT
        kcu.CONSTRAINT_NAME,
        kcu.COLUMN_NAME,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      WHERE
        kcu.TABLE_SCHEMA = ? AND
        kcu.TABLE_NAME = ? AND
        kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbConfig.database, tableName]);

    res.json({
      table: tableName,
      columns,
      foreignKeys
    });

    await connection.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve table info' });
  }
});



// Use Routes
app.use('/api', authRoutes);  // e.g., /api/login, /api/register
app.use('/api', crudRoutes);  // e.g., /api/users, /api/users/:id

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
