@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Setup Database KMI_MOWS
echo ========================================
echo.

REM Set PostgreSQL superuser password
if "%PGPASSWORD%"=="" (
    set PGPASSWORD=Admin123
)

REM Detect script location and set database path
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "DB_PATH="

REM Check multiple possible locations for database folder
if exist "%SCRIPT_DIR%\database\schema.sql" (
    set "DB_PATH=%SCRIPT_DIR%\database"
) else if exist "%SCRIPT_DIR%\..\database\schema.sql" (
    set "DB_PATH=%SCRIPT_DIR%\..\database"
) else (
    cd /d "%~dp0"
    if exist "database\schema.sql" (
        set "DB_PATH=database"
    ) else if exist "..\database\schema.sql" (
        set "DB_PATH=..\database"
    ) else if exist "%CD%\database\schema.sql" (
        set "DB_PATH=%CD%\database"
    )
)

if "%DB_PATH%"=="" (
    echo ⚠️  WARNING: Could not find database folder
    echo    Please ensure you run this script from project root or release folder
    echo    Trying to continue anyway...
    set "DB_PATH=database"
) else (
    echo Database files location: %DB_PATH%
)

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL from https://www.postgresql.org/
    pause
    exit /b 1
)

echo.
echo [1/10] Checking PostgreSQL connection...
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -c "SELECT version();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Cannot connect to PostgreSQL
    echo Please ensure PostgreSQL service is running
    echo.
    echo If password is not Admin123, set it using:
    echo   set PGPASSWORD=your_password
    pause
    exit /b 1
)
echo ✅ PostgreSQL is running

echo.
echo [2/10] Creating database KMI_MOWS...
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -c "DROP DATABASE IF EXISTS \"KMI_MOWS\";" >nul 2>&1
timeout /t 1 /nobreak >nul 2>&1
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -c "CREATE DATABASE \"KMI_MOWS\";" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Failed to create database, checking if it already exists...
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -lqt | findstr /i "KMI_MOWS" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ⚠️  Database already exists, continuing...
    ) else (
        echo ❌ ERROR: Failed to create database KMI_MOWS
        pause
        exit /b 1
    )
) else (
    echo ✅ Database created successfully
)

REM Verify database was created
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -lqt | findstr /i "KMI_MOWS" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Database KMI_MOWS was not created successfully
    pause
    exit /b 1
)

echo.
echo [3/10] Creating user admin...
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -c "DROP USER IF EXISTS admin;" >nul 2>&1
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -c "CREATE USER admin WITH PASSWORD 'admin123';" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Failed to create user, checking if it already exists...
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -c "SELECT 1 FROM pg_roles WHERE rolname='admin';" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ⚠️  User already exists, updating password...
        set PGPASSWORD=%PGPASSWORD%
        psql -U postgres -c "ALTER USER admin WITH PASSWORD 'admin123';" >nul 2>&1
    ) else (
        echo ❌ ERROR: Failed to create user admin
        pause
        exit /b 1
    )
) else (
    echo ✅ User admin created successfully
)

echo.
echo [4/10] Granting privileges to admin user...
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON DATABASE \"KMI_MOWS\" TO admin;" >nul 2>&1
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL ON SCHEMA public TO admin;" >nul 2>&1
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -d "KMI_MOWS" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;" >nul 2>&1
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -d "KMI_MOWS" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;" >nul 2>&1
echo ✅ Privileges granted successfully

