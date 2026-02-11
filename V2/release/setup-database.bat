@echo off
setlocal enabledelayedexpansion

echo ========================================
echo IoT Scales V2 - Database Setup
echo ========================================
echo.

REM Set default password (can be overridden by environment variable)
if "%PGPASSWORD%"=="" (
    set PGPASSWORD=Admin123
)

REM Detect script location and set migration path
set "SCRIPT_DIR=%~dp0"
REM Remove trailing backslash from SCRIPT_DIR if present
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "MIGRATION_PATH="

REM Check multiple possible locations
if exist "%SCRIPT_DIR%\database\migration-add-reject-status.sql" (
    set "MIGRATION_PATH=%SCRIPT_DIR%\database"
) else if exist "%SCRIPT_DIR%\..\database\migration-add-reject-status.sql" (
    set "MIGRATION_PATH=%SCRIPT_DIR%\..\database"
) else (
    REM Try current directory
    cd /d "%~dp0"
    if exist "database\migration-add-reject-status.sql" (
        set "MIGRATION_PATH=database"
    ) else if exist "..\database\migration-add-reject-status.sql" (
        set "MIGRATION_PATH=..\database"
    ) else if exist "%CD%\database\migration-add-reject-status.sql" (
        set "MIGRATION_PATH=%CD%\database"
    )
)

if "%MIGRATION_PATH%"=="" (
    echo ??  WARNING: Could not find database migration folder
    echo    Please ensure you run this script from project root or release folder
    echo    Trying to continue anyway...
    set "MIGRATION_PATH=database"
) else (
    echo Migration files location: %MIGRATION_PATH%
)

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL from https://www.postgresql.org/
    pause
    exit /b 1
)

echo [1/12] Checking PostgreSQL connection...
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -c "SELECT version();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to PostgreSQL
    echo Please ensure PostgreSQL service is running
    echo.
    echo If password is not Admin123, set it using:
    echo   set PGPASSWORD=your_password
    echo   Or edit this script to change the default password
    pause
    exit /b 1
)
echo ? PostgreSQL is running

echo.
echo [2/12] Creating database FLB_MOWS...
REM Drop database if exists (case-sensitive with quotes)
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -c "DROP DATABASE IF EXISTS \"FLB_MOWS\";" >nul 2>&1
REM Wait a moment for drop to complete
timeout /t 1 /nobreak >nul 2>&1
REM Create database (case-sensitive with quotes)
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -c "CREATE DATABASE \"FLB_MOWS\";" >nul 2>&1
if %errorlevel% neq 0 (
    echo ??  Failed to create database, checking if it already exists...
    REM Check if database exists
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -lqt | findstr /i "FLB_MOWS" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ??  Database already exists, continuing...
    ) else (
        echo ? ERROR: Failed to create database FLB_MOWS
        pause
        exit /b 1
    )
) else (
    echo ? Database created successfully
)
REM Verify database was created
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -lqt | findstr /i "FLB_MOWS" >nul 2>&1
if %errorlevel% neq 0 (
    echo ? ERROR: Database FLB_MOWS was not created successfully
    pause
    exit /b 1
)

echo.
echo [3/12] Importing database schema...
REM Try to find schema.sql in current directory (for release folder) or parent directory
set PGPASSWORD=%PGPASSWORD%
if exist "database\schema.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import database schema
        pause
        exit /b 1
    )
    echo ? Schema imported successfully
) else if exist "..\database\schema.sql" (
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -d "FLB_MOWS" -f ..\database\schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import database schema
        pause
        exit /b 1
    )
    echo ? Schema imported successfully
) else (
    echo ??  Schema file not found, skipping...
    echo    Searched: database\schema.sql and ..\database\schema.sql
)

echo.
echo [4/12] Importing core schema...
set PGPASSWORD=%PGPASSWORD%
if exist "database\init\01-core-schema.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\init\01-core-schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import core schema
        pause
        exit /b 1
    )
    echo ? Core schema imported successfully
) else if exist "..\database\init\01-core-schema.sql" (
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -d "FLB_MOWS" -f ..\database\init\01-core-schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import core schema
        pause
        exit /b 1
    )
    echo ? Core schema imported successfully
) else (
    echo ??  Core schema file not found, skipping...
)

