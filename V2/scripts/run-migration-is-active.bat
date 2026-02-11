@echo off
setlocal enabledelayedexpansion
echo ========================================
echo Running Migration: Add is_active column
echo ========================================
echo.

REM Set default password (can be overridden by environment variable)
if "%PGPASSWORD%"=="" (
    set PGPASSWORD=Admin123
)

REM Detect script location and set migration path
set "SCRIPT_DIR=%~dp0"
set "MIGRATION_FILE="
set "MIGRATION_SUCCESS=0"

REM Check multiple possible locations for migration file
if exist "%SCRIPT_DIR%..\database\migrations\add_is_active_to_formulation_ingredients.sql" (
    set "MIGRATION_FILE=%SCRIPT_DIR%..\database\migrations\add_is_active_to_formulation_ingredients.sql"
) else if exist "%SCRIPT_DIR%database\migrations\add_is_active_to_formulation_ingredients.sql" (
    set "MIGRATION_FILE=%SCRIPT_DIR%database\migrations\add_is_active_to_formulation_ingredients.sql"
) else (
    REM Try current directory
    cd /d "%~dp0"
    if exist "database\migrations\add_is_active_to_formulation_ingredients.sql" (
        set "MIGRATION_FILE=database\migrations\add_is_active_to_formulation_ingredients.sql"
    ) else if exist "..\database\migrations\add_is_active_to_formulation_ingredients.sql" (
        set "MIGRATION_FILE=..\database\migrations\add_is_active_to_formulation_ingredients.sql"
    ) else if exist "%CD%\database\migrations\add_is_active_to_formulation_ingredients.sql" (
        set "MIGRATION_FILE=%CD%\database\migrations\add_is_active_to_formulation_ingredients.sql"
    )
)

if "!MIGRATION_FILE!"=="" (
    echo ❌ ERROR: Migration file not found!
    echo.
    echo Searched in:
    echo   - %SCRIPT_DIR%..\database\migrations\
    echo   - %SCRIPT_DIR%database\migrations\
    echo   - database\migrations\
    echo   - ..\database\migrations\
    echo.
    echo Please ensure the migration file exists at:
    echo   database\migrations\add_is_active_to_formulation_ingredients.sql
    pause
    exit /b 1
) else (
    echo Migration file found: !MIGRATION_FILE!
)

REM Load database configuration from .env or use defaults
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_NAME=FLB_MOWS

REM Check if .env file exists and load it
if exist "%SCRIPT_DIR%..\.env" (
    echo Loading database configuration from .env...
    for /f "tokens=1,2 delims==" %%a in ("%SCRIPT_DIR%..\.env") do (
        if "%%a"=="DB_HOST" set DB_HOST=%%b
        if "%%a"=="DB_PORT" set DB_PORT=%%b
        if "%%a"=="DB_USER" set DB_USER=%%b
        if "%%a"=="DB_NAME" set DB_NAME=%%b
    )
) else if exist ".env" (
    echo Loading database configuration from .env...
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="DB_HOST" set DB_HOST=%%b
        if "%%a"=="DB_PORT" set DB_PORT=%%b
        if "%%a"=="DB_USER" set DB_USER=%%b
        if "%%a"=="DB_NAME" set DB_NAME=%%b
    )
)

echo.
echo Database Configuration:
echo   Database: %DB_NAME%
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo   User: %DB_USER%
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL from https://www.postgresql.org/
    pause
    exit /b 1
)

echo Checking PostgreSQL connection...
set PGPASSWORD=%PGPASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -c "SELECT version();" >nul 2>&1
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

echo Running migration...
set PGPASSWORD=%PGPASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "!MIGRATION_FILE!"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ Migration completed successfully!
    echo ========================================
    set "MIGRATION_SUCCESS=1"
) else (
    echo.
    echo ========================================
    echo ❌ Migration failed!
    echo ========================================
    echo.
    echo Possible reasons:
    echo   - Column is_active may already exist
    echo   - Database connection issue
    echo   - Permission issue
    echo.
    echo To check if column already exists, run:
    echo   psql -U %DB_USER% -d %DB_NAME% -c "SELECT column_name FROM information_schema.columns WHERE table_name='master_formulation_ingredients' AND column_name='is_active';"
    set "MIGRATION_SUCCESS=0"
)

echo.
if !MIGRATION_SUCCESS! equ 1 (
    echo Migration status: ✅ SUCCESS
) else (
    echo Migration status: ❌ FAILED
)
echo.
pause
exit /b !MIGRATION_SUCCESS!
