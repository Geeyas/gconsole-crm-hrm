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
    // If it's already a string in YYYY-MM-DD format, return as is
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // If it's a string with time, extract just the date part
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      return date.substring(0, 10);
    }
    // Fallback to Date object conversion
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
    // If it's already a string in YYYY-MM-DD HH:mm format, return as is
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) {
      return date;
    }
    // If it's a string with seconds, truncate to minutes
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
      return date.substring(0, 16);
    }
    // If it's just a date string, add default time
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return `${date} 00:00`;
    }
    // Fallback to Date object conversion
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

/**
 * Format date for email display (handles VARCHAR strings from database)
 * @param {string} dateString - Date string from database
 * @returns {string|null} - Formatted date for email or null if invalid
 */
function formatDateForEmail(dateString) {
  if (!dateString) return null;
  
  // If it's already a properly formatted date string, return as is
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // If it's a datetime string, extract just the date part
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    return dateString.substring(0, 10);
  }
  
  // Try to parse and format
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().substring(0, 10);
  } catch {
    return null;
  }
}

/**
 * Format datetime for email display (handles VARCHAR strings from database)
 * @param {string} dateTimeString - DateTime string from database
 * @returns {string|null} - Formatted datetime for email or null if invalid
 */
function formatDateTimeForEmail(dateTimeString) {
  if (!dateTimeString) return null;
  
  // If it's already a properly formatted datetime string, return as is
  if (typeof dateTimeString === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(dateTimeString)) {
    return dateTimeString;
  }
  
  // If it's a datetime string with seconds, truncate to minutes
  if (typeof dateTimeString === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateTimeString)) {
    return dateTimeString.substring(0, 16);
  }
  
  // If it's just a date string, add default time
  if (typeof dateTimeString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateTimeString)) {
    return `${dateTimeString} 00:00`;
  }
  
  // Try to parse and format
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().substring(0, 16).replace('T', ' ');
  } catch {
    return null;
  }
}

module.exports = {
  toUTC,
  formatForMySQL,
  utcToMelbourne,
  formatDate,
  formatDateTime,
  utcToMelbourneForAPI,
  formatDateForEmail,
  formatDateTimeForEmail
}; 