// middleware/aiTrainingLogger.js
// AI Training Data Collection Middleware

const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

// Create AI training data directory
const AI_TRAINING_DIR = path.join(__dirname, '..', 'ai-training-data');

// Configuration for AI training (can be controlled via environment variables)
const AI_TRAINING_CONFIG = {
  // Set to 'false' to disable heavy disk writes during testing
  SAVE_TO_FILES: process.env.AI_SAVE_TO_FILES !== 'false', // Default: true
  SAVE_INDIVIDUAL_FILES: process.env.AI_SAVE_INDIVIDUAL !== 'false', // Default: true
  LOG_TO_CONSOLE: process.env.AI_LOG_TO_CONSOLE === 'true', // Default: false
};

// Debug: Log configuration on startup
console.log('🤖 AI Training Configuration:');
console.log('  - Save to files:', AI_TRAINING_CONFIG.SAVE_TO_FILES);
console.log('  - Save individual files:', AI_TRAINING_CONFIG.SAVE_INDIVIDUAL_FILES);
console.log('  - Log to console:', AI_TRAINING_CONFIG.LOG_TO_CONSOLE);
console.log('  - Environment vars:', {
  AI_SAVE_TO_FILES: process.env.AI_SAVE_TO_FILES,
  AI_SAVE_INDIVIDUAL: process.env.AI_SAVE_INDIVIDUAL,
  AI_LOG_TO_CONSOLE: process.env.AI_LOG_TO_CONSOLE
});

// Configure winston logger for AI training data
const aiLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Daily rotating file for training data
    new winston.transports.File({
      filename: path.join(AI_TRAINING_DIR, 'api-interactions.jsonl'),
      maxsize: 50 * 1024 * 1024, // 50MB max file size
      maxFiles: 100, // Keep 100 files max
    }),
    // Separate file for error interactions
    new winston.transports.File({
      filename: path.join(AI_TRAINING_DIR, 'error-interactions.jsonl'),
      level: 'error'
    })
  ],
});

// Ensure AI training directory exists
async function ensureAITrainingDir() {
  try {
    await fs.mkdir(AI_TRAINING_DIR, { recursive: true });
    console.log(`✅ AI Training directory created: ${AI_TRAINING_DIR}`);
  } catch (err) {
    console.error('❌ Failed to create AI training directory:', err);
  }
}

// Initialize directory on startup
ensureAITrainingDir();

/**
 * Extract meaningful context from request
 */
function extractRequestContext(req) {
  const context = {
    endpoint: req.originalUrl,
    method: req.method,
    userType: req.user?.usertype || 'anonymous',
    userId: req.user?.id || null,
    userEmail: req.user?.email || null,
    params: req.params || {},
    query: req.query || {},
    // Only capture non-sensitive body data
    body: sanitizeRequestBody(req.body),
    headers: {
      'user-agent': req.get('User-Agent'),
      'content-type': req.get('Content-Type'),
      'origin': req.get('Origin')
    },
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  };

  return context;
}

/**
 * Sanitize request body - remove sensitive data
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveFields = [
    'password', 'passwordhash', 'jwt', 'token', 'secret',
    'authorization', 'auth', 'key', 'ssn', 'creditcard'
  ];
  
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Extract response context
 */
function extractResponseContext(res, responseBody, duration) {
  return {
    statusCode: res.statusCode,
    statusText: getStatusText(res.statusCode),
    duration: `${duration}ms`,
    success: res.statusCode >= 200 && res.statusCode < 400,
    // Only capture first 1000 chars of response to avoid huge logs
    responsePreview: truncateResponse(responseBody),
    headers: {
      'content-type': res.get('Content-Type'),
      'content-length': res.get('Content-Length')
    }
  };
}

/**
 * Truncate response for logging
 */
function truncateResponse(responseBody) {
  if (!responseBody) return null;
  
  const responseStr = typeof responseBody === 'string' 
    ? responseBody 
    : JSON.stringify(responseBody);
    
  return responseStr.length > 1000 
    ? responseStr.substring(0, 1000) + '...[truncated]'
    : responseStr;
}

/**
 * Get human-readable status text
 */
function getStatusText(statusCode) {
  const statusTexts = {
    200: 'OK', 201: 'Created', 400: 'Bad Request', 401: 'Unauthorized',
    403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error'
  };
  return statusTexts[statusCode] || 'Unknown';
}

/**
 * Generate natural language description of the API interaction
 */
function generateInteractionDescription(requestContext, responseContext) {
  const { method, endpoint, userType, body } = requestContext;
  const { statusCode, success } = responseContext;
  
  let description = '';
  
  // User context
  if (userType !== 'anonymous') {
    description += `A ${userType} user `;
  } else {
    description += 'An anonymous user ';
  }
  
  // Action description
  switch (method) {
    case 'GET':
      description += `requested data from ${endpoint}`;
      break;
    case 'POST':
      description += `created/submitted data to ${endpoint}`;
      if (body && Object.keys(body).length > 0) {
        description += ` with data: ${JSON.stringify(body)}`;
      }
      break;
    case 'PUT':
      description += `updated data at ${endpoint}`;
      break;
    case 'DELETE':
      description += `deleted data from ${endpoint}`;
      break;
    default:
      description += `made a ${method} request to ${endpoint}`;
  }
  
  // Outcome
  if (success) {
    description += `. The request was successful.`;
  } else {
    description += `. The request failed with status ${statusCode}.`;
  }
  
  return description;
}

/**
 * Main AI Training Logger Middleware
 */
