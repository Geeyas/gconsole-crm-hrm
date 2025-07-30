# Admin/Staff Email API Documentation

## Overview

The Admin/Staff Email API allows authorized users (System Admin and Staff - Standard User) to send emails directly from the web application. This functionality provides a professional email interface with custom templates that match the application's design.

## Endpoint

### POST `/api/admin/send-email`

Sends an email from an admin/staff user to a specified recipient.

#### Authentication
- **Required**: JWT Bearer Token
- **User Types**: System Admin, Staff - Standard User

#### Request Headers
```
Content-Type: application/json
Authorization: Bearer <jwt-token>
```

#### Request Body
```json
{
  "subject": "Email Subject",
  "message": "Email body content with support for line breaks and formatting",
  "recipientEmail": "recipient@example.com",
  "recipientName": "Recipient Name (optional)"
}
```

#### Request Body Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `subject` | string | Yes | Email subject line | 3-200 characters |
| `message` | string | Yes | Email body content | 5-5000 characters |
| `recipientEmail` | string | Yes | Recipient's email address | Valid email format |
| `recipientName` | string | No | Recipient's name | 1-100 characters, letters/spaces/hyphens only |

#### Response

**Success (200)**
```json
{
  "success": true,
  "message": "Email sent successfully.",
  "data": {
    "sentAt": "December 15, 2023 at 02:30 PM EST",
    "recipient": "John Doe",
    "subject": "Email Subject"
  }
}
```

**Error (400) - Validation Error**
```json
{
  "message": "Validation error",
  "errors": [
    {
      "field": "recipientEmail",
      "message": "Invalid recipient email format",
      "value": "invalid-email"
    }
  ]
}
```

**Error (401) - Unauthorized**
```json
{
  "success": false,
  "error": "Access denied. Admin or Staff privileges required."
}
```

**Error (500) - Server Error**
```json
{
  "success": false,
  "error": "Failed to send email. Please try again later."
}
```

## Email Template Features

The email template includes:

1. **Professional Header**: GConsole HRM branding with gradient logo
2. **Sender Information**: Displays sender name and email
3. **Recipient Information**: Shows recipient name and email
4. **Message Content**: Formatted message body with proper spacing
5. **Timestamp**: When the email was sent
6. **Footer**: Professional footer with system branding

## Security Features

- **Authentication Required**: Only authenticated users can access
- **Role-Based Access**: Only System Admin and Staff users can send emails
- **Input Validation**: Comprehensive validation of all input fields
- **Rate Limiting**: Inherits global rate limiting
- **Logging**: All email sends are logged with user information

## Usage Examples

### JavaScript/Fetch
```javascript
const sendEmail = async (emailData) => {
  const response = await fetch('/api/admin/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(emailData)
  });
  
  return response.json();
};

// Example usage
const emailData = {
  subject: 'Welcome to Our Team',
  message: 'Dear John,\n\nWelcome to our team! We are excited to have you on board.\n\nBest regards,\nHR Team',
  recipientEmail: 'john@example.com',
  recipientName: 'John Doe'
};

const result = await sendEmail(emailData);
```

### cURL
```bash
curl -X POST http://localhost:3000/api/admin/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subject": "Test Email",
    "message": "This is a test email from the admin panel.",
    "recipientEmail": "test@example.com",
    "recipientName": "Test User"
  }'
```

## Testing

Use the provided test script to verify the functionality:

```bash
# Set your JWT token
export TEST_JWT_TOKEN="your-jwt-token-here"

# Run the test
node scripts/test-admin-email.js
```

## Error Handling

The API provides detailed error messages for common issues:

- **Invalid email format**: Check recipient email format
- **Missing required fields**: Ensure all required fields are provided
- **Message too long**: Keep message under 5000 characters
- **Unauthorized access**: Ensure user has admin/staff privileges
- **Server errors**: Check email configuration and try again

## Logging

All email sends are logged with the following information:
- Sender name and email
- Recipient name and email
- Subject line
- Timestamp
- User ID
- Action type

This facilitates debugging and audit trails for email communications. 