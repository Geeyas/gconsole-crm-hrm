const { pool: db } = require('../config/db');
const winston = require('winston');

let validTables = new Set(); // Stores valid table names

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

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

exports.getAllPaginated = async (req, res, next) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  try {
    let results, total;
    if (table.toLowerCase() === 'people') {
      // Get total count from People (only non-deleted)
      const [countResult] = await db.query(`SELECT COUNT(*) as total FROM People WHERE deletedat IS NULL`);
      total = countResult[0]?.total || 0;
      // Get paginated People with joined Users and Usertype, only non-deleted
      [results] = await db.query(`
        SELECT 
          p.*, 
          u.id AS user_id, u.username, u.email, u.fullname, u.Deletedat AS user_Deletedat, u.Deletedbyid AS user_Deletedbyid,
          ut.ID AS usertype_id, ut.Name AS usertype_name
        FROM People p
        LEFT JOIN Users u ON p.Linkeduserid = u.id
        LEFT JOIN Assignedusertypes au ON au.Userid = u.id
        LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
        WHERE p.deletedat IS NULL
        LIMIT ? OFFSET ?
      `, [limit, offset]);
    } else {
      // Generic for other tables
      const [countResult] = await db.query(`SELECT COUNT(*) as total FROM ??`, [table]);
      total = countResult[0]?.total || 0;
      [results] = await db.query(`SELECT * FROM ?? LIMIT ? OFFSET ?`, [table, limit, offset]);
    }
    res.status(200).json({
      data: results,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (err) {
    logger.error('Fetch error', { error: err });
    res.status(500).json({ message: 'Fetch error', error: err.message, code: 'FETCH_ERROR' });
  }
};


exports.getAll = async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  try {
    // Check for Deletedat or deletedat column (case-insensitive)
    const [columns] = await db.query('SHOW COLUMNS FROM ??', [table]);
    const hasDeletedat = columns.some(col => col.Field.toLowerCase() === 'deletedat');
    let sql = `SELECT * FROM ??`;
    let params = [table];
    if (hasDeletedat) {
      sql += ' WHERE ?? IS NULL';
      // Find the actual column name (case preserved)
      const deletedatCol = columns.find(col => col.Field.toLowerCase() === 'deletedat').Field;
      params.push(deletedatCol);
    }
    const [results] = await db.query(sql, params);
    res.status(200).json(results);
  } catch (err) {
    logger.error('Fetch error', { error: err });
    res.status(500).json({ message: 'Fetch error', error: err.message, code: 'FETCH_ERROR' });
  }
};

exports.getOne = async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  try {
    const [results] = await db.query(`SELECT * FROM ?? WHERE id = ?`, [table, id]);
    if (results.length === 0) return res.status(404).json({ message: 'Record not found', code: 'NOT_FOUND' });
    res.status(200).json(results[0]);
  } catch (err) {
    logger.error('Fetch error', { error: err });
    res.status(500).json({ message: 'Fetch error', error: err.message, code: 'FETCH_ERROR' });
  }
};

exports.create = async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  const fields = Object.keys(req.body);
  const values = Object.values(req.body);

  try {
    const placeholders = fields.map(() => '?').join(', ');
    const query = `INSERT INTO ?? (${fields.join(', ')}) VALUES (${placeholders})`;
    const [results] = await db.query(query, [table, ...values]);
    res.status(201).json({ message: 'Record created', id: results.insertId });
  } catch (err) {
    logger.error('Insert error', { error: err });
    res.status(500).json({ message: 'Insert error', error: err.message, code: 'INSERT_ERROR' });
  }
};

exports.update = async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  const fields = Object.keys(req.body);
  const values = Object.values(req.body);

  try {
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE ?? SET ${setClause} WHERE id = ?`;
    const [results] = await db.query(query, [table, ...values, id]);

    if (results.affectedRows === 0) return res.status(404).json({ message: 'Not found', code: 'NOT_FOUND' });
    res.status(200).json({ message: 'Record updated' });
  } catch (err) {
    logger.error('Update error', { error: err });
    res.status(500).json({ message: 'Update error', error: err.message, code: 'UPDATE_ERROR' });
  }
};

exports.remove = async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ message: 'Invalid table name', code: 'INVALID_TABLE' });

  try {
    const [results] = await db.query(`DELETE FROM ?? WHERE id = ?`, [table, id]);
    if (results.affectedRows === 0) return res.status(404).json({ message: 'Not found', code: 'NOT_FOUND' });
    res.status(200).json({ message: 'Record deleted' });
  } catch (err) {
    logger.error('Delete error', { error: err });
    res.status(500).json({ message: 'Delete error', error: err.message, code: 'DELETE_ERROR' });
  }
};

// Get paginated People with joined Users and Usertype info
exports.getPeoplePaginated = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  try {
    // Get total count from People
    const [countResult] = await db.query(`SELECT COUNT(*) as total FROM People`);
    const total = countResult[0]?.total || 0;

    // Get paginated People with joined Users and Usertype
    const [results] = await db.query(`
      SELECT 
        p.*, 
        u.id AS user_id, u.username, u.email, u.fullname, u.Deletedat AS user_Deletedat, u.Deletedbyid AS user_Deletedbyid,
        ut.ID AS usertype_id, ut.Name AS usertype_name
      FROM People p
      LEFT JOIN Users u ON p.Linkeduserid = u.id
      LEFT JOIN Assignedusertypes au ON au.Userid = u.id
      LEFT JOIN Usertypes ut ON au.Usertypeid = ut.ID
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.status(200).json({
      data: results,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (err) {
    logger.error('Fetch People paginated error', { error: err });
    res.status(500).json({ message: 'Fetch error', error: err.message, code: 'FETCH_ERROR' });
  }
};
