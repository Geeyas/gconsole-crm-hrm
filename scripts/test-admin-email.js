// scripts/test-admin-email.js
// Test script for admin email functionality

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test data for admin email
const testEmailData = {
  subject: 'Test Email from Admin',
  message: 'This is a test email sent from the admin/staff email functionality.\n\nThis email contains:\n- Subject line\n- Message body\n- Sender information\n- Timestamp\n\nPlease confirm receipt of this test email.',
  recipientEmail: 'test@example.com',
  recipientName: 'Test Recipient'
};

// You'll need to get a valid JWT token first
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'your-jwt-token-here';

async function testAdminEmail() {
  try {
    console.log('🧪 Testing Admin Email Functionality...');
    console.log('📧 Email Data:', JSON.stringify(testEmailData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/api/admin/send-email`, testEmailData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    
    console.log('✅ Test successful!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed!');
    if (error.response) {
      console.error('📊 Error Response:', JSON.stringify(error.response.data, null, 2));
      console.error('🔢 Status Code:', error.response.status);
    } else {
      console.error('🚨 Network Error:', error.message);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  if (!JWT_TOKEN || JWT_TOKEN === 'your-jwt-token-here') {
    console.error('❌ Please set TEST_JWT_TOKEN environment variable with a valid JWT token');
    console.log('💡 You can get a JWT token by logging in through the API');
    process.exit(1);
  }
  
  testAdminEmail();
}

module.exports = { testAdminEmail }; 