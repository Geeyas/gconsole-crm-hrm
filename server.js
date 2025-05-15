// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2/promise');
const apiDocs = require('./docs/apiDocs');

// Routes
const authRoutes = require('./routes/authRoutes');
const crudRoutes = require('./routes/crudRoutes');

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL connection config
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

// API Docs Endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'API Endpoint Documentation',
    endpoints: apiDocs,
  });
});

// 👉 /api/table - List all tables with columns & foreign keys
app.get('/api/table', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    // Get all tables
    const [tables] = await connection.execute(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = ?`,
      [dbConfig.database]
    );

    const result = [];

    // Loop through tables and get details
    for (const { table_name } of tables) {
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME, DATA_TYPE 
         FROM information_schema.columns 
         WHERE table_schema = ? AND table_name = ?`,
        [dbConfig.database, table_name]
      );

      const [foreignKeys] = await connection.execute(
        `SELECT
          kcu.CONSTRAINT_NAME,
          kcu.COLUMN_NAME,
          kcu.REFERENCED_TABLE_NAME,
          kcu.REFERENCED_COLUMN_NAME
        FROM
          information_schema.key_column_usage kcu
        WHERE
          kcu.table_schema = ? AND
          kcu.table_name = ? AND
          kcu.referenced_table_name IS NOT NULL`,
        [dbConfig.database, table_name]
      );

      result.push({
        table: table_name,
        columns,
        foreignKeys,
      });
    }

    await connection.end();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve table information' });
  }
});

// 👉 /api/table/:tableName - Info for a specific table
app.get('/api/table/:tableName', async (req, res) => {
  const { tableName } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE 
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = ?`,
      [dbConfig.database, tableName]
    );

    const [foreignKeys] = await connection.execute(
      `SELECT
        kcu.CONSTRAINT_NAME,
        kcu.COLUMN_NAME,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME
      FROM
        information_schema.key_column_usage kcu
      WHERE
        kcu.table_schema = ? AND
        kcu.table_name = ? AND
        kcu.referenced_table_name IS NOT NULL`,
      [dbConfig.database, tableName]
    );

    await connection.end();

    res.json({
      table: tableName,
      columns,
      foreignKeys,
    });
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
