const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: '34.122.43.4',
    user: 'geeyas',
    password: 'Str0ngPass@123',
    database: 'testdb',
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  try {
    const [rows] = await pool.query(`
      SELECT csr.id, cl.LocationName, csr.Shiftdate, csr.Starttime, csr.Endtime, csr.Qualificationgroupid, csr.Deletedat
      FROM Clientshiftrequests csr
      LEFT JOIN Clientlocations cl ON csr.Clientlocationid = cl.ID
      WHERE csr.Deletedat IS NULL
      ORDER BY csr.Shiftdate DESC
    `);
    console.log('Total non-deleted shifts:', rows.length);
    rows.forEach(row => {
      console.log(row);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error querying database:', err);
    process.exit(1);
  }
})(); 