@echo off
echo ========================================
echo IoT Scales V2 - Setup Script (Windows)
echo ========================================
echo.

echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js is installed.

echo.
echo [2/6] Checking PostgreSQL installation...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL not found. Please install PostgreSQL from https://www.postgresql.org/
    pause
    exit /b 1
)
echo PostgreSQL is installed.

echo.
echo [3/6] Installing application dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully.

echo.
echo [4/6] Setting up database...
echo Please enter PostgreSQL password when prompted:

REM Drop any existing database (case insensitive)
psql -U postgres -c "DROP DATABASE IF EXISTS flb_mows;" 2>nul
psql -U postgres -c "DROP DATABASE IF EXISTS FLB_MOWS;" 2>nul
psql -U postgres -c "DROP DATABASE IF EXISTS \"FLB_MOWS\";" 2>nul

REM Create database with proper case
psql -U postgres -c "CREATE DATABASE \"FLB_MOWS\";" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Failed to create database FLB_MOWS
    echo Please check PostgreSQL connection and try again
    pause
    exit /b 1
)
echo Database FLB_MOWS created successfully

echo.
echo [5/6] Importing database schema...
psql -U postgres -d FLB_MOWS -f database/schema.sql
if %errorlevel% neq 0 (
    echo ERROR: Failed to import database schema
    echo Please check database connection and try again
    pause
    exit /b 1
)
echo Database schema imported successfully.

echo.
echo [6/6] Starting application...
echo Application will start at http://localhost:3000
echo Press Ctrl+C to stop the application
echo.
call npm run dev

pause