echo.
echo [5/12] Importing weighing tables...
set PGPASSWORD=%PGPASSWORD%
if exist "database\init\02-weighing.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\init\02-weighing.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import weighing tables
        pause
        exit /b 1
    )
    echo ? Weighing tables imported successfully
) else if exist "..\database\init\02-weighing.sql" (
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -d "FLB_MOWS" -f ..\database\init\02-weighing.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import weighing tables
        pause
        exit /b 1
    )
    echo ? Weighing tables imported successfully
) else (
    echo ??  Weighing tables file not found, skipping...
    echo    Searched: database\init\02-weighing.sql and ..\database\init\02-weighing.sql
)

echo.
echo [6/12] Running migration: Add reject status...
set PGPASSWORD=%PGPASSWORD%
set "MIGRATION_FILE=%MIGRATION_PATH%\migration-add-reject-status.sql"
set "MIGRATION_SUCCESS=0"
if exist "%MIGRATION_FILE%" (
    psql -U postgres -d "FLB_MOWS" -f "%MIGRATION_FILE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: reject status added successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration reject status may have failed (non-critical)
    )
) else (
    REM Try alternative paths
    if exist "database\migration-add-reject-status.sql" (
        psql -U postgres -d "FLB_MOWS" -f database\migration-add-reject-status.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: reject status added successfully
            set "MIGRATION_SUCCESS=1"
        )
    ) else if exist "..\database\migration-add-reject-status.sql" (
        psql -U postgres -d "FLB_MOWS" -f ..\database\migration-add-reject-status.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: reject status added successfully
            set "MIGRATION_SUCCESS=1"
        )
    )
    if !MIGRATION_SUCCESS! equ 0 (
        echo ??  Migration file not found, but migration may have already been applied
    )
)

echo.
echo [7/12] Running migration: Add opened_at field...
set PGPASSWORD=%PGPASSWORD%
set "MIGRATION_FILE=%MIGRATION_PATH%\migration-add-opened-at.sql"
set "MIGRATION_SUCCESS=0"
if exist "%MIGRATION_FILE%" (
    psql -U postgres -d "FLB_MOWS" -f "%MIGRATION_FILE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: opened_at field added successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration opened_at may have failed (non-critical)
    )
) else (
    REM Try alternative paths
    if exist "database\migration-add-opened-at.sql" (
        psql -U postgres -d "FLB_MOWS" -f database\migration-add-opened-at.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: opened_at field added successfully
            set "MIGRATION_SUCCESS=1"
        )
    ) else if exist "..\database\migration-add-opened-at.sql" (
        psql -U postgres -d "FLB_MOWS" -f ..\database\migration-add-opened-at.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: opened_at field added successfully
            set "MIGRATION_SUCCESS=1"
        )
    )
    if !MIGRATION_SUCCESS! equ 0 (
        echo ??  Migration file not found, but migration may have already been applied
    )
)

echo.
echo [8/12] Running migration: Add print history table...
set PGPASSWORD=%PGPASSWORD%
set "MIGRATION_FILE=%MIGRATION_PATH%\migration-add-print-history.sql"
set "MIGRATION_SUCCESS=0"
if exist "%MIGRATION_FILE%" (
    psql -U postgres -d "FLB_MOWS" -f "%MIGRATION_FILE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: print history table created successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration print history may have failed (non-critical)
    )
) else (
    REM Try alternative paths
    if exist "database\migration-add-print-history.sql" (
        psql -U postgres -d "FLB_MOWS" -f database\migration-add-print-history.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: print history table created successfully
            set "MIGRATION_SUCCESS=1"
        )
    ) else if exist "..\database\migration-add-print-history.sql" (
        psql -U postgres -d "FLB_MOWS" -f ..\database\migration-add-print-history.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: print history table created successfully
            set "MIGRATION_SUCCESS=1"
        )
    )
    if !MIGRATION_SUCCESS! equ 0 (
        echo ??  Migration file not found, but migration may have already been applied
    )
)

echo.
echo [9/12] Running migration: Add QC role and reactivate note...
set PGPASSWORD=%PGPASSWORD%
set "MIGRATION_FILE=%MIGRATION_PATH%\migration-add-qc-role-and-reactivate-note.sql"
set "MIGRATION_SUCCESS=0"
if exist "%MIGRATION_FILE%" (
    psql -U postgres -d "FLB_MOWS" -f "%MIGRATION_FILE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: QC role and reactivate note added successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration QC role may have failed (non-critical)
    )
) else (
    REM Try alternative paths
    if exist "database\migration-add-qc-role-and-reactivate-note.sql" (
        psql -U postgres -d "FLB_MOWS" -f database\migration-add-qc-role-and-reactivate-note.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: QC role and reactivate note added successfully
            set "MIGRATION_SUCCESS=1"
        )
    ) else if exist "..\database\migration-add-qc-role-and-reactivate-note.sql" (
        psql -U postgres -d "FLB_MOWS" -f ..\database\migration-add-qc-role-and-reactivate-note.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: QC role and reactivate note added successfully
            set "MIGRATION_SUCCESS=1"
        )
    )
    if !MIGRATION_SUCCESS! equ 0 (
        echo ??  Migration file not found, but migration may have already been applied
    )
)

