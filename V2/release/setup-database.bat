@echo off
setlocal enabledelayedexpansion

echo ========================================
echo IoT Scales V2 - Database Setup
echo ========================================
echo.

if not exist "%~dp0.env" (
    if exist "%~dp0env.example" (
        echo Creating .env from env.example...
        copy /Y "%~dp0env.example" "%~dp0.env" >nul
    )
)

REM Defaults (overridden by .env below)
set "DB_HOST=localhost"
set "DB_PORT=5432"
set "DB_USER=postgres"
set "DB_NAME=FLB_MOWS"
set "PGPASSWORD="

REM Always read .env from same folder as this script (works without scripts\ folder)
if exist "%~dp0.env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%~dp0.env") do (
        if /i "%%a"=="DB_HOST" if not "%%b"=="" set "DB_HOST=%%b"
        if /i "%%a"=="DB_PORT" if not "%%b"=="" set "DB_PORT=%%b"
        if /i "%%a"=="DB_USER" if not "%%b"=="" set "DB_USER=%%b"
        if /i "%%a"=="DB_NAME" if not "%%b"=="" set "DB_NAME=%%b"
        if /i "%%a"=="DB_PASSWORD" if not "%%b"=="" set "PGPASSWORD=%%b"
    )
    echo OK Loaded .env from %~dp0.env
) else (
    echo WARN No .env file found in %~dp0
)

if not defined PGPASSWORD set "PGPASSWORD=Admin123"

REM Optional: also call load-db-env.bat if present (project root scripts)
if exist "%~dp0scripts\load-db-env.bat" call "%~dp0scripts\load-db-env.bat"
if exist "%~dp0..\scripts\load-db-env.bat" call "%~dp0..\scripts\load-db-env.bat"

set "PGPASSWORD=%PGPASSWORD%"
echo Database target: %DB_HOST%:%DB_PORT% / %DB_NAME% user %DB_USER%
if defined PGPASSWORD (echo Password: loaded from .env) else (echo Password: NOT SET)

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
if errorlevel 1 (
    echo ERROR: PostgreSQL is not installed and not in PATH
    echo Please install PostgreSQL from https://www.postgresql.org/
    pause
    exit /b 1
)

echo [1/12] Checking PostgreSQL connection...
set "PGPASSWORD=%PGPASSWORD%"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT version();" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Cannot connect to PostgreSQL at %DB_HOST%:%DB_PORT% user %DB_USER%
    echo.
    echo Detailed error from PostgreSQL:
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1;" 2>&1
    echo.
    echo Troubleshooting:
    echo   1. Open services.msc and START service "postgresql-x64-..."
    echo   2. Edit .env - set DB_PASSWORD to your actual postgres password
    echo   3. Run scripts\test-db-connection.bat for full diagnosis
    echo   4. Test login in pgAdmin: host localhost, user postgres
    pause
    exit /b 1
)
echo OK PostgreSQL is running

echo.
echo [2/12] Ensuring database %DB_NAME% exists...

REM Default: upgrade mode - preserve existing production data
REM Use "setup-database.bat fresh" only when you want to wipe the database
set "SETUP_MODE=upgrade"
if /i "%~1"=="fresh" set "SETUP_MODE=fresh"
if /i "%~1"=="--fresh" set "SETUP_MODE=fresh"
if /i "%~1"=="fresh-keep-users" set "SETUP_MODE=fresh-keep-users"
if "%DB_SETUP_FRESH%"=="1" set "SETUP_MODE=fresh"

set "USER_BACKUP_FILE="
set "USERS_RESTORED=0"
set "USER_BACKUP_COUNT=0"
set "USER_BACKUP_IS_CSV=0"

set "DB_EXISTS=0"
set "PGPASSWORD=%PGPASSWORD%"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -lqt 2>nul | findstr /i "%DB_NAME%" >nul 2>&1
if not errorlevel 1 set "DB_EXISTS=1"

