@echo off
echo ============================================
echo Fix Sequence Order for Existing Data
echo ============================================
echo.
echo This script will recalculate sequence_order for all ingredients
echo based on their created_at timestamp per formulation.
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
echo Fixing sequence_order for all ingredients...
echo.

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "UPDATE master_formulation_ingredients mfi SET sequence_order = sub.row_num FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY formulation_id ORDER BY created_at ASC) as row_num FROM master_formulation_ingredients) sub WHERE mfi.id = sub.id;"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Reversing sequence_order if needed...
    echo Note: If your data is in reverse order, you may need to manually fix it.
    echo You can use this SQL to reverse: UPDATE master_formulation_ingredients mfi SET sequence_order = (SELECT COUNT(*) FROM master_formulation_ingredients mfi2 WHERE mfi2.formulation_id = mfi.formulation_id) - mfi.sequence_order + 1;
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Fix completed successfully!
    echo ============================================
    echo.
    echo Verifying results...
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT mf.formulation_code, mp.product_code, mfi.sequence_order FROM master_formulation_ingredients mfi JOIN master_formulation mf ON mfi.formulation_id = mf.id JOIN master_product mp ON mfi.product_id = mp.id ORDER BY mf.formulation_code, mfi.sequence_order LIMIT 20;"
) else (
    echo.
    echo ============================================
    echo Fix failed!
    echo ============================================
)

pause

