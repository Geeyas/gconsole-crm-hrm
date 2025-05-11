
// Import required packages
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const apiDocs = require('./docs/apiDocs');


//Initialize JWT Token
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

// Initialize the express app
const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.json()); // Parse JSON bodies

// Function to hash a password using SHA256 + salt
function hashPassword(password, salt) {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Create the MySQL database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', // Use the actual IP or localhost if local
    user: process.env.DB_USER || 'your_db_user', // Your MySQL username
    password: process.env.DB_PASSWORD || 'your_db_password', // Your MySQL password
    database: process.env.DB_NAME || 'your_db_name' // Your database name
});

// Test the database connection
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database');
});

//API endpoint for the API Endpoint docs
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'API Endpoint Documentation',
    endpoints: apiDocs
  });
});


// API endpoint for Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Get user data by username
  const query = 'SELECT * FROM Users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }
    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = results[0];
    const hashedInputPassword = hashPassword(password, user.salt);

    if (hashedInputPassword !== user.passwordhash) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            jwtSecret,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

    res.status(200).json({ message: 'Login successful', token });
  });
});



//app.get('/api/profile', authenticateJWT, (req, res) => {
  //  res.json({ message: 'Secure profile info', user: req.user });
//});



//api Endpoint for Update password
app.put('/api/update-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  if (!username || !oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const getUserQuery = 'SELECT * FROM Users WHERE username = ?';
  db.query(getUserQuery, [username], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];
    const oldHash = hashPassword(oldPassword, user.salt);

    if (oldHash !== user.passwordhash) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashPassword(newPassword, newSalt);

    const updateQuery = 'UPDATE Users SET passwordhash = ?, salt = ?, updatedat = NOW(), updatedbyid = 1 WHERE username = ?';
    db.query(updateQuery, [newHash, newSalt, username], (err2) => {
      if (err2) {
        return res.status(500).json({ message: 'Failed to update password', error: err2 });
      }
      res.status(200).json({ message: 'Password updated successfully' });
    });
  });
});




//api endpoint to register user
app.post('/api/register', (req, res) => {
    const { fullname, username, email, password } = req.body;

    // Check if all required fields are provided
    if (!fullname || !username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if the email already exists in the database
    const checkEmailQuery = 'SELECT COUNT(*) AS count FROM Users WHERE email = ?';
    db.query(checkEmailQuery, [email], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error checking email', error: err });
        }

        // If the email already exists, return an error message
        if (result[0].count > 0) {
            return res.status(400).json({ message: 'Email is already in use.' });
        }

        // Generate a unique salt
        const salt = crypto.randomBytes(16).toString('hex');

        // Hash the password with the salt
        const passwordHash = hashPassword(password, salt);

        // Insert the user into the database
        const query = `
            INSERT INTO Users (fullname, username, email, passwordhash, salt, createdat)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        const values = [fullname, username, email, passwordHash, salt];

        db.query(query, values, (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error creating user', error: err });
            }

            // Successfully created user, send response
            res.status(201).json({
                message: 'User registered successfully',
                userId: result.insertId,
            });
        });
    });
});


// Endpoint to get all records from any table
app.get('/api/:table', (req, res) => {
    const tableName = req.params.table;
    const query = `SELECT * FROM ${tableName}`;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching records', error: err });
            return;
        }
        res.status(200).json(results);
    });
});


// Endpoint to get a specific record by ID from any table
app.get('/api/:table/:id', (req, res) => {
    const tableName = req.params.table;
    const recordId = req.params.id;
    const query = `SELECT * FROM ${tableName} WHERE id = ?`;
    db.query(query, [recordId], (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching record', error: err });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ message: 'Record not found' });
            return;
        }
        res.status(200).json(results[0]);
    });
});

// Endpoint to create a new record in any table
app.post('/api/:table', (req, res) => {
    const tableName = req.params.table;
    const fields = Object.keys(req.body); // Extract fields from the request body
    const values = Object.values(req.body); // Extract values from the request body
    
    // Generate placeholders for the query
    const placeholders = fields.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    
    db.query(query, values, (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error inserting record', error: err });
            return;
        }
        res.status(201).json({ message: 'Record created successfully', id: results.insertId });
    });
});

// Endpoint to update a record by ID in any table
app.put('/api/:table/:id', (req, res) => {
    const tableName = req.params.table;
    const recordId = req.params.id;
    const fields = Object.keys(req.body); // Extract fields from the request body
    const values = Object.values(req.body); // Extract values from the request body
    
    // Prepare the set part of the update query
    const setQuery = fields.map(field => `${field} = ?`).join(', ');

    const query = `UPDATE ${tableName} SET ${setQuery} WHERE id = ?`;
    db.query(query, [...values, recordId], (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error updating record', error: err });
            return;
        }
        if (results.affectedRows === 0) {
            res.status(404).json({ message: 'Record not found' });
            return;
        }
        res.status(200).json({ message: 'Record updated successfully' });
    });
});

// Endpoint to delete a record by ID in any table
app.delete('/api/:table/:id', (req, res) => {
    const tableName = req.params.table;
    const recordId = req.params.id;
    const query = `DELETE FROM ${tableName} WHERE id = ?`;
    db.query(query, [recordId], (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error deleting record', error: err });
            return;
        }
        if (results.affectedRows === 0) {
            res.status(404).json({ message: 'Record not found' });
            return;
        }
        res.status(200).json({ message: 'Record deleted successfully' });
    });
});


// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