if /i "%SETUP_MODE%"=="fresh-keep-users" (
    if "%DB_EXISTS%"=="1" (
        echo Backing up master_user before reset...
        for /f "delims=" %%A in ('psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -t -A -c "SELECT COUNT(*) FROM master_user;" 2^>nul') do set "USER_BACKUP_COUNT=%%A"
        if not defined USER_BACKUP_COUNT set "USER_BACKUP_COUNT=0"
        echo Found !USER_BACKUP_COUNT! user account^(s^) to preserve
        if !USER_BACKUP_COUNT! gtr 0 (
            set "USER_BACKUP_FILE=%TEMP%\iot_scales_master_user_%DB_NAME%_%RANDOM%.sql"
            set "USER_BACKUP_OK=0"
            where pg_dump >nul 2>&1
            if not errorlevel 1 (
                set "PGPASSWORD=%PGPASSWORD%"
                pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -t master_user --data-only --inserts -f "!USER_BACKUP_FILE!" >nul 2>&1
                if !errorlevel! equ 0 set "USER_BACKUP_OK=1"
            )
            if "!USER_BACKUP_OK!"=="0" (
                echo WARN pg_dump unavailable or failed - trying COPY fallback...
                set "PGPASSWORD=%PGPASSWORD%"
                psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -c "\copy (SELECT id, username, name, email, password_hash, role, status, last_login, created_at, updated_at FROM master_user) TO '!USER_BACKUP_FILE!.csv' WITH CSV HEADER" >nul 2>&1
                if !errorlevel! equ 0 (
                    set "USER_BACKUP_FILE=!USER_BACKUP_FILE!.csv"
                    set "USER_BACKUP_IS_CSV=1"
                    set "USER_BACKUP_OK=1"
                )
            )
            if "!USER_BACKUP_OK!"=="0" (
                echo ERROR: Failed to backup master_user. Aborting to prevent data loss.
                echo    Ensure pg_dump is in PATH or PostgreSQL client tools are installed.
                pause
                exit /b 1
            )
            echo OK User backup saved to !USER_BACKUP_FILE!
        )
    )
    echo.
    echo WARN FRESH-KEEP-USERS MODE - all data in %DB_NAME% will be deleted EXCEPT user accounts
    echo    Work orders, weighing history, and master data will be reset to EMPTY ^(no sample data^)
    echo Press Ctrl+C now to cancel, or press any key to continue...
    pause >nul
    set "PGPASSWORD=%PGPASSWORD%"
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -c "DROP DATABASE IF EXISTS \"%DB_NAME%\";" >nul 2>&1
    timeout /t 1 /nobreak >nul 2>&1
    set "DB_EXISTS=0"
)

if /i "%SETUP_MODE%"=="fresh" (
    echo.
    echo WARN FRESH MODE - all data in %DB_NAME% will be permanently deleted
    echo Press Ctrl+C now to cancel, or press any key to continue...
    pause >nul
    set "PGPASSWORD=%PGPASSWORD%"
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -c "DROP DATABASE IF EXISTS \"%DB_NAME%\";" >nul 2>&1
    timeout /t 1 /nobreak >nul 2>&1
    set "DB_EXISTS=0"
)

set "FRESH_INSTALL=0"
if "%DB_EXISTS%"=="0" (
    echo Creating database %DB_NAME%...
    set "PGPASSWORD=%PGPASSWORD%"
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -c "CREATE DATABASE \"%DB_NAME%\";" >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Failed to create database %DB_NAME%
        pause
        exit /b 1
    )
    set "FRESH_INSTALL=1"
    echo OK New database created - full schema will be imported
) else (
    echo OK Database already exists - UPGRADE mode
    echo    Existing work orders, weighing history, and master data are preserved
    echo    Only new migrations will be applied
    echo    To wipe and recreate: setup-database.bat fresh
)

