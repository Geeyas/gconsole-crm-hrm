require('dotenv').config();
const { validateEnvironment } = require('./config/envValidation');

// Validate environment variables on startup
validateEnvironment();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet'); // Optional, but recommended
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const winston = require('winston');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const { testConnection } = require('./config/db');

const apiDocs = require('./docs/apiDocs');
const authRoutes = require('./routes/authRoutes');
const crudRoutes = require('./routes/crudRoutes');
const clientRoutes = require('./routes/clientRoutes');
const publicRoutes = require('./routes/publicRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.set('trust proxy', 1); // Fix: trust proxy for correct client IP detection (Cloud Run, load balancers)
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
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  message: { message: 'Too many requests, try again in 5 minutes.' },
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
    // 'https://rostermatic.netlify.app/',
    'https://rostermatic-b2ae0.web.app/',
    'https://rostermatic-b2ae0.web.app',
    // 'https://console.firebase.google.com/project/rostermatic-b2ae0/overview',
    // 'https://rostermatic-b2ae0.firebaseapp.com/',
    // 'https://rostermatic-b2ae0.firebaseapp.com',
    // 'https://nurselink-api-prod-1073214940443.australia-southeast2.run.app/',
    // 'https://nurselink-api-prod-1073214940443.australia-southeast2.run.app',

    // 'https://nurselink-api-prod-807756312040.australia-southeast2.run.app',
    // 'https://nurselink-api-prod-807756312040.australia-southeast2.run.app/',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'cache-control'],
  credentials: true, // Allow cookies and authorization headers
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:4200"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})); // 🛡 Enhanced security headers

// Response compression for better performance
app.use(compression());

// Request logging disabled for cleaner logs. Only important events and errors will be logged manually.
// app.use(requestLogger);

// Request size limits for security
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Limit URL-encoded payload size

// Request logging middleware
app.use(requestLogger);

app.use(limiter);

// Apply stricter limiter to login and register endpoints before routes are registered
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  const { getHealthStatus } = require('./config/db');
  
  try {
    const dbHealth = await getHealthStatus();
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Debug endpoint to test JSON parsing
app.post('/debug', (req, res) => {
  console.log('Debug endpoint called');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Body type:', typeof req.body);
  console.log('Body stringified:', JSON.stringify(req.body));
  res.json({ 
    message: 'Debug endpoint working',
    body: req.body,
    bodyType: typeof req.body,
    headers: req.headers
  });
});

// API Docs
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'API Endpoint Documentation',
    endpoints: apiDocs
  });
});

// Mount publicRoutes first so /api/contact-admin is always public
app.use('/api', publicRoutes);
app.use('/api', authRoutes);
app.use('/api', clientRoutes);
app.use('/api/timesheets', timesheetRoutes); // MOVED BEFORE crudRoutes to prevent conflicts
app.use('/api', crudRoutes);
app.use('/api/admin', adminRoutes); // Admin/Staff functionality

// Handle 404 for unknown API routes
app.use('/api/', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler (for uncaught errors)
app.use((err, req, res, next) => {
  logger.error('Unhandled server error', { 
    error: err, 
    url: req.originalUrl, 
    method: req.method, 
    user: req.user,
    requestId: req.requestId 
  });
  res.status(500).json({ 
    message: 'Internal server error', 
    error: err.message, 
    code: 'INTERNAL_SERVER_ERROR',
    requestId: req.requestId 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
  // Color helpers
  const green = (msg) => `\x1b[32m${msg}\x1b[0m`;
  const red = (msg) => `\x1b[31m${msg}\x1b[0m`;
  const cyan = (msg) => `\x1b[36m${msg}\x1b[0m`;
  const bold = (msg) => `\x1b[1m${msg}\x1b[0m`;

  console.log(bold('───────────────────────────────────────────────'));
  console.log(bold(cyan(' GConsole HRM API Server Started ')));
  console.log(bold('───────────────────────────────────────────────'));
  console.log(`  ${green('✔')} Server running on ${cyan('http://localhost:' + PORT)}`);
  console.log(`  ${green('✔')} Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  ${green('✔')} Time: ${new Date().toLocaleString()}`);

  // Database connection check
  process.stdout.write('  Connecting to database... ');
  const dbOk = await testConnection();
  if (dbOk) {
    console.log(green('SUCCESS'));
    console.log(`  ${green('✔')} DB Host: ${process.env.DB_HOST}`);
    console.log(`  ${green('✔')} DB Name: ${process.env.DB_NAME}`);
  } else {
    console.log(red('FAILED'));
    console.log(red('  ✖ Database connection failed. Check your configuration.'));
  }
  console.log(bold('───────────────────────────────────────────────'));
});

module.exports = app;
