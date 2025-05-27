const db = require('../config/db');

let validTables = new Set(); // Stores valid table names

// Load all table names on app start
async function loadTableNames() {
  try {
    const [tables] = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = ?`, [process.env.DB_NAME]);
    validTables = new Set(tables.map(row => row.TABLE_NAME));
    // console.log('✅ Loaded table names:', [...validTables]);
  } catch (err) {
    console.error('❌ Failed to load table names:', err);
  }
}

// Call this once at startup
loadTableNames();

function isValidTable(table) {
  return validTables.has(table);
}

// --- CONTROLLER FUNCTIONS ---

exports.getAllPaginated = async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name' });

  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  try {
    const [results] = await db.query(`SELECT * FROM ?? LIMIT ? OFFSET ?`, [table, limit, offset]);
    res.status(200).json({
      data: results,
      pagination: {
        page,
        limit
      }
    });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Fetch error', error: err });
  }
};


exports.getAll = async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name' });

  try {
    const [results] = await db.query(`SELECT * FROM ??`, [table]);
    res.status(200).json(results);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Fetch error', error: err });
  }
};

exports.getOne = async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name' });

  try {
    const [results] = await db.query(`SELECT * FROM ?? WHERE id = ?`, [table, id]);
    if (results.length === 0) return res.status(404).json({ message: 'Record not found' });
    res.status(200).json(results[0]);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Fetch error', error: err });
  }
};

exports.create = async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name' });

  const fields = Object.keys(req.body);
  const values = Object.values(req.body);

  try {
    const placeholders = fields.map(() => '?').join(', ');
    const query = `INSERT INTO ?? (${fields.join(', ')}) VALUES (${placeholders})`;
    const [results] = await db.query(query, [table, ...values]);
    res.status(201).json({ message: 'Record created', id: results.insertId });
  } catch (err) {
    console.error('Insert error:', err);
    res.status(500).json({ message: 'Insert error', error: err });
  }
};

exports.update = async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name' });

  const fields = Object.keys(req.body);
  const values = Object.values(req.body);

  try {
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE ?? SET ${setClause} WHERE id = ?`;
    const [results] = await db.query(query, [table, ...values, id]);

    if (results.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.status(200).json({ message: 'Record updated' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Update error', error: err });
  }
};

exports.remove = async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name' });

  try {
    const [results] = await db.query(`DELETE FROM ?? WHERE id = ?`, [table, id]);
    if (results.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.status(200).json({ message: 'Record deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Delete error', error: err });
  }
};
