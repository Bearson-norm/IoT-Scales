@echo off
setlocal enabledelayedexpansion

echo ========================================
echo IoT Scales V2 - System Requirements Check
echo ========================================
echo.
echo Checking if your system meets all requirements...
echo This script will help you identify missing dependencies.
echo.

set ERROR_COUNT=0

REM Check 1: PostgreSQL
echo [1/5] Checking PostgreSQL...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is NOT installed or not in PATH
    echo    Download from: https://www.postgresql.org/download/windows/
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=*" %%i in ('psql --version 2^>nul') do set PSQL_VERSION=%%i
    echo ✅ PostgreSQL is installed: !PSQL_VERSION!
)
echo.

REM Check 2: Node.js
echo [2/5] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is NOT installed or not in PATH
    echo    Download from: https://nodejs.org/
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
    echo ✅ Node.js is installed: !NODE_VERSION!
)
echo.

REM Check 3: Python (optional, for Hardware folder only)
echo [3/5] Checking Python (optional)...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Python is NOT installed (only needed for Hardware folder)
    echo    Download from: https://www.python.org/downloads/
) else (
    for /f "tokens=*" %%i in ('python --version 2^>nul') do set PYTHON_VERSION=%%i
    echo ✅ Python is installed: !PYTHON_VERSION!
)
echo.

REM Check 4: Required files
echo [4/5] Checking required files...
set FILE_ERROR=0

if exist "server.js" (
    echo ✅ server.js found
) else (
    echo ❌ server.js NOT found
    set /a FILE_ERROR+=1
)

if exist "package.json" (
    echo ✅ package.json found
) else (
    echo ❌ package.json NOT found
    set /a FILE_ERROR+=1
)

if exist "database\" (
    echo ✅ database folder found
) else (
    echo ❌ database folder NOT found
    set /a FILE_ERROR+=1
)

if !FILE_ERROR! gtr 0 (
    echo.
    echo ⚠️  Warning: Some required files are missing
    echo    Current directory: %CD%
    echo    Make sure you run this script from the V2 folder
    set /a ERROR_COUNT+=1
)
echo.

REM Check 5: PostgreSQL Service
echo [5/5] Checking PostgreSQL service...
sc query postgresql-x64-15 >nul 2>&1
if %errorlevel% equ 0 (
    sc query postgresql-x64-15 | find "RUNNING" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ PostgreSQL service is RUNNING
    ) else (
        echo ⚠️  PostgreSQL service is NOT running
        echo    Start it from Services (services.msc) or run:
        echo    net start postgresql-x64-15
        set /a ERROR_COUNT+=1
    )
) else (
    REM Try other common service names
    sc query postgresql-x64-14 >nul 2>&1
    if !errorlevel! equ 0 (
        sc query postgresql-x64-14 | find "RUNNING" >nul 2>&1
        if !errorlevel! equ 0 (
            echo ✅ PostgreSQL service is RUNNING
        ) else (
            echo ⚠️  PostgreSQL service is NOT running
            set /a ERROR_COUNT+=1
        )
    ) else (
        echo ⚠️  Could not detect PostgreSQL service status
        echo    Check manually with: services.msc
    )
)
echo.

REM Check 6: Test PostgreSQL connection (if installed)
where psql >nul 2>&1
if %errorlevel% equ 0 (
    echo [BONUS] Testing PostgreSQL connection...
    set PGPASSWORD=Admin123
    psql -U postgres -c "SELECT version();" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Can connect to PostgreSQL with password: Admin123
    ) else (
        echo ⚠️  Cannot connect to PostgreSQL
        echo    Possible reasons:
        echo    - PostgreSQL service is not running
        echo    - Password is not Admin123
        echo    - User 'postgres' does not exist
    )
    echo.
)

REM Check 7: Check if database exists
where psql >nul 2>&1
if %errorlevel% equ 0 (
    echo [BONUS] Checking if database FLB_MOWS exists...
    set PGPASSWORD=Admin123
    psql -U postgres -lqt | findstr /i "FLB_MOWS" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Database FLB_MOWS exists
    ) else (
        echo ⚠️  Database FLB_MOWS does NOT exist
        echo    Run setup-database.bat to create it
    )
    echo.
)

REM Check 8: Check node_modules
if exist "node_modules\" (
    echo [BONUS] Node.js dependencies...
    echo ✅ node_modules folder found
    echo    Dependencies appear to be installed
) else (
    echo [BONUS] Node.js dependencies...
    echo ⚠️  node_modules folder NOT found
    echo    Run: npm install
    set /a ERROR_COUNT+=1
)
echo.

REM Summary
echo ========================================
echo Summary
echo ========================================
echo.

if !ERROR_COUNT! equ 0 (
    echo ✅ All checks passed! Your system is ready.
    echo.
    echo Next steps:
    echo   1. If database doesn't exist, run: setup-database.bat
    echo   2. If node_modules missing, run: npm install
    echo   3. Then run: start-server.bat
) else (
    echo ❌ Found !ERROR_COUNT! issue(s) that need to be fixed
    echo.
    echo Please fix the issues above before running the application.
    echo.
    echo Common fixes:
    echo   1. Install PostgreSQL: https://www.postgresql.org/
    echo   2. Install Node.js: https://nodejs.org/
    echo   3. Run this script from V2 folder
    echo   4. Start PostgreSQL service
    echo   5. Run: npm install
)

echo.
echo ========================================
echo.
echo Press any key to exit...
pause >nul
