-- ========================================
-- Setup Database KMI_MOWS
-- ========================================
-- Superuser: postgres
-- User: admin
-- Password: admin123
-- ========================================

-- Drop database if exists
DROP DATABASE IF EXISTS "KMI_MOWS";

-- Create database
CREATE DATABASE "KMI_MOWS";

-- Drop user if exists
DROP USER IF EXISTS admin;

-- Create user admin with password
CREATE USER admin WITH PASSWORD 'admin123';

-- Grant privileges on database
GRANT ALL PRIVILEGES ON DATABASE "KMI_MOWS" TO admin;

-- Connect to KMI_MOWS database
\c KMI_MOWS

-- Grant privileges on schema
GRANT ALL ON SCHEMA public TO admin;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO admin;

-- Display success message
\echo '========================================'
\echo 'Database KMI_MOWS created successfully!'
\echo 'User admin created with password: admin123'
\echo '========================================'
\echo ''
\echo 'Next steps:'
\echo '1. Import schema: psql -U postgres -d KMI_MOWS -f database\schema.sql'
\echo '2. Import core schema: psql -U postgres -d KMI_MOWS -f database\init\01-core-schema.sql'
\echo '3. Import weighing tables: psql -U postgres -d KMI_MOWS -f database\init\02-weighing.sql'
\echo '4. Grant privileges: psql -U postgres -d KMI_MOWS -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;"'
\echo ''