echo.
echo [5/10] Importing database schema...
set PGPASSWORD=%PGPASSWORD%
if exist "%DB_PATH%\schema.sql" (
    REM Replace FLB_MOWS with KMI_MOWS in schema file temporarily
    set "TEMP_SCHEMA=%TEMP%\schema_kmi_mows.sql"
    powershell -Command "(Get-Content '%DB_PATH%\schema.sql') -replace 'FLB_MOWS', 'KMI_MOWS' | Set-Content '%TEMP_SCHEMA%'"
    psql -U postgres -d "KMI_MOWS" -f "%TEMP_SCHEMA%"
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to import database schema
        del "%TEMP_SCHEMA%" >nul 2>&1
        pause
        exit /b 1
    )
    del "%TEMP_SCHEMA%" >nul 2>&1
    echo ✅ Schema imported successfully
) else if exist "database\schema.sql" (
    set "TEMP_SCHEMA=%TEMP%\schema_kmi_mows.sql"
    powershell -Command "(Get-Content 'database\schema.sql') -replace 'FLB_MOWS', 'KMI_MOWS' | Set-Content '%TEMP_SCHEMA%'"
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -d "KMI_MOWS" -f "%TEMP_SCHEMA%"
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to import database schema
        del "%TEMP_SCHEMA%" >nul 2>&1
        pause
        exit /b 1
    )
    del "%TEMP_SCHEMA%" >nul 2>&1
    echo ✅ Schema imported successfully
) else if exist "..\database\schema.sql" (
    set "TEMP_SCHEMA=%TEMP%\schema_kmi_mows.sql"
    powershell -Command "(Get-Content '..\database\schema.sql') -replace 'FLB_MOWS', 'KMI_MOWS' | Set-Content '%TEMP_SCHEMA%'"
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -d "KMI_MOWS" -f "%TEMP_SCHEMA%"
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to import database schema
        del "%TEMP_SCHEMA%" >nul 2>&1
        pause
        exit /b 1
    )
    del "%TEMP_SCHEMA%" >nul 2>&1
    echo ✅ Schema imported successfully
) else (
    echo ⚠️  Schema file not found, skipping...
    echo    Searched: %DB_PATH%\schema.sql, database\schema.sql, and ..\database\schema.sql
)

echo.
echo [6/10] Importing core schema...
set PGPASSWORD=%PGPASSWORD%
if exist "%DB_PATH%\init\01-core-schema.sql" (
    psql -U postgres -d "KMI_MOWS" -f "%DB_PATH%\init\01-core-schema.sql"
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to import core schema
        pause
        exit /b 1
    )
    echo ✅ Core schema imported successfully
) else if exist "database\init\01-core-schema.sql" (
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -d "KMI_MOWS" -f database\init\01-core-schema.sql
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to import core schema
        pause
        exit /b 1
    )
    echo ✅ Core schema imported successfully
) else if exist "..\database\init\01-core-schema.sql" (
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -d "KMI_MOWS" -f ..\database\init\01-core-schema.sql
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to import core schema
        pause
        exit /b 1
    )
    echo ✅ Core schema imported successfully
) else (
    echo ⚠️  Core schema file not found, skipping...
)

echo.
echo [7/10] Importing weighing tables...
set PGPASSWORD=%PGPASSWORD%
if exist "%DB_PATH%\init\02-weighing.sql" (
    psql -U postgres -d "KMI_MOWS" -f "%DB_PATH%\init\02-weighing.sql"
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to import weighing tables
        pause
        exit /b 1
    )
    echo ✅ Weighing tables imported successfully
) else if exist "database\init\02-weighing.sql" (
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -d "KMI_MOWS" -f database\init\02-weighing.sql
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to import weighing tables
        pause
        exit /b 1
    )
    echo ✅ Weighing tables imported successfully
) else if exist "..\database\init\02-weighing.sql" (
    set PGPASSWORD=%PGPASSWORD%
    psql -U postgres -d "KMI_MOWS" -f ..\database\init\02-weighing.sql
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to import weighing tables
        pause
        exit /b 1
    )
    echo ✅ Weighing tables imported successfully
) else (
    echo ⚠️  Weighing tables file not found, skipping...
    echo    Searched: %DB_PATH%\init\02-weighing.sql and alternatives
)

echo.
echo [8/10] Granting privileges on all tables to admin...
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;" >nul 2>&1
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;" >nul 2>&1
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO admin;" >nul 2>&1
echo ✅ All privileges granted to admin user

echo.
echo [9/10] Running migrations (if available)...
set PGPASSWORD=%PGPASSWORD%
set "MIGRATION_COUNT=0"
set "MIGRATION_SUCCESS=0"

REM Migration: Add reject status
if exist "%DB_PATH%\migration-add-reject-status.sql" (
    set /a MIGRATION_COUNT+=1
    psql -U postgres -d "KMI_MOWS" -f "%DB_PATH%\migration-add-reject-status.sql" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a MIGRATION_SUCCESS+=1
    )
) else if exist "database\migration-add-reject-status.sql" (
    set /a MIGRATION_COUNT+=1
    psql -U postgres -d "KMI_MOWS" -f database\migration-add-reject-status.sql >nul 2>&1
    if !errorlevel! equ 0 (
        set /a MIGRATION_SUCCESS+=1
    )
)

