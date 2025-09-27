// Check Attachments table structure
const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'testdb'
};

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
  
  // Describe the Attachments table structure
  connection.query('DESCRIBE Attachments', (error, results) => {
    if (error) {
      console.error('Error describing Attachments table:', error);
    } else {
      console.log('Attachments table structure:');
      console.table(results);
    }
    
    // Also try to get a sample row if any exist
    connection.query('SELECT * FROM Attachments LIMIT 1', (error, results) => {
      if (error) {
        console.error('Error querying Attachments table:', error);
      } else {
        console.log('Sample row from Attachments (if any):');
        console.log(results);
      }
      
      connection.end();
      process.exit(0);
    });
  });
});