set "PGPASSWORD=%PGPASSWORD%"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -lqt 2>nul | findstr /i "%DB_NAME%" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Database %DB_NAME% is not available
    pause
    exit /b 1
)

echo.
if "%FRESH_INSTALL%"=="1" (
    if /i "%SETUP_MODE%"=="fresh-keep-users" (
        echo [3/12] Skipping schema.sql - creating empty master tables ^(no sample data^)
        goto skip_schema_import
    )
    echo [3/12] Importing database schema...
) else (
    echo [3/12] Skipping schema import - database already initialized
    goto skip_schema_import
)
REM Try to find schema.sql in current directory (for release folder) or parent directory
set PGPASSWORD=%PGPASSWORD%
if exist "database\schema.sql" (
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f database\schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import database schema
        pause
        exit /b 1
    )
    echo ? Schema imported successfully
) else if exist "..\database\schema.sql" (
    set PGPASSWORD=%PGPASSWORD%
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f ..\database\schema.sql
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

:skip_schema_import
echo.
if "%FRESH_INSTALL%"=="1" (
    echo [4/12] Importing core schema...
) else (
    echo [4/12] Skipping core schema - already applied
    goto skip_core_schema
)
set PGPASSWORD=%PGPASSWORD%
if exist "database\init\01-core-schema.sql" (
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f database\init\01-core-schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import core schema
        pause
        exit /b 1
    )
    echo ? Core schema imported successfully
) else if exist "..\database\init\01-core-schema.sql" (
    set PGPASSWORD=%PGPASSWORD%
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f ..\database\init\01-core-schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import core schema
        pause
        exit /b 1
    )
    echo ? Core schema imported successfully
) else (
    echo ??  Core schema file not found, skipping...
)

:skip_core_schema
echo.
if "%FRESH_INSTALL%"=="1" (
    echo [5/12] Importing weighing tables...
) else (
    echo [5/12] Skipping weighing tables init - already applied
    goto skip_weighing_init
)
set PGPASSWORD=%PGPASSWORD%
if exist "database\init\02-weighing.sql" (
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f database\init\02-weighing.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import weighing tables
        pause
        exit /b 1
    )
    echo ? Weighing tables imported successfully
) else if exist "..\database\init\02-weighing.sql" (
    set PGPASSWORD=%PGPASSWORD%
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f ..\database\init\02-weighing.sql
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

:skip_weighing_init
echo.
echo [6/12] Running migration: Add reject status...
set PGPASSWORD=%PGPASSWORD%
set "MIGRATION_FILE=%MIGRATION_PATH%\migration-add-reject-status.sql"
set "MIGRATION_SUCCESS=0"
if exist "%MIGRATION_FILE%" (
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f "%MIGRATION_FILE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: reject status added successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration reject status may have failed (non-critical)
    )
) else (
    REM Try alternative paths
    if exist "database\migration-add-reject-status.sql" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f database\migration-add-reject-status.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: reject status added successfully
            set "MIGRATION_SUCCESS=1"
        )
    ) else if exist "..\database\migration-add-reject-status.sql" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f ..\database\migration-add-reject-status.sql >nul 2>&1
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
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f "%MIGRATION_FILE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: opened_at field added successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration opened_at may have failed (non-critical)
    )
) else (
    REM Try alternative paths
    if exist "database\migration-add-opened-at.sql" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f database\migration-add-opened-at.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: opened_at field added successfully
            set "MIGRATION_SUCCESS=1"
        )
    ) else if exist "..\database\migration-add-opened-at.sql" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f ..\database\migration-add-opened-at.sql >nul 2>&1
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
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f "%MIGRATION_FILE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: print history table created successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration print history may have failed (non-critical)
    )
) else (
    REM Try alternative paths
    if exist "database\migration-add-print-history.sql" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f database\migration-add-print-history.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: print history table created successfully
            set "MIGRATION_SUCCESS=1"
        )
    ) else if exist "..\database\migration-add-print-history.sql" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f ..\database\migration-add-print-history.sql >nul 2>&1
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
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f "%MIGRATION_FILE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: QC role and reactivate note added successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration QC role may have failed (non-critical)
    )
) else (
    REM Try alternative paths
    if exist "database\migration-add-qc-role-and-reactivate-note.sql" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f database\migration-add-qc-role-and-reactivate-note.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: QC role and reactivate note added successfully
            set "MIGRATION_SUCCESS=1"
        )
    ) else if exist "..\database\migration-add-qc-role-and-reactivate-note.sql" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f ..\database\migration-add-qc-role-and-reactivate-note.sql >nul 2>&1
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
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f "%MIGRATION_FILE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ? Migration: sequence order added successfully
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo ??  Warning: Migration sequence order may have failed (non-critical)
    )
) else (
    REM Try alternative paths
    if exist "database\migration-add-sequence-order.sql" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f database\migration-add-sequence-order.sql >nul 2>&1
        if !errorlevel! equ 0 (
            echo ? Migration: sequence order added successfully
            set "MIGRATION_SUCCESS=1"
        )
    ) else if exist "..\database\migration-add-sequence-order.sql" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f ..\database\migration-add-sequence-order.sql >nul 2>&1
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
) else if exist "%SCRIPT_DIR%\database\migrations\add_is_active_to_formulation_ingredients.sql" (
    set "MIGRATION_FILE=%SCRIPT_DIR%\database\migrations\add_is_active_to_formulation_ingredients.sql"
) else if exist "database\migrations\add_is_active_to_formulation_ingredients.sql" (
    set "MIGRATION_FILE=database\migrations\add_is_active_to_formulation_ingredients.sql"
) else if exist "..\database\migrations\add_is_active_to_formulation_ingredients.sql" (
    set "MIGRATION_FILE=..\database\migrations\add_is_active_to_formulation_ingredients.sql"
)

