@echo off
echo ========================================
echo IoT Scales V2 - Quick Database Fix
echo ========================================
echo.

echo This will fix the database setup issue step by step.
echo.

echo Step 1: Connect to PostgreSQL and create database...
echo Please enter your PostgreSQL password when prompted:
psql -U postgres -c "DROP DATABASE IF EXISTS FLB_MOWS;"
psql -U postgres -c "CREATE DATABASE FLB_MOWS;"

if %errorlevel% neq 0 (
    echo ERROR: Failed to create database
    echo Please check your PostgreSQL password and try again
    pause
    exit /b 1
)

echo Database created successfully!

echo.
echo Step 2: Import schema...
psql -U postgres -d FLB_MOWS -f database/schema.sql

if %errorlevel% neq 0 (
    echo ERROR: Failed to import schema
    echo Please check the schema file
    pause
    exit /b 1
)

echo Schema imported successfully!

echo.
echo Step 3: Verify database...
psql -U postgres -d FLB_MOWS -c "SELECT 'Database setup completed!' as status;"

echo.
echo Database setup completed! You can now run the application.
echo Run: npm run dev
echo.
pause

