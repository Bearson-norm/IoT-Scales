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
    echo PostgreSQL is NOT installed and not in PATH
    echo    Download from: https://www.postgresql.org/download/windows/
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=*" %%i in ('psql --version 2^>nul') do set PSQL_VERSION=%%i
    echo OK PostgreSQL is installed: !PSQL_VERSION!
)
echo.

REM Check 2: Node.js
echo [2/5] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is NOT installed and not in PATH
    echo    Download from: https://nodejs.org/
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
    echo OK Node.js is installed: !NODE_VERSION!
)
echo.

REM Check 3: Python (optional)
echo [3/5] Checking Python (optional)...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo WARN Python is NOT installed - only needed for Hardware folder
    echo    Download from: https://www.python.org/downloads/
) else (
    for /f "tokens=*" %%i in ('python --version 2^>nul') do set PYTHON_VERSION=%%i
    echo OK Python is installed: !PYTHON_VERSION!
)
echo.

REM Check 4: Required files
echo [4/5] Checking required files...
set FILE_ERROR=0

if exist "server.js" (
    echo OK server.js found
) else (
    echo FAIL server.js NOT found
    set /a FILE_ERROR+=1
)

if exist "package.json" (
    echo OK package.json found
) else (
    echo FAIL package.json NOT found
    set /a FILE_ERROR+=1
)

if exist "database\" (
    echo OK database folder found
) else (
    echo FAIL database folder NOT found
    set /a FILE_ERROR+=1
)

if !FILE_ERROR! gtr 0 (
    echo.
    echo WARN Some required files are missing
    echo    Current directory: %CD%
    echo    Make sure you run this script from the V2 folder
    set /a ERROR_COUNT+=1
)
echo.

REM Check 5: PostgreSQL Service
echo [5/5] Checking PostgreSQL service...
set PG_SERVICE=
for %%S in (postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql-x64-14) do (
    if not defined PG_SERVICE (
        sc query %%S >nul 2>&1
        if !errorlevel! equ 0 set PG_SERVICE=%%S
    )
)
if defined PG_SERVICE (
    sc query !PG_SERVICE! | find "RUNNING" >nul 2>&1
    if !errorlevel! equ 0 (
        echo OK PostgreSQL service is RUNNING: !PG_SERVICE!
    ) else (
        echo WARN PostgreSQL service is NOT running: !PG_SERVICE!
        echo    Start it from Services - services.msc - then run:
        echo    net start !PG_SERVICE!
        set /a ERROR_COUNT+=1
    )
) else (
    echo WARN Could not detect PostgreSQL Windows service name
    echo    If psql works, the server may still be running - check services.msc
)
echo.

REM Check 6: Test PostgreSQL connection
where psql >nul 2>&1
if %errorlevel% equ 0 (
    echo [BONUS] Testing PostgreSQL connection...
    call "%~dp0scripts\load-db-env.bat"
    psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -c "SELECT version();" >nul 2>&1
    if !errorlevel! equ 0 (
        echo OK Can connect to PostgreSQL at !DB_HOST!:!DB_PORT! user !DB_USER!
    ) else (
        echo WARN Cannot connect to PostgreSQL at !DB_HOST!:!DB_PORT!
        echo    - PostgreSQL service may not be running
        echo    - Password in .env DB_PASSWORD may not match postgres user
        echo    - User !DB_USER! may not exist
        set /a ERROR_COUNT+=1
    )
    echo.
)

REM Check 7: Check if database exists
where psql >nul 2>&1
if %errorlevel% equ 0 (
    echo [BONUS] Checking if database exists...
    call "%~dp0scripts\load-db-env.bat"
    psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -lqt 2>nul | findstr /i "!DB_NAME!" >nul 2>&1
    if !errorlevel! equ 0 (
        echo OK Database !DB_NAME! exists
    ) else (
        echo WARN Database !DB_NAME! does NOT exist - run setup-database.bat
    )
    echo.
)

REM Check 8: node_modules
if exist "node_modules\" (
    echo [BONUS] Node.js dependencies...
    echo OK node_modules folder found
) else (
    echo [BONUS] Node.js dependencies...
    echo WARN node_modules folder NOT found - run: npm install
    set /a ERROR_COUNT+=1
)
echo.

REM Check branding folder
echo [BONUS] Branding folder...
if exist "branding\branding.json" (
    echo OK branding folder found
    if exist "branding\logo.png" (
        echo OK Custom logo.png found
    ) else if exist "branding\logo.jpg" (
        echo OK Custom logo.jpg found
    ) else (
        echo WARN No custom logo in branding/ - using bundled default
        echo    Optional: add branding/logo.png - upload via Settings - Umum
    )
) else (
    echo WARN branding folder not found - default logo will be used
)
echo.

REM Summary
echo ========================================
echo Summary
echo ========================================
echo.

if !ERROR_COUNT! equ 0 (
    echo OK All checks passed! Your system is ready.
    echo.
    echo Next steps:
    echo   1. If database does not exist, run: setup-database.bat
    echo   2. If node_modules missing, run: npm install
    echo   3. Then run: start-server.bat
) else (
    echo FAIL Found !ERROR_COUNT! issues that need to be fixed
    echo.
    echo Please fix the issues above before running the application.
    echo.
    echo Common fixes:
    echo   1. Install PostgreSQL: https://www.postgresql.org/
    echo   2. Install Node.js: https://nodejs.org/
    echo   3. Run this script from V2 folder
    echo   4. Start PostgreSQL service
    echo   5. Set DB_PASSWORD in .env to match your postgres password
    echo   6. Run: npm install
)

echo.
echo ========================================
echo.
echo Press any key to exit...
pause >nul
