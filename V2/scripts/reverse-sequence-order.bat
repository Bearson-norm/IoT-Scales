@echo off
echo ============================================
echo Reverse Sequence Order for Existing Data
echo ============================================
echo.
echo This script will REVERSE the sequence_order for all ingredients
echo within each formulation (1 becomes last, last becomes 1, etc.)
echo.
echo WARNING: This will change the order of ingredients!
echo Make sure you have a database backup before proceeding.
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
echo Are you sure you want to REVERSE the sequence_order? (Y/N)
set /p CONFIRM="> "
if /i not "%CONFIRM%"=="Y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo Reversing sequence_order for all ingredients...
echo.

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "UPDATE master_formulation_ingredients mfi SET sequence_order = (SELECT COUNT(*) FROM master_formulation_ingredients mfi2 WHERE mfi2.formulation_id = mfi.formulation_id) - mfi.sequence_order + 1 WHERE mfi.sequence_order > 0;"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Reverse completed successfully!
    echo ============================================
    echo.
    echo Verifying results...
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT mf.formulation_code, mp.product_code, mfi.sequence_order FROM master_formulation_ingredients mfi JOIN master_formulation mf ON mfi.formulation_id = mf.id JOIN master_product mp ON mfi.product_id = mp.id ORDER BY mf.formulation_code, mfi.sequence_order LIMIT 20;"
) else (
    echo.
    echo ============================================
    echo Reverse failed!
    echo ============================================
)

pause









