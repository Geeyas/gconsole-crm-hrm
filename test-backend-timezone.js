const { DateTime } = require('luxon');
const { toUTC, formatForMySQL, utcToMelbourneForAPI } = require('./utils/timezoneUtils');

// Simulate frontend sending a Melbourne time string
const melbourneTimeString = '2025-07-14 09:00';
console.log('Frontend sends (Melbourne time):', melbourneTimeString);

// Backend: parse as Melbourne time, convert to UTC, format for DB
const melbourneDT = DateTime.fromFormat(melbourneTimeString, 'yyyy-MM-dd HH:mm', { zone: 'Australia/Melbourne' });
const utcDT = melbourneDT.toUTC();
const dbValue = utcDT.toISO();
console.log('Backend stores (UTC):', dbValue);

// Simulate DB retrieval: get UTC value, convert back to Melbourne
const retrievedMelbourne = DateTime.fromISO(dbValue, { zone: 'utc' }).setZone('Australia/Melbourne').toFormat('yyyy-MM-dd HH:mm');
console.log('Backend returns to frontend (Melbourne time):', retrievedMelbourne);

// Use project utility for API output
const utilMelbourne = utcToMelbourneForAPI(dbValue);
console.log('Backend returns to frontend (using utcToMelbourneForAPI):', utilMelbourne);

// Check round-trip
if (retrievedMelbourne === melbourneTimeString && utilMelbourne === melbourneTimeString) {
  console.log('✅ Round-trip test PASSED: Time is preserved correctly.');
} else {
  console.log('❌ Round-trip test FAILED: Time mismatch!');
  console.log('Expected:', melbourneTimeString, 'Got:', retrievedMelbourne, utilMelbourne);
} 