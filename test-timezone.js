/**
 * Test script for timezone conversion functions
 */

const { 
  toUTC, 
  formatForMySQL, 
  utcToMelbourneForAPI, 
  formatDate, 
  formatDateTime 
} = require('./utils/timezoneUtils');

// Test cases
console.log('=== Timezone Conversion Test ===\n');

// Test 1: Date only
console.log('Test 1: Date only (YYYY-MM-DD)');
const testDate = '2025-01-15';
const utcDate = toUTC(testDate);
const mysqlDate = formatForMySQL(utcDate);
console.log(`Input: ${testDate}`);
console.log(`UTC Date: ${utcDate}`);
console.log(`MySQL Format: ${mysqlDate}`);
console.log(`Melbourne Time: ${utcToMelbourneForAPI(mysqlDate)}`);
console.log('');

// Test 2: Date and time
console.log('Test 2: Date and time (YYYY-MM-DD HH:mm)');
const testDateTime = '2025-01-15 14:30';
const utcDateTime = toUTC(testDateTime);
const mysqlDateTime = formatForMySQL(utcDateTime);
console.log(`Input: ${testDateTime}`);
console.log(`UTC DateTime: ${utcDateTime}`);
console.log(`MySQL Format: ${mysqlDateTime}`);
console.log(`Melbourne Time: ${utcToMelbourneForAPI(mysqlDateTime)}`);
console.log('');

// Test 3: Date and time with seconds
console.log('Test 3: Date and time with seconds (YYYY-MM-DD HH:mm:ss)');
const testDateTimeSec = '2025-01-15 14:30:45';
const utcDateTimeSec = toUTC(testDateTimeSec);
const mysqlDateTimeSec = formatForMySQL(utcDateTimeSec);
console.log(`Input: ${testDateTimeSec}`);
console.log(`UTC DateTime: ${utcDateTimeSec}`);
console.log(`MySQL Format: ${mysqlDateTimeSec}`);
console.log(`Melbourne Time: ${utcToMelbourneForAPI(mysqlDateTimeSec)}`);
console.log('');

// Test 4: Round trip conversion
console.log('Test 4: Round trip conversion');
const originalTime = '2025-01-15 14:30';
const utcTime = formatForMySQL(toUTC(originalTime));
const melbourneTime = utcToMelbourneForAPI(utcTime);
console.log(`Original (Melbourne): ${originalTime}`);
console.log(`Stored (UTC): ${utcTime}`);
console.log(`Retrieved (Melbourne): ${melbourneTime}`);
console.log('');

// Test 5: Different times of day
console.log('Test 5: Different times of day');
const times = [
  '2025-01-15 00:00', // Midnight
  '2025-01-15 06:00', // Early morning
  '2025-01-15 12:00', // Noon
  '2025-01-15 18:00', // Evening
  '2025-01-15 23:59'  // Late night
];

times.forEach(time => {
  const utc = formatForMySQL(toUTC(time));
  const melbourne = utcToMelbourneForAPI(utc);
  console.log(`${time} → ${utc} → ${melbourne}`);
});
console.log('');

// Test 6: Summer vs Winter (Melbourne has daylight saving)
console.log('Test 6: Summer vs Winter (Daylight Saving)');
const summerTime = '2025-01-15 14:30'; // Summer (AEDT)
const winterTime = '2025-07-15 14:30'; // Winter (AEST)

const summerUTC = formatForMySQL(toUTC(summerTime));
const winterUTC = formatForMySQL(toUTC(winterTime));

console.log(`Summer (Jan): ${summerTime} → ${summerUTC} → ${utcToMelbourneForAPI(summerUTC)}`);
console.log(`Winter (Jul): ${winterTime} → ${winterUTC} → ${utcToMelbourneForAPI(winterUTC)}`);
console.log('');

console.log('=== Test Complete ==='); 