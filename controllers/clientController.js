// controllers/clientController.js
const db = require('../config/db');

// Helper: Check if user is Systemadmin or Staff
function isStaffOrAdmin(user) {
  return user && (user.usertype === 'System Admin' || user.usertype === 'Staff - Standard User');
}

// ========== CLIENTS ==========

// Create a new client
exports.createClient = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const { Name, ...fields } = req.body;
  if (!Name) return res.status(400).json({ message: 'Name is required' });
  try {
    // List of system fields to ignore
    const systemFields = [
      'ID', 'Createdat', 'Createdbyid', 'Updatedat', 'Updatedbyid', 'Deletedat', 'Deletedbyid', 'Sysstarttime'
    ];
    // Filter out system fields and fields with undefined or empty keys
    const filteredFields = Object.entries(fields)
      .filter(([key, value]) => key && !systemFields.includes(key) && value !== undefined)
      .reduce((obj, [key, value]) => { obj[key] = value; return obj; }, {});
    const columns = ['Name', ...Object.keys(filteredFields), 'Createdat', 'Createdbyid', 'Updatedat', 'Updatedbyid'];
    const placeholders = columns.map(() => '?');
    const values = [Name, ...Object.values(filteredFields), req.user.id, req.user.id];
    const sql = `INSERT INTO Clients (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const [result] = await db.query(sql, values);
    res.status(201).json({ message: 'Client created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create client', error: err.message });
  }
};

// Update a client
exports.updateClient = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const clientId = req.params.id;
  const { Name, ...fields } = req.body;
  if (!Name && Object.keys(fields).length === 0) {
    return res.status(400).json({ message: 'At least one field is required to update' });
  }
  try {
    // Build dynamic SET clause
    const updates = [];
    const params = [];
    if (Name) {
      updates.push('Name = ?');
      params.push(Name);
    }
    for (const [key, value] of Object.entries(fields)) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
    updates.push('Updatedat = NOW()');
    updates.push('Updatedbyid = ?');
    params.push(req.user.id);
    params.push(clientId);
    const sql = `UPDATE Clients SET ${updates.join(', ')} WHERE ID = ? AND Deletedat IS NULL`;
    await db.query(sql, params);
    res.status(200).json({ message: 'Client updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update client', error: err.message });
  }
};

// Soft-delete a client and all linked locations
exports.deleteClient = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const clientId = req.params.id;
  try {
    // Soft-delete the client
    await db.query(
      'UPDATE Clients SET Deletedat = NOW(), Deletedbyid = ? WHERE ID = ? AND Deletedat IS NULL',
      [req.user.id, clientId]
    );
    // Soft-delete all linked client locations
    await db.query(
      'UPDATE Clientlocations SET Deletedat = NOW(), Deletedbyid = ? WHERE Clientid = ? AND Deletedat IS NULL',
      [req.user.id, clientId]
    );
    res.status(200).json({ message: 'Client and all linked locations deleted (soft)' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete client', error: err.message });
  }
};

// ========== CLIENT LOCATIONS ==========

// Create a new client location
exports.createClientLocation = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const { Clientid, LocationName, LocationAddress, ...fields } = req.body;
  if (!Clientid || !LocationName || !LocationAddress) {
    return res.status(400).json({ message: 'Clientid, LocationName, and LocationAddress are required' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO Clientlocations (Clientid, LocationName, LocationAddress, Createdat, Createdbyid, Updatedat, Updatedbyid) VALUES (?, ?, ?, NOW(), ?, NOW(), ?)',
      [Clientid, LocationName, LocationAddress, req.user.id, req.user.id]
    );
    res.status(201).json({ message: 'Client location created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create client location', error: err.message });
  }
};

// Update a client location
exports.updateClientLocation = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const locationId = req.params.id;
  const { LocationName, LocationAddress, ...fields } = req.body;
  if (!LocationName || !LocationAddress) {
    return res.status(400).json({ message: 'LocationName and LocationAddress are required' });
  }
  try {
    await db.query(
      'UPDATE Clientlocations SET LocationName = ?, LocationAddress = ?, Updatedat = NOW(), Updatedbyid = ? WHERE ID = ? AND Deletedat IS NULL',
      [LocationName, LocationAddress, req.user.id, locationId]
    );
    res.status(200).json({ message: 'Client location updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update client location', error: err.message });
  }
};

// Soft-delete a client location
exports.deleteClientLocation = async (req, res) => {
  if (!isStaffOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const locationId = req.params.id;
  try {
    await db.query(
      'UPDATE Clientlocations SET Deletedat = NOW(), Deletedbyid = ? WHERE ID = ? AND Deletedat IS NULL',
      [req.user.id, locationId]
    );
    res.status(200).json({ message: 'Client location deleted (soft)' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete client location', error: err.message });
  }
};