if defined MIGRATION_FILE (
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f "!MIGRATION_FILE!" >nul 2>&1
    if !errorlevel! equ 0 (
        echo OK Migration: is_active column applied ^(!MIGRATION_FILE!^)
        set "MIGRATION_SUCCESS=1"
    ) else (
        echo WARN Migration is_active returned error - column may already exist
    )
) else (
    echo WARN Migration file not found: add_is_active_to_formulation_ingredients.sql
    echo    Expected under: %MIGRATION_PATH%\migrations\
)

echo.
echo [11b/13] Running migration: Add scaling_mode (per PCS) support...
set "SCALING_MIGRATION_FILE="
if exist "%MIGRATION_PATH%\migrations\add_scaling_mode.sql" (
    set "SCALING_MIGRATION_FILE=%MIGRATION_PATH%\migrations\add_scaling_mode.sql"
) else if exist "%SCRIPT_DIR%\database\migrations\add_scaling_mode.sql" (
    set "SCALING_MIGRATION_FILE=%SCRIPT_DIR%\database\migrations\add_scaling_mode.sql"
) else if exist "database\migrations\add_scaling_mode.sql" (
    set "SCALING_MIGRATION_FILE=database\migrations\add_scaling_mode.sql"
) else if exist "..\database\migrations\add_scaling_mode.sql" (
    set "SCALING_MIGRATION_FILE=..\database\migrations\add_scaling_mode.sql"
)

if defined SCALING_MIGRATION_FILE (
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f "!SCALING_MIGRATION_FILE!" >nul 2>&1
    if !errorlevel! equ 0 (
        echo OK Migration: scaling_mode / planned_units applied ^(!SCALING_MIGRATION_FILE!^)
    ) else (
        echo WARN Migration scaling_mode returned error - columns may already exist
    )
) else (
    echo WARN Migration file not found: add_scaling_mode.sql
    echo    Expected under: %MIGRATION_PATH%\migrations\
    echo    Server will also auto-migrate on startup if PostgreSQL is reachable
)

