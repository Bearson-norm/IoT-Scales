@echo off
echo ============================================
echo Setup Print History Table
echo ============================================
echo.
echo This script will create the print_history table
echo for temporary storage of print data (3 days).
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
echo Creating print_history table...
echo.

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f database\migration-add-print-history.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Setup completed successfully!
    echo ============================================
    echo.
    echo Print history table created.
    echo Data will be automatically deleted after 3 days.
) else (
    echo.
    echo ============================================
    echo Setup failed!
    echo ============================================
)

pause









