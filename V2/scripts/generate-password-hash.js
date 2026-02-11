// Script to generate bcrypt password hashes for database
// Usage: node scripts/generate-password-hash.js <password>
// This will output the bcrypt hash that can be used in SQL UPDATE statements

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generate-password-hash.js <password>');
  console.error('Example: node scripts/generate-password-hash.js admin123');
  process.exit(1);
}

// Generate hash with 10 rounds (default)
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL UPDATE statement:');
  console.log(`UPDATE master_user SET password_hash = '${hash}' WHERE username = '<username>';`);
});

