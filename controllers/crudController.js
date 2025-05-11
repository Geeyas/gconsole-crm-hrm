// controllers/crudController.js
const db = require('../config/db');

exports.getAll = (req, res) => {
  db.query(`SELECT * FROM ${req.params.table}`, (err, results) => {
    if (err) return res.status(500).json({ message: 'Fetch error', error: err });
    res.status(200).json(results);
  });
};

exports.getOne = (req, res) => {
  db.query(`SELECT * FROM ${req.params.table} WHERE id = ?`, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Fetch error', error: err });
    if (results.length === 0) return res.status(404).json({ message: 'Record not found' });
    res.status(200).json(results[0]);
  });
};

exports.create = (req, res) => {
  const fields = Object.keys(req.body);
  const values = Object.values(req.body);
  const placeholders = fields.map(() => '?').join(', ');
  db.query(`INSERT INTO ${req.params.table} (${fields.join(', ')}) VALUES (${placeholders})`, values, (err, results) => {
    if (err) return res.status(500).json({ message: 'Insert error', error: err });
    res.status(201).json({ message: 'Record created', id: results.insertId });
  });
};

exports.update = (req, res) => {
  const set = Object.keys(req.body).map(field => `${field} = ?`).join(', ');
  const values = [...Object.values(req.body), req.params.id];
  db.query(`UPDATE ${req.params.table} SET ${set} WHERE id = ?`, values, (err, results) => {
    if (err) return res.status(500).json({ message: 'Update error', error: err });
    if (results.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.status(200).json({ message: 'Record updated' });
  });
};

exports.remove = (req, res) => {
  db.query(`DELETE FROM ${req.params.table} WHERE id = ?`, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Delete error', error: err });
    if (results.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.status(200).json({ message: 'Record deleted' });
  });
};