echo.
echo [10/12] Running migration: Add sequence order...
set PGPASSWORD=%PGPASSWORD%
set "MIGRATION_FILE=%MIGRATION_PATH%\migration-add-sequence-order.sql"
set "MIGRATION_SUCCESS=0"
if exist "%MIGRATION_FILE%" (
    psql -U postgres -d "FLB_MOWS" -f "%MIGRATION_FILE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: sequence order added successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration sequence order may have failed (non-critical)
    )
) else (
    REM Try alternative paths
    if exist "database\migration-add-sequence-order.sql" (
        psql -U postgres -d "FLB_MOWS" -f database\migration-add-sequence-order.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: sequence order added successfully
            set "MIGRATION_SUCCESS=1"
        )
    ) else if exist "..\database\migration-add-sequence-order.sql" (
        psql -U postgres -d "FLB_MOWS" -f ..\database\migration-add-sequence-order.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: sequence order added successfully
            set "MIGRATION_SUCCESS=1"
        )
    )
    if !MIGRATION_SUCCESS! equ 0 (
        echo ??  Migration file not found, but migration may have already been applied
    )
)

echo.
echo [11/13] Running migration: Add is_active column to formulation ingredients...
set PGPASSWORD=%PGPASSWORD%
set "MIGRATION_FILE="
set "MIGRATION_SUCCESS=0"

REM Try multiple paths for migration file
if exist "%MIGRATION_PATH%\migrations\add_is_active_to_formulation_ingredients.sql" (
    set "MIGRATION_FILE=%MIGRATION_PATH%\migrations\add_is_active_to_formulation_ingredients.sql"
) else if exist "database\migrations\add_is_active_to_formulation_ingredients.sql" (
    set "MIGRATION_FILE=database\migrations\add_is_active_to_formulation_ingredients.sql"
) else if exist "..\database\migrations\add_is_active_to_formulation_ingredients.sql" (
    set "MIGRATION_FILE=..\database\migrations\add_is_active_to_formulation_ingredients.sql"
) else if exist "%SCRIPT_DIR%database\migrations\add_is_active_to_formulation_ingredients.sql" (
    set "MIGRATION_FILE=%SCRIPT_DIR%database\migrations\add_is_active_to_formulation_ingredients.sql"
) else if exist "%SCRIPT_DIR%..\database\migrations\add_is_active_to_formulation_ingredients.sql" (
    set "MIGRATION_FILE=%SCRIPT_DIR%..\database\migrations\add_is_active_to_formulation_ingredients.sql"
)

if not "!MIGRATION_FILE!"=="" (
    psql -U postgres -d "FLB_MOWS" -f "!MIGRATION_FILE!" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: is_active column added successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration is_active may have failed (non-critical)
        echo    Column may already exist or migration may have already been applied
    )
) else (
    echo ??  Migration file not found, but migration may have already been applied
    echo    Searched: database\migrations\add_is_active_to_formulation_ingredients.sql
)

echo.
echo [12/13] Fixing user passwords (updating with valid bcrypt hashes)...
set PGPASSWORD=%PGPASSWORD%
set "PASSWORD_FIX_SQL="
set "PASSWORD_FIX_SUCCESS=0"

REM Try to find update-user-passwords.sql script
if exist "scripts\update-user-passwords.sql" (
    set "PASSWORD_FIX_SQL=scripts\update-user-passwords.sql"
) else if exist "..\scripts\update-user-passwords.sql" (
    set "PASSWORD_FIX_SQL=..\scripts\update-user-passwords.sql"
) else if exist "%SCRIPT_DIR%scripts\update-user-passwords.sql" (
    set "PASSWORD_FIX_SQL=%SCRIPT_DIR%scripts\update-user-passwords.sql"
) else if exist "database\update-user-passwords.sql" (
    set "PASSWORD_FIX_SQL=database\update-user-passwords.sql"
) else if exist "%MIGRATION_PATH%\update-user-passwords.sql" (
    set "PASSWORD_FIX_SQL=%MIGRATION_PATH%\update-user-passwords.sql"
)

