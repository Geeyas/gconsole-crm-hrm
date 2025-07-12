const { DateTime } = require('luxon');

/**
 * Convert a date/time value (assumed to be in Melbourne time) to UTC for database storage
 * @param {string|Date} val - Date/time value to convert
 * @returns {Date|null} - UTC Date object or null if invalid
 */
function toUTC(val) {
  if (!val) return null;
  // If only date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return DateTime.fromISO(val, { zone: 'Australia/Melbourne' }).toUTC().toJSDate();
  }
  // If date and time (YYYY-MM-DD HH:mm)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(val)) {
    return DateTime.fromFormat(val, 'yyyy-MM-dd HH:mm', { zone: 'Australia/Melbourne' }).toUTC().toJSDate();
  }
  // If date and time with seconds (YYYY-MM-DD HH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val)) {
    return DateTime.fromFormat(val, 'yyyy-MM-dd HH:mm:ss', { zone: 'Australia/Melbourne' }).toUTC().toJSDate();
  }
  // fallback
  return DateTime.fromISO(val, { zone: 'Australia/Melbourne' }).toUTC().toJSDate();
}

/**
 * Format a Date object for MySQL storage in UTC
 * @param {Date} dt - Date object
 * @returns {string|null} - MySQL datetime string in UTC or null if invalid
 */
function formatForMySQL(dt) {
  if (!dt || isNaN(dt.getTime())) return null;
  // Use luxon for formatting
  return DateTime.fromJSDate(dt, { zone: 'utc' }).toFormat('yyyy-MM-dd HH:mm:ss');
}

/**
 * Convert UTC datetime from database to Melbourne time
 * @param {string|Date} utcDateTime - UTC datetime from database
 * @returns {string|null} - Melbourne time in YYYY-MM-DD HH:mm:ss format or null if invalid
 */
function utcToMelbourne(utcDateTime) {
  if (!utcDateTime) return null;
  try {
    let dt;
    // Try parsing as MySQL datetime (yyyy-MM-dd HH:mm:ss)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(utcDateTime)) {
      dt = DateTime.fromSQL(utcDateTime, { zone: 'utc' });
    } else {
      dt = DateTime.fromISO(utcDateTime, { zone: 'utc' });
    }
    const mel = dt.setZone('Australia/Melbourne');
    return mel.toFormat('yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    console.error('Error converting UTC to Melbourne time:', error);
    return null;
  }
}

/**
 * Format date for display (YYYY-MM-DD)
 * @param {string|Date} date - Date to format
 * @returns {string|null} - Formatted date or null if invalid
 */
function formatDate(date) {
  if (!date) return null;
  try {
    return DateTime.fromJSDate(new Date(date)).toFormat('yyyy-MM-dd');
  } catch {
    return null;
  }
}

/**
 * Format datetime for display (YYYY-MM-DD HH:mm)
 * @param {string|Date} date - Date to format
 * @returns {string|null} - Formatted datetime or null if invalid
 */
function formatDateTime(date) {
  if (!date) return null;
  try {
    return DateTime.fromJSDate(new Date(date)).toFormat('yyyy-MM-dd HH:mm');
  } catch {
    return null;
  }
}

/**
 * Convert UTC datetime to Melbourne time for API response (YYYY-MM-DD HH:mm)
 * @param {string|Date} utcDateTime - UTC datetime from database
 * @returns {string|null} - Melbourne time in YYYY-MM-DD HH:mm format for API response
 */
function utcToMelbourneForAPI(utcDateTime) {
  const melbourneTime = utcToMelbourne(utcDateTime);
  if (!melbourneTime) return null;
  return melbourneTime.substring(0, 16);
}

module.exports = {
  toUTC,
  formatForMySQL,
  utcToMelbourne,
  formatDate,
  formatDateTime,
  utcToMelbourneForAPI
}; 