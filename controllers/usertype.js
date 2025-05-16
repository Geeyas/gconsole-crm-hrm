const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/:personId', async (req, res) => {
  const personId = req.params.personId;

  const sql = `
    SELECT 
        p.ID AS person_id,
        p.Firstname,
        p.Middlename,
        p.Lastname,
        u.username,
        u.email,
        ut.Name AS user_type,
        pr.Name AS portal_name
    FROM People p
    LEFT JOIN Users u ON p.Linkeduserid = u.id
    LEFT JOIN Assignedusertypes aut ON aut.Userid = u.id
    LEFT JOIN Usertypes ut ON aut.Usertypeid = ut.ID
    LEFT JOIN Portals pr ON ut.Portalid = pr.ID
    WHERE p.ID = ?
      AND p.Deletedat IS NULL
  `;

  try {
    const [rows] = await db.query(sql, [personId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Person not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
