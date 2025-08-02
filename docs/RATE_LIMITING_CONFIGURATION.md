# Rate Limiting Configuration

## Overview
This document outlines the rate limiting strategy implemented to provide appropriate limits for different types of API endpoints while maintaining security for critical operations.

## Rate Limiter Types

### 1. General Limiter (Default)
- **Window**: 5 minutes
- **Limit**: 150 requests per IP
- **Applied to**: All endpoints not covered by specific limiters
- **Purpose**: Basic protection for general API usage

### 2. Operational Limiter (High-Volume APIs)
- **Window**: 5 minutes  
- **Limit**: 500 requests per IP
- **Applied to**:
  - `/api/timesheets/*` - Timesheet operations
  - `/api/shifts/*` - Shift management
  - `/api/client-shifts/*` - Client shift operations
  - `/api/users/*` - User data operations
  - `/api/my-profile/*` - Profile operations
  - `/api/people/*` - People/employee data
- **Purpose**: Support high-frequency operational workflows

### 3. Authentication Limiter (Security Critical)
- **Window**: 1 minute
- **Limit**: 5 requests per IP
- **Applied to**:
  - `/api/login`
  - `/api/register`
- **Purpose**: Prevent brute force attacks and abuse

### 4. Admin Limiter (Administrative Operations)
- **Window**: 5 minutes
- **Limit**: 300 requests per IP
- **Applied to**:
  - `/api/admin/*` - All admin endpoints
- **Purpose**: Moderate limits for admin operations

### 5. Sensitive Operations Limiter
- **Window**: 5 minutes
- **Limit**: 10 requests per IP
- **Applied to**:
  - `/api/forgot-password`
  - `/api/reset-password`
  - `/api/contact-admin`
- **Purpose**: Protect sensitive operations from abuse

## Implementation Benefits

### ✅ Improved User Experience
- **Timesheets**: 500 requests/5min (vs 100 previously)
- **Shifts**: 500 requests/5min (vs 100 previously)
- **User Data**: 500 requests/5min (vs 100 previously)
- **General APIs**: 150 requests/5min (vs 100 previously)

### ✅ Maintained Security
- **Login/Register**: Still strict at 5 requests/minute
- **Password Reset**: Limited to 10 requests/5min
- **Contact Admin**: Limited to 10 requests/5min

### ✅ Balanced Admin Operations
- **Admin Panel**: 300 requests/5min for efficient management

## Rate Limit Headers

All rate limiters include standard headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when limit resets
- `Retry-After`: Seconds to wait if limit exceeded

## Error Responses

### Operational APIs (500 limit exceeded):
```json
{
  "message": "Too many operational requests, try again in 5 minutes."
}
```

### Authentication APIs (5 limit exceeded):
```json
{
  "error": "Too many login/register attempts, please try again later."
}
```

### Sensitive Operations (10 limit exceeded):
```json
{
  "error": "Too many sensitive operation attempts, please try again later."
}
```

## Configuration Location

Rate limiters are configured in `server.js` lines 43-75 and applied in lines 130-145.

## Monitoring

Monitor rate limit effectiveness through:
1. Application logs showing rate limit hits
2. Response headers on API calls
3. User feedback on API responsiveness
4. Server performance metrics

## Future Considerations

Consider implementing:
1. **User-based rate limiting** (per authenticated user vs per IP)
2. **Dynamic rate limiting** based on server load
3. **API key-based rate limiting** for premium access
4. **Whitelist IPs** for trusted sources