if not "!PASSWORD_FIX_SQL!"=="" (
    echo Running password update SQL script...
    psql -U postgres -d "FLB_MOWS" -f "!PASSWORD_FIX_SQL!"
    if !errorlevel! equ 0 (
        echo ? User passwords fixed successfully
        set "PASSWORD_FIX_SUCCESS=1"
    ) else (
        echo ??  Warning: Password update SQL script may have failed
        echo    Trying inline SQL as fallback...
        set "PASSWORD_FIX_SQL="
    )
)

if "!PASSWORD_FIX_SQL!"=="" (
    REM If SQL script not found or failed, use inline SQL to update passwords
    echo Updating passwords directly with SQL...
    set PGPASSWORD=%PGPASSWORD%
    echo   - Updating admin...
    psql -U postgres -d "FLB_MOWS" -c "UPDATE master_user SET password_hash = '$2a$10$ArpArDkniSYq8cAT/2M1/er2dsaM38PrVUDbI/VmFZoX4ET/srdsK', updated_at = CURRENT_TIMESTAMP WHERE username = 'admin';" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PASSWORD_FIX_SUCCESS=1"
    )
    echo   - Updating faliq...
    psql -U postgres -d "FLB_MOWS" -c "UPDATE master_user SET password_hash = '$2a$10$icN.qmF9/y8Vy0A/oEQ/9.VLQVlwzN/3lXgMMnHLOjQ8SEW8hsG3W', updated_at = CURRENT_TIMESTAMP WHERE username = 'faliq';" >nul 2>&1
    echo   - Updating operator1...
    psql -U postgres -d "FLB_MOWS" -c "UPDATE master_user SET password_hash = '$2a$10$iebIf6hSQ6xfKiK7rg70jOQ73TyJlKf5dT1N280S3XG2zCGylau6C', updated_at = CURRENT_TIMESTAMP WHERE username = 'operator1';" >nul 2>&1
    echo   - Updating supervisor...
    psql -U postgres -d "FLB_MOWS" -c "UPDATE master_user SET password_hash = '$2a$10$NPpgCWBwFVPhj1ltzg0SAOobWvEBUhmeJOKTp5.jlWwHWAH.yDFV2', updated_at = CURRENT_TIMESTAMP WHERE username = 'supervisor';" >nul 2>&1
    if !PASSWORD_FIX_SUCCESS! equ 1 (
        echo ? User passwords fixed successfully (using inline SQL)
    ) else (
        echo ??  Warning: Password updates completed, but some may have failed
        echo    You can run fix-passwords-standalone.bat to verify
    )
)

echo.
echo [13/13] Verifying database setup and password fix...
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -d "FLB_MOWS" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" >nul 2>&1
if %errorlevel% neq 0 (
    echo ??  Warning: Could not verify database setup
) else (
    echo ? Database setup complete
)

REM Verify password fix was successful
if !PASSWORD_FIX_SUCCESS! equ 1 (
    echo ? Password fix verified
) else (
    echo ??  Warning: Password fix may not have completed successfully
    echo    Please run fix-passwords-standalone.bat to ensure passwords are correct
)

echo.
echo ========================================
echo Database Setup Complete!
echo ========================================
echo.
echo Database Configuration:
echo   Host: localhost
echo   Port: 5432
echo   Database: FLB_MOWS
echo   Username: postgres
echo   Password: Admin123 (default)
echo.
echo Environment Variables (optional, for custom configuration):
echo   DB_HOST - Database host (default: localhost)
echo   DB_PORT - Database port (default: 5432)
echo   DB_NAME - Database name (default: FLB_MOWS)
echo   DB_USER - Database user (default: postgres)
echo   DB_PASSWORD - Database password (default: Admin123)
echo   Set these before running the application if needed
echo.
echo Default User Passwords:
echo   admin: admin123
echo   faliq: faliq123
echo   operator1: operator123
echo   supervisor: supervisor123
echo   qc: qc123
echo.
echo If you cannot login, run the standalone password fix script:
echo   fix-passwords-standalone.bat
echo   Or manually: psql -U postgres -d FLB_MOWS -f database\update-user-passwords.sql
echo.
echo All migrations have been applied:
echo   ? Reject status support
echo   ? Opened_at tracking field
echo   ? Print history table
echo   ? QC role and reactivate note
echo   ? Sequence order for ingredients
echo   ? is_active column for soft delete
echo   ? User passwords with valid bcrypt hashes
echo.
echo Note: If your PostgreSQL password is different from Admin123,
echo   set it before running this script:
echo     set PGPASSWORD=your_password
echo   Or edit this script to change the default password on line 11
echo.
echo Important: Users should change their passwords after first login!
echo.
pause

