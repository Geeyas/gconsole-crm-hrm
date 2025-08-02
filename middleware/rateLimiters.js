const rateLimit = require('express-rate-limit');

// ====================
// RATE LIMITING TIERS
// ====================

// 🔒 TIER 1: CRITICAL SECURITY ENDPOINTS (Most Restrictive)
// For login, register, password reset, etc.
const criticalSecurityLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Max 5 requests per IP per minute
  message: { 
    error: 'Too many security-related attempts, please try again later.',
    code: 'SECURITY_RATE_LIMIT_EXCEEDED',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + User-Agent for better security
    return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  }
});

// 🛡️ TIER 2: SENSITIVE OPERATIONS (Moderate Restrictions)  
// For admin actions, user creation, data modifications
const sensitiveOperationsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Max 50 requests per IP per 5 minutes
  message: { 
    error: 'Too many sensitive operations, please slow down.',
    code: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 📊 TIER 3: OPERATIONAL DATA ACCESS (Higher Limits)
// For timesheets, shifts, user details, reports, etc.
const operationalDataLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes  
  max: 500, // Max 500 requests per IP per 5 minutes (100 requests/minute)
  message: { 
    error: 'API rate limit exceeded. Please reduce request frequency.',
    code: 'OPERATIONAL_RATE_LIMIT_EXCEEDED',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🚀 TIER 4: PUBLIC/READ-ONLY ENDPOINTS (Most Permissive)
// For health checks, documentation, public data
const publicEndpointsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Max 200 requests per IP per minute
  message: { 
    error: 'Public API rate limit exceeded.',
    code: 'PUBLIC_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 📧 TIER 5: CONTACT/EMAIL ENDPOINTS (Special Case)
// For contact forms, notifications
const contactEmailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Max 10 requests per IP per 10 minutes
  message: { 
    error: 'Too many contact requests, please try again later.',
    code: 'CONTACT_RATE_LIMIT_EXCEEDED',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔧 DEFAULT FALLBACK LIMITER
// For any endpoints not explicitly categorized
const defaultLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // Max 200 requests per IP per 5 minutes
  message: { 
    error: 'API rate limit exceeded.',
    code: 'DEFAULT_RATE_LIMIT_EXCEEDED',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ====================
// RATE LIMITER MAPPING
// ====================

const rateLimiterMap = {
  // 🔒 CRITICAL SECURITY (Tier 1)
  critical: criticalSecurityLimiter,
  security: criticalSecurityLimiter,
  auth: criticalSecurityLimiter,
  
  // 🛡️ SENSITIVE OPERATIONS (Tier 2)
  sensitive: sensitiveOperationsLimiter,
  admin: sensitiveOperationsLimiter,
  
  // 📊 OPERATIONAL DATA (Tier 3) - Your requested higher limits
  operational: operationalDataLimiter,
  data: operationalDataLimiter,
  
  // 🚀 PUBLIC ENDPOINTS (Tier 4)
  public: publicEndpointsLimiter,
  
  // 📧 CONTACT/EMAIL (Tier 5)
  contact: contactEmailLimiter,
  email: contactEmailLimiter,
  
  // 🔧 DEFAULT FALLBACK
  default: defaultLimiter
};

// Helper function to get appropriate rate limiter
function getRateLimiter(tier = 'default') {
  return rateLimiterMap[tier] || defaultLimiter;
}

module.exports = {
  // Individual limiters
  criticalSecurityLimiter,
  sensitiveOperationsLimiter,
  operationalDataLimiter,
  publicEndpointsLimiter,
  contactEmailLimiter,
  defaultLimiter,
  
  // Helper functions
  getRateLimiter,
  rateLimiterMap,
  
  // Legacy exports for backward compatibility
  authLimiter: criticalSecurityLimiter,
  limiter: defaultLimiter
};