function aiTrainingLogger(req, res, next) {
  const startTime = Date.now();
  
  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseBody = null;
  
  // Override res.send to capture response
  res.send = function(body) {
    responseBody = body;
    return originalSend.call(this, body);
  };
  
  // Override res.json to capture response
  res.json = function(body) {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  // Log after response is sent
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const requestContext = extractRequestContext(req);
      const responseContext = extractResponseContext(res, responseBody, duration);
      
      // Create AI training data entry
      const trainingEntry = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        interaction: {
          request: requestContext,
          response: responseContext,
          duration: duration
        },
        // Natural language description for AI training
        description: generateInteractionDescription(requestContext, responseContext),
        // Conversation format for training
        conversation: {
          user_intent: inferUserIntent(requestContext),
          system_response: generateSystemResponse(requestContext, responseContext),
          success: responseContext.success,
          error_details: responseContext.success ? null : {
            code: responseContext.statusCode,
            message: responseBody?.message || responseBody?.error || 'Unknown error'
          }
        },
        // Metadata for training
        metadata: {
          endpoint_category: categorizeEndpoint(requestContext.endpoint),
          user_type: requestContext.userType,
          complexity: calculateComplexity(requestContext),
          business_domain: inferBusinessDomain(requestContext.endpoint)
        }
      };
      
      // Log to appropriate file based on success/failure (only if file saving is enabled)
      if (AI_TRAINING_CONFIG.SAVE_TO_FILES) {
        if (responseContext.success) {
          aiLogger.info('API_INTERACTION', trainingEntry);
        } else {
          aiLogger.error('API_INTERACTION_ERROR', trainingEntry);
        }
      }
      
      // Also save as individual JSON files for easier processing (only if enabled)
      if (AI_TRAINING_CONFIG.SAVE_INDIVIDUAL_FILES) {
        await saveIndividualTrainingFile(trainingEntry);
      }
      
      // Optional: Log to console for testing (when files are disabled)
      if (AI_TRAINING_CONFIG.LOG_TO_CONSOLE) {
        console.log('🤖 AI Training Data:', {
          id: trainingEntry.id,
          method: requestContext.method,
          endpoint: requestContext.endpoint,
          intent: trainingEntry.conversation.user_intent,
          success: responseContext.success,
          duration: `${duration}ms`
        });
      }
      
    } catch (error) {
      console.error('❌ AI Training Logger Error:', error);
    }
  });
  
  next();
}

/**
 * Infer user intent from request
 */
function inferUserIntent(requestContext) {
  const { method, endpoint, body } = requestContext;
  
  // Map endpoints to user intents
  const intentMap = {
    '/api/login': 'authenticate to access the system',
    '/api/clientshiftrequests': method === 'POST' ? 'create a new shift request' : 'view shift requests',
    '/api/people/:id/qualifications': 'manage employee qualifications',
    '/api/my-qualifications': 'view my qualifications',
    '/api/available-client-shifts': 'find available shifts to work',
    '/api/my-shifts': 'view my assigned shifts'
  };
  
  // Try exact match first
  if (intentMap[endpoint]) {
    return intentMap[endpoint];
  }
  
  // Pattern matching for dynamic routes
  if (endpoint.includes('/qualifications')) {
    return 'work with employee qualifications';
  }
  if (endpoint.includes('/shifts')) {
    return 'manage work shifts';
  }
  if (endpoint.includes('/people')) {
    return 'manage employee information';
  }
  
  return `perform ${method.toLowerCase()} operation on ${endpoint}`;
}

/**
 * Generate system response description
 */
function generateSystemResponse(requestContext, responseContext) {
  if (responseContext.success) {
    return `Successfully ${requestContext.method.toLowerCase() === 'get' ? 'retrieved' : 'processed'} the request`;
  } else {
    return `Failed to process the request: ${responseContext.statusCode} error`;
  }
}

/**
 * Categorize endpoint for training
 */
function categorizeEndpoint(endpoint) {
  if (endpoint.includes('/auth') || endpoint.includes('/login')) return 'authentication';
  if (endpoint.includes('/shift')) return 'shift_management';
  if (endpoint.includes('/qualification')) return 'qualification_management';
  if (endpoint.includes('/people')) return 'employee_management';
  if (endpoint.includes('/client')) return 'client_management';
  return 'general';
}

/**
 * Calculate interaction complexity
 */
function calculateComplexity(requestContext) {
  let complexity = 1;
  
  if (requestContext.params && Object.keys(requestContext.params).length > 0) complexity++;
  if (requestContext.query && Object.keys(requestContext.query).length > 0) complexity++;
  if (requestContext.body && Object.keys(requestContext.body).length > 3) complexity++;
  if (requestContext.endpoint.split('/').length > 4) complexity++;
  
  if (complexity <= 2) return 'simple';
  if (complexity <= 4) return 'medium';
  return 'complex';
}

/**
 * Infer business domain
 */
function inferBusinessDomain(endpoint) {
  if (endpoint.includes('shift')) return 'workforce_scheduling';
  if (endpoint.includes('qualification')) return 'certification_management';
  if (endpoint.includes('client')) return 'client_relations';
  if (endpoint.includes('people') || endpoint.includes('employee')) return 'human_resources';
  return 'general_operations';
}

/**
 * Save individual training file for easier processing
 */
async function saveIndividualTrainingFile(trainingEntry) {
  try {
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const individualDir = path.join(AI_TRAINING_DIR, 'individual', dateStr);
    await fs.mkdir(individualDir, { recursive: true });
    
    const filename = `${trainingEntry.id}.json`;
    const filepath = path.join(individualDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(trainingEntry, null, 2));
  } catch (error) {
    console.error('Failed to save individual training file:', error);
  }
}

module.exports = {
  aiTrainingLogger,
  ensureAITrainingDir
};
