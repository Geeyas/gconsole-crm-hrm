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


// List all tables
router.get('/table', async (req, res) => {
  try {
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
    `);
    res.json({ tables: tables.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Get table info including foreign keys
router.get('/table/:tableName', async (req, res) => {
  const { tableName } = req.params;
  try {
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = $1
    `, [tableName]);

    const foreignKeys = await pool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name=$1
    `, [tableName]);

    res.json({
      table: tableName,
      columns: columns.rows,
      foreignKeys: foreignKeys.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch table details' });
  }
});



// Use Routes
app.use('/api', tableRoutes);  // /api/table, /api/table/:tableName
app.use('/api', authRoutes);  // e.g., /api/login, /api/register
app.use('/api', crudRoutes);  // e.g., /api/users, /api/users/:id

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