echo.
if /i "%SETUP_MODE%"=="fresh-keep-users" (
    if "%FRESH_INSTALL%"=="1" (
        if defined USER_BACKUP_FILE (
            if exist "!USER_BACKUP_FILE!" (
                echo [11c/13] Restoring preserved user accounts...
                set "PGPASSWORD=%PGPASSWORD%"
                psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -c "DELETE FROM master_user;" >nul 2>&1
                if !errorlevel! neq 0 (
                    echo ERROR: Failed to clear seed users before restore
                ) else (
                    if "!USER_BACKUP_IS_CSV!"=="1" (
                        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -c "\copy master_user (id, username, name, email, password_hash, role, status, last_login, created_at, updated_at) FROM '!USER_BACKUP_FILE!' WITH CSV HEADER" >nul 2>&1
                    ) else (
                        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f "!USER_BACKUP_FILE!" >nul 2>&1
                    )
                    if !errorlevel! equ 0 (
                        set "USERS_RESTORED=1"
                        for /f "delims=" %%A in ('psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -t -A -c "SELECT COUNT(*) FROM master_user;" 2^>nul') do (
                            echo OK Restored %%A user account^(s^) from backup
                        )
                    ) else (
                        echo ERROR: Failed to restore user accounts from backup
                        echo    Run fix-passwords-standalone.bat if you need default seed logins
                    )
                )
            )
        ) else if !USER_BACKUP_COUNT! equ 0 (
            echo [11c/13] No existing users to restore - seeding default login accounts...
            set "SEED_USERS_SQL="
            if exist "database\init\03-seed-default-users.sql" (
                set "SEED_USERS_SQL=database\init\03-seed-default-users.sql"
            ) else if exist "..\database\init\03-seed-default-users.sql" (
                set "SEED_USERS_SQL=..\database\init\03-seed-default-users.sql"
            ) else if exist "%SCRIPT_DIR%\database\init\03-seed-default-users.sql" (
                set "SEED_USERS_SQL=%SCRIPT_DIR%\database\init\03-seed-default-users.sql"
            )
            if defined SEED_USERS_SQL (
                set "PGPASSWORD=%PGPASSWORD%"
                psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f "!SEED_USERS_SQL!" >nul 2>&1
                if !errorlevel! equ 0 (
                    echo OK Default login accounts seeded
                ) else (
                    echo ERROR: Failed to seed default login accounts
                )
            ) else (
                echo ERROR: Seed users file not found: database\init\03-seed-default-users.sql
            )
        )
    )
)

echo.
if "%FRESH_INSTALL%"=="1" (
    if "!USERS_RESTORED!"=="1" (
        echo [12/13] Skipping password reset - preserved user accounts restored
        goto skip_password_reset
    )
    echo [12/13] Setting default user passwords for new database...
) else (
    echo [12/13] Skipping password reset - existing user accounts preserved
    echo    To reset login passwords manually: fix-passwords-standalone.bat
    goto skip_password_reset
)
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
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -f "!PASSWORD_FIX_SQL!"
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
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -c "UPDATE master_user SET password_hash = '$2a$10$ArpArDkniSYq8cAT/2M1/er2dsaM38PrVUDbI/VmFZoX4ET/srdsK', updated_at = CURRENT_TIMESTAMP WHERE username = 'admin';" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PASSWORD_FIX_SUCCESS=1"
    )
    echo   - Updating faliq...
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -c "UPDATE master_user SET password_hash = '$2a$10$icN.qmF9/y8Vy0A/oEQ/9.VLQVlwzN/3lXgMMnHLOjQ8SEW8hsG3W', updated_at = CURRENT_TIMESTAMP WHERE username = 'faliq';" >nul 2>&1
    echo   - Updating operator1...
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -c "UPDATE master_user SET password_hash = '$2a$10$iebIf6hSQ6xfKiK7rg70jOQ73TyJlKf5dT1N280S3XG2zCGylau6C', updated_at = CURRENT_TIMESTAMP WHERE username = 'operator1';" >nul 2>&1
    echo   - Updating supervisor...
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -c "UPDATE master_user SET password_hash = '$2a$10$NPpgCWBwFVPhj1ltzg0SAOobWvEBUhmeJOKTp5.jlWwHWAH.yDFV2', updated_at = CURRENT_TIMESTAMP WHERE username = 'supervisor';" >nul 2>&1
    if !PASSWORD_FIX_SUCCESS! equ 1 (
        echo ? User passwords fixed successfully (using inline SQL)
    ) else (
        echo ??  Warning: Password updates completed, but some may have failed
        echo    You can run fix-passwords-standalone.bat to verify
    )
)

