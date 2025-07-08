// middleware/requestLogger.js
// Comprehensive request logging middleware

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      // Flatten meta for pretty output
      let metaStr = '';
      if (Object.keys(meta).length) {
        metaStr = JSON.stringify(meta, null, 2);
      }
      return `[${timestamp}] ${level}: ${message} ${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

/**
 * Request logging middleware
 * Logs all incoming requests with relevant information
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = generateRequestId();
  
  // Add request ID to request object for tracking
  req.requestId = requestId;
  
  // Build user context
  const userContext = req.user
    ? { id: req.user.id, email: req.user.email, role: req.user.usertype }
    : { id: 'anonymous' };

  // Log request details
  const logData = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    user: userContext,
  };

  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== 'GET' && req.body) {
    const sanitizedBody = sanitizeRequestBody(req.body);
    logData.body = sanitizedBody;
  }

  logger.info(`→ ${req.method} ${req.originalUrl} by ${userContext.email || userContext.id}`);
  logger.info('Request details', logData);

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    const responseLog = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      user: userContext,
    };

    if (res.statusCode >= 400) {
      logger.error(`✖ ${req.method} ${req.originalUrl} ${res.statusCode} by ${userContext.email || userContext.id}`);
      logger.error('Request failed', responseLog);
    } else {
      logger.info(`✔ ${req.method} ${req.originalUrl} ${res.statusCode} by ${userContext.email || userContext.id}`);
      logger.info('Request completed', responseLog);
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'newPassword', 'token', 'refreshToken', 'authorization'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Error logging middleware
 */
function errorLogger(err, req, res, next) {
  const userContext = req.user
    ? { id: req.user.id, email: req.user.email, role: req.user.usertype }
    : { id: 'anonymous' };
  const logData = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    timestamp: new Date().toISOString(),
    user: userContext,
  };
  logger.error(`‼️ ERROR ${req.method} ${req.originalUrl} by ${userContext.email || userContext.id}`);
  logger.error('Unhandled error', logData);
  next(err);
}

module.exports = {
  requestLogger,
  errorLogger,
  logger
}; 