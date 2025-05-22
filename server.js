// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const apiDocs = require('./docs/apiDocs');


// CORS configuration for specific domains
const corsOptions = {
  origin: [
    'https://workforce-mgmt-61603.web.app',
    'https://workforce-mgmt-61603.firebaseapp.com',
    'https://hrm.ygit.tech'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};


// Routes
const authRoutes = require('./routes/authRoutes');
const crudRoutes = require('./routes/crudRoutes');

// Initialize app
const app = express();

// Middleware
// app.use(cors());
app.use(bodyParser.json());
app.use(cors(corsOptions)); // Use CORS with the specified options

// API Docs Endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'API Endpoint Documentation',
    endpoints: apiDocs
  });
});

// Use Routes
app.use('/api', authRoutes);  // e.g., /api/login, /api/register
app.use('/api', crudRoutes);  // e.g., /api/users, /api/users/:id

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
