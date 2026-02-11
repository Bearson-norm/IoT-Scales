-- SQL script to update user passwords with valid bcrypt hashes
-- This script is part of database setup and does not require Node.js
-- Run this script to fix password hashes for existing users
-- 
-- IMPORTANT: 
-- 1. Default passwords are: admin123, faliq123, operator123, supervisor123
-- 2. After running this script, users should change their passwords through the application
-- 3. This script uses pre-generated bcrypt hashes that don't require Node.js

-- Update admin password: admin123
UPDATE master_user 
SET password_hash = '$2a$10$ArpArDkniSYq8cAT/2M1/er2dsaM38PrVUDbI/VmFZoX4ET/srdsK',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin';

-- Update faliq password: faliq123
UPDATE master_user 
SET password_hash = '$2a$10$icN.qmF9/y8Vy0A/oEQ/9.VLQVlwzN/3lXgMMnHLOjQ8SEW8hsG3W',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'faliq';

-- Update operator1 password: operator123
UPDATE master_user 
SET password_hash = '$2a$10$iebIf6hSQ6xfKiK7rg70jOQ73TyJlKf5dT1N280S3XG2zCGylau6C',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'operator1';

-- Update supervisor password: supervisor123
UPDATE master_user 
SET password_hash = '$2a$10$NPpgCWBwFVPhj1ltzg0SAOobWvEBUhmeJOKTp5.jlWwHWAH.yDFV2',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'supervisor';

-- Note: User 'qc' should already have a valid password hash (qc123)
-- If you need to update qc password, generate hash using Node.js script:
-- node scripts/generate-password-hash.js qc123
-- Then update the hash value in the UPDATE statement below:

-- Uncomment and update if needed:
-- UPDATE master_user 
-- SET password_hash = '<generated_hash_here>',
--     updated_at = CURRENT_TIMESTAMP
-- WHERE username = 'qc';

