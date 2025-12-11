@echo off
echo ============================================
echo Update Sequence Order for Existing Data
echo ============================================
echo.
echo This script will update sequence_order for existing ingredients
echo based on their created_at timestamp.
echo.

REM Check if psql is available
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: psql is not found in PATH
    echo Please install PostgreSQL and add it to your PATH
    pause
    exit /b 1
)

echo Enter database connection details:
set /p DB_NAME="Database name (default: FLB_MOWS): "
if "%DB_NAME%"=="" set DB_NAME=FLB_MOWS

set /p DB_USER="Database user (default: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_HOST="Database host (default: localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Database port (default: 5432): "
if "%DB_PORT%"=="" set DB_PORT=5432

echo.
echo Updating sequence_order for existing ingredients...
echo.

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f database\migration-add-sequence-order.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Update completed successfully!
    echo ============================================
) else (
    echo.
    echo ============================================
    echo Update failed!
    echo ============================================
)

pause









