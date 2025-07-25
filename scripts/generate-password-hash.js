const bcrypt = require('bcrypt');

async function generateHash() {
  const password = process.argv[2];
  if (!password) {
    console.log('Usage: node generate-password-hash.js <password>');
    console.log('Example: node generate-password-hash.js "MySecurePass123!"');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    console.log('\n=== Generated bcrypt hash ===');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\n=== SQL Query ===');
    console.log(`UPDATE Users SET passwordhash = '${hash}', salt = NULL, updatedat = NOW() WHERE username = 'USERNAME_HERE';`);
    console.log('\n=== Or by email ===');
    console.log(`UPDATE Users SET passwordhash = '${hash}', salt = NULL, updatedat = NOW() WHERE email = 'EMAIL_HERE';`);
    console.log('\n=== Or by ID ===');
    console.log(`UPDATE Users SET passwordhash = '${hash}', salt = NULL, updatedat = NOW() WHERE id = USER_ID_HERE;`);
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateHash(); 