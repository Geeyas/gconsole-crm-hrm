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
const { aiTrainingLogger } = require('./middleware/aiTrainingLogger');
const { testConnection } = require('./config/db');

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

// ==================== RATE LIMITING CONFIGURATION ====================

// 1. General API rate limiter - moderate limits for most endpoints
const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 150, // Increased from 100 to 150
  message: { message: 'Too many requests, try again in 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2.1. Unlimited limiter for timesheet APIs (effectively no limits) - LOAD TESTING OPTIMIZED
const timesheetUnlimitedLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50000, // OPTIMIZED: Increased from 10,000 to 50,000 for intensive load testing
  message: { message: 'Timesheet API limit exceeded (very high limit).' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. High-volume operational APIs (timesheets, shifts, user details) - LOAD TESTING OPTIMIZED
const operationalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 2500, // OPTIMIZED: Increased from 500 to 2500 for load testing
  message: { message: 'Too many operational requests, try again in 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Authentication endpoints - keep strict limits for security
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Keep strict - Max 5 requests per IP per minute
  message: { error: 'Too many login/register attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. Admin operations - LOAD TESTING OPTIMIZED
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1500, // OPTIMIZED: Increased from 300 to 1500 for load testing
  message: { message: 'Too many admin requests, try again in 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. Password reset and sensitive operations
const sensitiveOpsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limited for security
  message: { error: 'Too many sensitive operation attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration for specific domains
const corsOptions = {
  origin: [
    // 'https://workforce-mgmt-61603.web.app',
    // 'https://workforce-mgmt-61603.firebaseapp.com',
    // 'https://hrm.ygit.tech',
    // 'https://rostermatic.netlify.app/',
    'http://localhost:4200',
    'https://rostermatic-b2ae0.web.app/', //Nurselink UAT link
    'https://rostermatic-b2ae0.web.app', //Nurselink UAT link
    
    'https://nurselink-prod-webapp.web.app', //Nurselink Prod WebAPP Link
    'https://nurselink-prod-webapp.web.app/', //NurseLink Prod WebApp Link

    'https://nurselink.shiftly.net.au/',         // Android mobile app
    'https://nurselink.shiftly.net.au',         // Android mobile app
    
    'https://app.shiftly.net.au',         // shiftly Main app
    'https://app.shiftly.net.au',         // shiftly Main app
    'capacitor://nurselink.shiftly.net.au'      // iOS mobile app
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

// AI Training Data Collection (logs all API interactions for AI model training)
app.use(aiTrainingLogger);

// Request logging disabled for cleaner logs. Only important events and errors will be logged manually.
// app.use(requestLogger);

// Debug middleware to log file upload requests
app.use((req, res, next) => {
  if (req.path.includes('clientshiftrequests') || req.path.includes('attachment')) {
    console.log('\n🔍 PDF Upload Debug:', {
      method: req.method,
      path: req.path,
      rawHeaders: req.rawHeaders.filter((h, i) => i % 2 === 0 && h.toLowerCase().includes('content')).reduce((acc, key, i) => {
        acc[key] = req.rawHeaders[req.rawHeaders.indexOf(key) + 1];
        return acc;
      }, {}),
      contentType: req.get('content-type'),
      hasBody: !!req.body,
      bodyType: typeof req.body,
      headers: {
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length']
      }
    });
  }
  next();
});

// Request size limits for security - EXCLUDING file upload routes
app.use((req, res, next) => {
  const contentType = req.get('content-type') || '';
  
  // AGGRESSIVE BYPASS: Skip ALL body parsing for multipart data
  if (contentType && contentType.includes('multipart/form-data')) {
    console.log('🚫 AGGRESSIVE BYPASS: No body parsing for multipart request:', req.path, contentType);
    // Set raw flag to prevent any further body parsing attempts
    req._body = true; // Mark as already processed to prevent double parsing
    return next();
  }
  
  // ONLY bypass body parsing for pure attachment routes
  if (req.path.includes('/attachment')) {
    console.log('⚠️ BYPASSING ALL BODY PARSING for attachment route:', req.path);
    return next();
  }
  
  // Apply JSON body parsing for all other routes
  express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  const contentType = req.get('content-type') || '';
  
  // AGGRESSIVE BYPASS: Skip ALL body parsing for multipart data
  if (contentType && contentType.includes('multipart/form-data')) {
    console.log('🚫 AGGRESSIVE BYPASS: No URL-encoded parsing for multipart request:', req.path, contentType);
    return next();
  }
  
  // ONLY bypass body parsing for pure attachment routes
  if (req.path.includes('/attachment')) {
    console.log('⚠️ BYPASSING URL-encoded parsing for attachment route:', req.path);
    return next();
  }
  
  // Apply URL-encoded parsing for all other routes
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// Request logging middleware
app.use(requestLogger);

// Apply general rate limiter by default
app.use(generalLimiter);

// ==================== SPECIFIC RATE LIMITERS ====================
// Apply stricter limiter to authentication endpoints
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/forgot-password', sensitiveOpsLimiter);
app.use('/api/reset-password', sensitiveOpsLimiter);
app.use('/api/contact-admin', sensitiveOpsLimiter);

// Apply operational limiter to high-frequency endpoints
// app.use('/api/timesheets', operationalLimiter); // RATE LIMITING DISABLED FOR TIMESHEETS
app.use('/api/timesheets', timesheetUnlimitedLimiter); // UNLIMITED TIMESHEET ACCESS (10,000 req/min)
app.use('/api/shifts', operationalLimiter);
app.use('/api/client-shifts', operationalLimiter);
app.use('/api/users', operationalLimiter);
app.use('/api/my-profile', operationalLimiter);
app.use('/api/people', operationalLimiter);

// Apply admin limiter to admin endpoints
app.use('/api/admin', adminLimiter);

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
    message: 'GConsole CRM-HRM API Documentation',
    documentation: {
      comprehensive: 'See COMPREHENSIVE_API_DOCUMENTATION.md for complete API reference',
      endpoints: {
        authentication: '/api/login, /api/logout, /api/register, /api/refresh-token',
        timesheets: '/api/timesheets/* (14 endpoints)',
        clients: '/api/available-client-shifts, /api/clientshiftrequests/*',
        admin: '/api/admin/* (6 endpoints)',
        crud: '/api/{table} (8 generic endpoints)',
        public: '/api/contact-admin'
      }
    },
    version: '1.0.0',
    status: 'active'
  });
});

// Add temporary static file serving for test
app.use(express.static(__dirname));

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
  console.log(bold(cyan(' Shiftly API Server Started ')));
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

  // Initialize AI Training Data Collection
  console.log(`  ${green('✔')} AI Training Data Collection: ACTIVE`);
  console.log(`  ${green('✔')} AI Data Directory: ./ai-training-data/`);
  
  // Start scheduled AI data exports (optional, run only in production)
  if (process.env.NODE_ENV === 'production') {
    require('./scripts/scheduledExport');
    console.log(`  ${green('✔')} AI Export Scheduler: ENABLED`);
  }
  
  console.log(bold('───────────────────────────────────────────────'));
});

module.exports = app;
