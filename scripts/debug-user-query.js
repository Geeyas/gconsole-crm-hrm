const bcrypt = require('bcrypt');

async function generateDebugQueries() {
  const username = 'support@shiftly.net.au';
  const password = '#Password123';
  
  try {
    const hash = await bcrypt.hash(password, 12);
    
    console.log('=== Debug Queries for User: support@shiftly.net.au ===\n');
    
    console.log('1. First, let\'s check if the user exists:');
    console.log(`SELECT * FROM PROD_NLHC_TEST.Users WHERE username = '${username}';`);
    console.log(`SELECT * FROM PROD_NLHC_TEST.Users WHERE username LIKE '%${username}%';`);
    console.log(`SELECT * FROM PROD_NLHC_TEST.Users WHERE LOWER(username) = LOWER('${username}');\n`);
    
    console.log('2. Update query with exact case:');
    console.log(`UPDATE PROD_NLHC_TEST.Users 
SET passwordhash = '${hash}', 
    salt = NULL, 
    updatedat = NOW() 
WHERE username = '${username}';\n`);
    
    console.log('3. Update query with case-insensitive matching:');
    console.log(`UPDATE PROD_NLHC_TEST.Users 
SET passwordhash = '${hash}', 
    salt = NULL, 
    updatedat = NOW() 
WHERE LOWER(username) = LOWER('${username}');\n`);
    
    console.log('4. Update query by email (if username and email are the same):');
    console.log(`UPDATE PROD_NLHC_TEST.Users 
SET passwordhash = '${hash}', 
    salt = NULL, 
    updatedat = NOW() 
WHERE email = '${username}';\n`);
    
    console.log('5. Update query by ID (if you know the user ID):');
    console.log(`UPDATE PROD_NLHC_TEST.Users 
SET passwordhash = '${hash}', 
    salt = NULL, 
    updatedat = NOW() 
WHERE id = 2;\n`);
    
    console.log('=== Troubleshooting Steps ===');
    console.log('1. Run the SELECT queries first to confirm the user exists');
    console.log('2. Check for any hidden characters or spaces in the username');
    console.log('3. Try the case-insensitive version if the exact match fails');
    console.log('4. Use the email-based query if username and email are identical');
    console.log('5. Use the ID-based query as a last resort');
    
  } catch (error) {
    console.error('Error generating queries:', error);
  }
}

generateDebugQueries(); 