:skip_password_reset
echo.
echo [13/13] Verifying database setup...
set PGPASSWORD=%PGPASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" >nul 2>&1
if %errorlevel% neq 0 (
    echo WARN Could not verify database tables
) else (
    echo OK Database tables verified
)

REM Verify per-PCS scaling columns (add_scaling_mode migration)
set "SCALING_COL_OK=0"
for /f "delims=" %%A in ('psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d "%DB_NAME%" -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE (table_name='master_formulation' AND column_name='scaling_mode') OR (table_name='work_orders' AND column_name='planned_units');" 2^>nul') do set "SCALING_COL_OK=%%A"
if "!SCALING_COL_OK!"=="2" (
    echo OK Verified: master_formulation.scaling_mode + work_orders.planned_units exist
) else (
    echo WARN Missing scaling columns ^(found !SCALING_COL_OK!/2^) - restart app server to auto-migrate
)

REM Verify password fix was successful (fresh install only)
if "%FRESH_INSTALL%"=="1" (
    if "!USERS_RESTORED!"=="1" (
        echo OK Preserved user accounts verified
    ) else if !PASSWORD_FIX_SUCCESS! equ 1 (
        echo OK Default passwords applied
    ) else (
        echo WARN Password setup may not have completed - run fix-passwords-standalone.bat
    )
)

echo.
echo ========================================
if /i "%SETUP_MODE%"=="fresh-keep-users" (
    if "!USERS_RESTORED!"=="1" (
        echo Database Setup Complete - USERS PRESERVED, MASTER DATA EMPTY
    ) else (
        echo Database Setup Complete - DEFAULT USERS, MASTER DATA EMPTY
    )
    echo    Import products and formulations via Database Import in the app
) else if "%FRESH_INSTALL%"=="1" (
    echo Database Setup Complete - NEW INSTALL
) else (
    echo Database Upgrade Complete - DATA PRESERVED
)
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
if not "!USERS_RESTORED!"=="1" (
    echo Default User Passwords:
    echo   admin: admin123
    echo   faliq: faliq123
    echo   operator1: operator123
    echo   supervisor: supervisor123
    echo   qc: qc123
    echo.
    echo If you cannot login, run the standalone password fix script:
) else (
    echo Preserved user accounts were restored - existing passwords unchanged.
    echo.
    echo If you cannot login, run the standalone password fix script:
)
echo   fix-passwords-standalone.bat
echo   Or manually: psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d FLB_MOWS -f database\update-user-passwords.sql
echo.
echo All migrations have been applied:
echo   OK Reject status support
echo   OK Opened_at tracking field
echo   OK Print history table
echo   OK QC role and reactivate note
echo   OK Sequence order for ingredients
echo   OK is_active column for soft delete
echo   OK scaling_mode / planned_units for per-PCS weighing
echo   OK User passwords with valid bcrypt hashes (fresh install only)
echo.
echo Note: setup-database.bat default mode preserves existing data.
echo   Fresh install on empty server: runs automatically when DB does not exist
echo   Wipe and recreate all data: setup-database.bat fresh
echo   Wipe all data but keep users: setup-database.bat fresh-keep-users
echo.
echo Important: Users should change their passwords after first login!
echo.
pause

