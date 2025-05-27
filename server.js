require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet'); // Optional, but recommended

const apiDocs = require('./docs/apiDocs');
const authRoutes = require('./routes/authRoutes');
const crudRoutes = require('./routes/crudRoutes');

const app = express();
app.use(cookieParser());

// CORS configuration for specific domains
const corsOptions = {
  origin: [
    'https://workforce-mgmt-61603.web.app',
    'https://workforce-mgmt-61603.firebaseapp.com',
    'https://hrm.ygit.tech',
    'http://localhost:4200'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet()); // 🛡 Adds basic security headers
app.use(express.json()); // ✅ Replaces body-parser

// API Docs
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'API Endpoint Documentation',
    endpoints: apiDocs
  });
});

// Routes
app.use('/api', authRoutes);
app.use('/api', crudRoutes);

// Handle 404 for unknown API routes
app.use('/api/', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Global error handler (for uncaught errors)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
