require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet'); // Optional, but recommended
const rateLimit = require('express-rate-limit');
const winston = require('winston');

const apiDocs = require('./docs/apiDocs');
const authRoutes = require('./routes/authRoutes');
const crudRoutes = require('./routes/crudRoutes');
const clientRoutes = require('./routes/clientRoutes');

const app = express();
app.use(cookieParser());

// Winston logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // You can add file transports here if needed
  ],
});

// Rate limiting middleware (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for sensitive endpoints (e.g., login/register)
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Max 5 requests per IP per minute
  message: { error: 'Too many login/register attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration for specific domains
const corsOptions = {
  origin: [
    // 'https://workforce-mgmt-61603.web.app',
    // 'https://workforce-mgmt-61603.firebaseapp.com',
    // 'https://hrm.ygit.tech',
    'http://localhost:4200',
    'https://rostermatic.netlify.app/',
    'https://rostermatic-b2ae0.web.app/',
    'https://rostermatic-b2ae0.web.app',
    'https://console.firebase.google.com/project/rostermatic-b2ae0/overview',
    'https://rostermatic-b2ae0.firebaseapp.com/',
    'https://rostermatic-b2ae0.firebaseapp.com',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet()); // 🛡 Adds basic security headers
app.use(express.json()); // ✅ Replaces body-parser
app.use(limiter);

// Apply stricter limiter to login and register endpoints before routes are registered
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// API Docs
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'API Endpoint Documentation',
    endpoints: apiDocs
  });
});

// Routes
app.use('/api', authRoutes);
app.use('/api', clientRoutes); // Register clientRoutes before crudRoutes
app.use('/api', crudRoutes);

// Handle 404 for unknown API routes
app.use('/api/', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Global error handler (for uncaught errors)
app.use((err, req, res, next) => {
  logger.error('Unhandled server error', { error: err, url: req.originalUrl, method: req.method, user: req.user });
  res.status(500).json({ message: 'Internal server error', error: err.message, code: 'INTERNAL_SERVER_ERROR' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
