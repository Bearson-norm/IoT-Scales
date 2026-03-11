@echo off
REM =============================================
REM Script: Run Zero Target Mass Fix Migration
REM Purpose: Execute SQL migration to identify zero target mass values
REM =============================================

echo ========================================
echo Zero Target Mass Fix Migration
echo ========================================
echo.

REM Load database configuration
set "CONFIG_FILE=.env"
if not exist "%CONFIG_FILE%" (
    echo ERROR: .env file not found!
    echo Please create .env file with database configuration.
    pause
    exit /b 1
)

REM Parse .env file for database credentials
for /f "tokens=1,2 delims==" %%a in ('type "%CONFIG_FILE%" ^| findstr /i "^DB_"') do (
    set "%%a=%%b"
)

REM Verify required variables
if "%DB_HOST%"=="" set "DB_HOST=localhost"
if "%DB_PORT%"=="" set "DB_PORT=5432"
if "%DB_NAME%"=="" (
    echo ERROR: DB_NAME not found in .env
    pause
    exit /b 1
)
if "%DB_USER%"=="" (
    echo ERROR: DB_USER not found in .env
    pause
    exit /b 1
)
if "%DB_PASSWORD%"=="" (
    echo ERROR: DB_PASSWORD not found in .env
    pause
    exit /b 1
)

echo Database: %DB_NAME%
echo Host: %DB_HOST%:%DB_PORT%
echo User: %DB_USER%
echo.

REM Set PGPASSWORD for non-interactive authentication
set "PGPASSWORD=%DB_PASSWORD%"

echo Running migration: fix-zero-target-mass.sql
echo.

REM Check if migration file exists
set "MIGRATION_FILE=database\migrations\fix-zero-target-mass.sql"
if not exist "%MIGRATION_FILE%" (
    echo ERROR: Migration file not found: %MIGRATION_FILE%
    pause
    exit /b 1
)

REM Run the migration
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%MIGRATION_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migration Completed Successfully!
    echo ========================================
    echo.
    echo NEXT STEPS:
    echo 1. Review the query results above
    echo 2. Identify ingredients with target_mass = 0
    echo 3. Check your original CSV for correct values
    echo 4. Either:
    echo    a. Update manually using SQL UPDATE statements
    echo    b. Re-import CSV with corrected data (RECOMMENDED)
    echo.
) else (
    echo.
    echo ========================================
    echo Migration Failed!
    echo ========================================
    echo Please check the error messages above.
    echo.
)

pause
