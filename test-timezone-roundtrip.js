const { toUTC, formatForMySQL, utcToMelbourneForAPI } = require('./utils/timezoneUtils');

const melbourneTimeString = '2025-07-20 07:00';
console.log('Frontend sends (Melbourne time):', melbourneTimeString);

// Backend: parse as Melbourne time, convert to UTC, format for DB
const utcDateObj = toUTC(melbourneTimeString);
const dbValue = formatForMySQL(utcDateObj);
console.log('Backend stores (UTC for DB):', dbValue);

// Simulate DB retrieval: get UTC value, convert back to Melbourne
const melbourneFromDb = utcToMelbourneForAPI(dbValue);
console.log('Backend returns to frontend (Melbourne time):', melbourneFromDb);

if (melbourneFromDb === melbourneTimeString) {
  console.log('✅ Round-trip test PASSED: Time is preserved correctly.');
} else {
  console.log('❌ Round-trip test FAILED: Time mismatch!');
  console.log('Expected:', melbourneTimeString, 'Got:', melbourneFromDb);
} 