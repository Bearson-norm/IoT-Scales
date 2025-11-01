@echo off
echo ========================================
echo IoT Scales V2 - Database Fix Script
echo ========================================
echo.

echo This script will help you fix the database setup issue.
echo.

echo Step 1: Testing PostgreSQL connection...
psql -U postgres -d postgres -c "SELECT version();"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Cannot connect to PostgreSQL
    echo Please check:
    echo 1. PostgreSQL service is running
    echo 2. Password is correct
    echo 3. PostgreSQL is installed properly
    echo.
    pause
    exit /b 1
)
echo PostgreSQL connection successful!

echo.
echo Step 2: Checking if database FLB_MOWS exists...
psql -U postgres -d FLB_MOWS -c "SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    echo Database FLB_MOWS already exists
    echo Do you want to recreate it? (y/n)
    set /p recreate=
    if /i "%recreate%"=="y" (
        echo Dropping existing database...
        psql -U postgres -c "DROP DATABASE FLB_MOWS;"
        if %errorlevel% neq 0 (
            echo ERROR: Could not drop database
            pause
            exit /b 1
        )
        echo Database dropped successfully
    ) else (
        echo Using existing database
        goto :import
    )
)

echo.
echo Step 3: Creating database FLB_MOWS...
psql -U postgres -c "CREATE DATABASE FLB_MOWS;"
if %errorlevel% neq 0 (
    echo ERROR: Failed to create database
    echo Please check PostgreSQL permissions
    pause
    exit /b 1
)
echo Database created successfully!

:import
echo.
echo Step 4: Importing database schema...
psql -U postgres -d FLB_MOWS -f database/schema.sql
if %errorlevel% neq 0 (
    echo ERROR: Failed to import schema
    echo Please check if database/schema.sql exists
    pause
    exit /b 1
)
echo Schema imported successfully!

echo.
echo Step 5: Verifying database setup...
psql -U postgres -d FLB_MOWS -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
if %errorlevel% neq 0 (
    echo ERROR: Database verification failed
    pause
    exit /b 1
)
echo Database setup completed successfully!

echo.
echo Database is ready! You can now run the application.
echo Run: npm run dev
echo.
pause

