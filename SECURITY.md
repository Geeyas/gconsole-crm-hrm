# Security Documentation

## Overview

This document outlines the security measures implemented in the GConsole HRM API to ensure the protection of sensitive data and system integrity.

## Security Features

### 🔐 Authentication & Authorization

- **JWT-based Authentication**: Secure token-based authentication with configurable expiration
- **Role-Based Access Control (RBAC)**: Multiple user types with specific permissions
- **Password Security**: bcrypt hashing with 12 salt rounds for password storage
- **Session Management**: Token refresh mechanism and secure session handling

### 🛡️ Input Validation & Sanitization

- **Comprehensive Validation**: All user inputs are validated using express-validator
- **SQL Injection Prevention**: Parameterized queries throughout the application
- **XSS Protection**: Input sanitization and output encoding
- **Request Size Limits**: 10MB limit on request payloads

### 🔒 API Security

- **Rate Limiting**: 
  - General endpoints: 100 requests per 5 minutes
  - Authentication endpoints: 5 requests per minute
- **CORS Configuration**: Whitelisted domains only
- **Security Headers**: Helmet.js for comprehensive security headers
- **Request Logging**: Comprehensive request/response logging with sensitive data redaction

### 🗄️ Database Security

- **Connection Pooling**: Efficient and secure database connections
- **Parameterized Queries**: All database queries use prepared statements
- **Soft Delete**: Data integrity through soft deletion
- **Connection Health Checks**: Regular database connectivity monitoring

### 📧 Email Security

- **SMTP Configuration**: Secure email delivery using Gmail SMTP
- **Template Sanitization**: All email templates sanitize user input
- **Environment Variables**: Sensitive email credentials stored securely

## Environment Variables

### Required Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# Database Configuration
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name

# Email Configuration
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Optional Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Refresh (recommended)
REFRESH_TOKEN_SECRET=your-refresh-token-secret
```

## Security Best Practices

### Password Requirements

- Minimum 8 characters
- Must include uppercase and lowercase letters
- Must include numbers
- Must include special characters

### JWT Token Security

- Access tokens expire after 2 hours
- Refresh tokens for extended sessions
- Secure token storage and transmission

### Database Security

- Use strong, unique passwords
- Limit database user permissions
- Regular backups
- Monitor for suspicious activities

### API Security

- Use HTTPS in production
- Implement proper error handling
- Log security events
- Regular security audits

## Security Audit

Run the security audit script to check for potential issues:

```bash
npm run audit
```

This will check:
- Environment variable configuration
- Dependency vulnerabilities
- Code security issues
- File permissions
- Security best practices

## Monitoring & Logging

### Request Logging

All requests are logged with:
- Request ID for tracking
- User information (when authenticated)
- Request method and URL
- Response status and duration
- Sanitized request body (sensitive data redacted)

### Error Logging

Errors are logged with:
- Full error details
- Request context
- User information
- Stack traces for debugging

### Security Events

The following events are logged:
- Failed login attempts
- Unauthorized access attempts
- Rate limit violations
- Database connection issues
- Validation errors

## Incident Response

### Security Breach Response

1. **Immediate Actions**
   - Isolate affected systems
   - Preserve evidence
   - Assess scope of breach

2. **Investigation**
   - Review logs for suspicious activity
   - Identify root cause
   - Document findings

3. **Recovery**
   - Patch vulnerabilities
   - Reset compromised credentials
   - Restore from clean backups

4. **Post-Incident**
   - Update security measures
   - Review and improve procedures
   - Notify stakeholders if required

## Compliance

### Data Protection

- Personal data is encrypted at rest
- Secure transmission protocols
- Access controls and audit trails
- Data retention policies

### Privacy

- Minimal data collection
- User consent for data processing
- Right to data deletion
- Transparent privacy practices

## Security Checklist

### Before Deployment

- [ ] All environment variables configured
- [ ] Strong JWT secrets generated
- [ ] Database security configured
- [ ] HTTPS certificates installed
- [ ] Security audit passed
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Backup strategy in place

### Regular Maintenance

- [ ] Dependency updates
- [ ] Security patches applied
- [ ] Log review and analysis
- [ ] Performance monitoring
- [ ] Security audit runs
- [ ] Backup verification
- [ ] Access control review

## Contact

For security-related issues or questions:

- **Security Team**: security@gconsole.com
- **Emergency Contact**: +1-XXX-XXX-XXXX
- **Bug Reports**: Use the security audit script or contact the development team

## Updates

This security documentation is regularly updated to reflect current security measures and best practices. Last updated: [Current Date] 