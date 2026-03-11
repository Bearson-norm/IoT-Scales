@echo off
REM =============================================
REM Script: Check Zero Target Mass Values
REM Purpose: Identify ingredients with target_mass = 0
REM =============================================

echo ========================================
echo Checking Zero Target Mass Values
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

echo Running query to find ingredients with target_mass = 0...
echo.

REM Run the SELECT query to identify zero target mass values
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT mfi.id, mf.formulation_code, mf.formulation_name, mp.product_code, mp.product_name, mfi.target_mass, mfi.sequence_order, mfi.is_active FROM master_formulation_ingredients mfi INNER JOIN master_formulation mf ON mfi.formulation_id = mf.id INNER JOIN master_product mp ON mfi.product_id = mp.id WHERE mfi.target_mass = 0 ORDER BY mf.formulation_code, mfi.sequence_order;"

echo.
echo ========================================
echo Check Complete!
echo ========================================
echo.
echo RECOMMENDATION:
echo 1. Review the results above
echo 2. Check your original CSV file for correct values
echo 3. Either manually fix values or re-import CSV with corrected data
echo 4. The import feature has been updated to handle decimal formats better
echo.

pause
