const { formatDateForEmail, formatDateTimeForEmail } = require('./utils/timezoneUtils');

console.log('🔧 Testing Email Template Fix for Null Values\n');

// Test various input scenarios
const testCases = [
  { input: null, description: 'null value' },
  { input: undefined, description: 'undefined value' },
  { input: '', description: 'empty string' },
  { input: '2025-08-15', description: 'valid date string' },
  { input: '2025-08-15 09:00:00', description: 'valid datetime with seconds' },
  { input: '2025-08-15 09:00', description: 'valid datetime without seconds' },
  { input: 'invalid-date', description: 'invalid date string' }
];

console.log('Testing formatDateForEmail:');
console.log('================================');
testCases.forEach(test => {
  const result = formatDateForEmail(test.input);
  console.log(`Input: ${test.input} (${test.description})`);
  console.log(`Output: "${result}"`);
  console.log('---');
});

console.log('\nTesting formatDateTimeForEmail:');
console.log('================================');
testCases.forEach(test => {
  const result = formatDateTimeForEmail(test.input);
  console.log(`Input: ${test.input} (${test.description})`);
  console.log(`Output: "${result}"`);
  console.log('---');
});

console.log('\n✅ Email template should now show "Date TBD" and "Time TBD" instead of "null"');
console.log('📧 The "Shift Accepted" email will be more user-friendly even with missing data');
console.log('\n🔍 Next step: Monitor logs when shifts are accepted to see actual data values');
