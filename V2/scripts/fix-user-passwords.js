// Script to fix user passwords in database
// This script will update all users with placeholder password hashes
// Usage: node scripts/fix-user-passwords.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'FLB_MOWS',
  password: process.env.DB_PASSWORD || 'Admin123',
  port: process.env.DB_PORT || 5432,
});

// Default passwords for each user (users should change these after login)
const userPasswords = {
  'admin': 'admin123',
  'faliq': 'faliq123',
  'operator1': 'operator123',
  'supervisor': 'supervisor123',
  'qc': 'qc123' // Keep existing qc password
};

async function fixUserPasswords() {
  try {
    console.log('🔍 Checking users in database...');
    
    // Get all users
    const result = await pool.query(
      'SELECT username, password_hash FROM master_user WHERE status = $1',
      ['active']
    );

    console.log(`Found ${result.rows.length} active users`);

    for (const user of result.rows) {
      const username = user.username.toLowerCase();
      const currentHash = user.password_hash;

      // Check if hash is a placeholder (contains 'example_hash' or is invalid)
      const isPlaceholder = currentHash.includes('example_hash') || 
                           (!currentHash.startsWith('$2a$') && 
                            !currentHash.startsWith('$2b$'));

      if (isPlaceholder || userPasswords[username]) {
        const password = userPasswords[username];
        if (!password) {
          console.log(`⚠️  No password defined for user: ${username}, skipping...`);
          continue;
        }

        console.log(`🔐 Updating password for user: ${username}...`);
        
        // Generate new hash
        const newHash = await bcrypt.hash(password, 10);

        // Update in database
        await pool.query(
          'UPDATE master_user SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2',
          [newHash, username]
        );

        console.log(`✅ Password updated for user: ${username}`);
      } else {
        console.log(`✓ User ${username} already has a valid password hash, skipping...`);
      }
    }

    console.log('\n✅ Password update completed!');
    console.log('\n📋 Default passwords:');
    Object.entries(userPasswords).forEach(([username, password]) => {
      console.log(`   ${username}: ${password}`);
    });
    console.log('\n⚠️  IMPORTANT: Users should change their passwords after first login!');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixUserPasswords();

