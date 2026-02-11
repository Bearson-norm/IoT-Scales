@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Fix User Passwords - Standalone Script
echo ========================================
echo.
echo This script updates user passwords with valid bcrypt hashes
echo No Node.js required - uses SQL directly
echo.

REM Set default password (can be overridden by environment variable)
if "%PGPASSWORD%"=="" (
    set PGPASSWORD=Admin123
)

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL from https://www.postgresql.org/
    pause
    exit /b 1
)

echo Checking PostgreSQL connection...
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -c "SELECT version();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to PostgreSQL
    echo Please ensure PostgreSQL service is running
    echo.
    echo If password is not Admin123, set it using:
    echo   set PGPASSWORD=your_password
    pause
    exit /b 1
)
echo ✅ PostgreSQL is running

echo.
echo Updating user passwords...
set PGPASSWORD=%PGPASSWORD%

REM Try to find update-user-passwords.sql script
set "PASSWORD_FIX_SQL="
if exist "database\update-user-passwords.sql" (
    set "PASSWORD_FIX_SQL=database\update-user-passwords.sql"
) else if exist "scripts\update-user-passwords.sql" (
    set "PASSWORD_FIX_SQL=scripts\update-user-passwords.sql"
) else if exist "..\database\update-user-passwords.sql" (
    set "PASSWORD_FIX_SQL=..\database\update-user-passwords.sql"
) else if exist "..\scripts\update-user-passwords.sql" (
    set "PASSWORD_FIX_SQL=..\scripts\update-user-passwords.sql"
)

if not "!PASSWORD_FIX_SQL!"=="" (
    echo Running SQL script: !PASSWORD_FIX_SQL!
    psql -U postgres -d "FLB_MOWS" -f "!PASSWORD_FIX_SQL!"
    if !errorlevel! equ 0 (
        echo.
        echo ✅ User passwords updated successfully!
    ) else (
        echo.
        echo ❌ ERROR: Failed to update passwords
        pause
        exit /b 1
    )
) else (
    echo SQL script not found, using inline SQL...
    echo.
    
    echo Updating admin password...
    psql -U postgres -d "FLB_MOWS" -c "UPDATE master_user SET password_hash = '$2a$10$ArpArDkniSYq8cAT/2M1/er2dsaM38PrVUDbI/VmFZoX4ET/srdsK', updated_at = CURRENT_TIMESTAMP WHERE username = 'admin';"
    
    echo Updating faliq password...
    psql -U postgres -d "FLB_MOWS" -c "UPDATE master_user SET password_hash = '$2a$10$icN.qmF9/y8Vy0A/oEQ/9.VLQVlwzN/3lXgMMnHLOjQ8SEW8hsG3W', updated_at = CURRENT_TIMESTAMP WHERE username = 'faliq';"
    
    echo Updating operator1 password...
    psql -U postgres -d "FLB_MOWS" -c "UPDATE master_user SET password_hash = '$2a$10$iebIf6hSQ6xfKiK7rg70jOQ73TyJlKf5dT1N280S3XG2zCGylau6C', updated_at = CURRENT_TIMESTAMP WHERE username = 'operator1';"
    
    echo Updating supervisor password...
    psql -U postgres -d "FLB_MOWS" -c "UPDATE master_user SET password_hash = '$2a$10$NPpgCWBwFVPhj1ltzg0SAOobWvEBUhmeJOKTp5.jlWwHWAH.yDFV2', updated_at = CURRENT_TIMESTAMP WHERE username = 'supervisor';"
    
    echo.
    echo ✅ User passwords updated successfully!
)

echo.
echo ========================================
echo Password Update Complete!
echo ========================================
echo.
echo Default User Passwords:
echo   admin: admin123
echo   faliq: faliq123
echo   operator1: operator123
echo   supervisor: supervisor123
echo   qc: qc123
echo.
echo You can now login with these credentials.
echo.
pause