REM Migration: Add opened_at
if exist "%DB_PATH%\migration-add-opened-at.sql" (
    set /a MIGRATION_COUNT+=1
    psql -U postgres -d "KMI_MOWS" -f "%DB_PATH%\migration-add-opened-at.sql" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a MIGRATION_SUCCESS+=1
    )
) else if exist "database\migration-add-opened-at.sql" (
    set /a MIGRATION_COUNT+=1
    psql -U postgres -d "KMI_MOWS" -f database\migration-add-opened-at.sql >nul 2>&1
    if !errorlevel! equ 0 (
        set /a MIGRATION_SUCCESS+=1
    )
)

REM Migration: Add print history
if exist "%DB_PATH%\migration-add-print-history.sql" (
    set /a MIGRATION_COUNT+=1
    psql -U postgres -d "KMI_MOWS" -f "%DB_PATH%\migration-add-print-history.sql" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a MIGRATION_SUCCESS+=1
    )
) else if exist "database\migration-add-print-history.sql" (
    set /a MIGRATION_COUNT+=1
    psql -U postgres -d "KMI_MOWS" -f database\migration-add-print-history.sql >nul 2>&1
    if !errorlevel! equ 0 (
        set /a MIGRATION_SUCCESS+=1
    )
)

REM Migration: Add QC role
if exist "%DB_PATH%\migration-add-qc-role-and-reactivate-note.sql" (
    set /a MIGRATION_COUNT+=1
    psql -U postgres -d "KMI_MOWS" -f "%DB_PATH%\migration-add-qc-role-and-reactivate-note.sql" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a MIGRATION_SUCCESS+=1
    )
) else if exist "database\migration-add-qc-role-and-reactivate-note.sql" (
    set /a MIGRATION_COUNT+=1
    psql -U postgres -d "KMI_MOWS" -f database\migration-add-qc-role-and-reactivate-note.sql >nul 2>&1
    if !errorlevel! equ 0 (
        set /a MIGRATION_SUCCESS+=1
    )
)

REM Migration: Add sequence order
if exist "%DB_PATH%\migration-add-sequence-order.sql" (
    set /a MIGRATION_COUNT+=1
    psql -U postgres -d "KMI_MOWS" -f "%DB_PATH%\migration-add-sequence-order.sql" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a MIGRATION_SUCCESS+=1
    )
) else if exist "database\migration-add-sequence-order.sql" (
    set /a MIGRATION_COUNT+=1
    psql -U postgres -d "KMI_MOWS" -f database\migration-add-sequence-order.sql >nul 2>&1
    if !errorlevel! equ 0 (
        set /a MIGRATION_SUCCESS+=1
    )
)

if !MIGRATION_COUNT! gtr 0 (
    echo ✅ Migrations completed: !MIGRATION_SUCCESS!/!MIGRATION_COUNT!
) else (
    echo ⚠️  No migration files found (non-critical)
)

echo.
echo [10/10] Verifying database setup...
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -d "KMI_MOWS" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Could not verify database setup
) else (
    echo ✅ Database setup complete
)

REM Test admin user connection
echo.
echo Testing admin user connection...
set PGPASSWORD=admin123
psql -U admin -d "KMI_MOWS" -c "SELECT current_user, current_database();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Could not verify admin user connection
) else (
    echo ✅ Admin user can connect successfully
)

echo.
echo ========================================
echo Database Setup Complete!
echo ========================================
echo.
echo Database Configuration:
echo   Host: localhost
echo   Port: 5432
echo   Database: KMI_MOWS
echo   Superuser: postgres
echo   Password: Admin123 (default)
echo.
echo   Application User: admin
echo   Password: admin123
echo.
echo Connection String Examples:
echo   psql -U postgres -d KMI_MOWS
echo   psql -U admin -d KMI_MOWS
echo.
echo Note: If your PostgreSQL password is different from Admin123,
echo   set it before running this script:
echo     set PGPASSWORD=your_password
echo.
pause
