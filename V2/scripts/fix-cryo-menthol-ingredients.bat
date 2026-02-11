@echo off
setlocal enabledelayedexpansion
echo ========================================
echo Fix CRYO-MENTHOL IP-CM0006 Ingredients
echo ========================================
echo.
echo This script will:
echo   - Show all current ingredients
echo   - Deactivate ingredients that are NOT MC-001 or MP-001
echo   - Ensure only MC-001 (100g) and MP-001 (900g) are active
echo.

REM Set default password (can be overridden by environment variable)
if "%PGPASSWORD%"=="" (
    set PGPASSWORD=Admin123
)

REM Detect script location and set migration path
set "SCRIPT_DIR=%~dp0"
set "MIGRATION_FILE="

REM Check multiple possible locations for migration file
if exist "%SCRIPT_DIR%..\database\migrations\fix-cryo-menthol-ingredients.sql" (
    set "MIGRATION_FILE=%SCRIPT_DIR%..\database\migrations\fix-cryo-menthol-ingredients.sql"
) else if exist "%SCRIPT_DIR%database\migrations\fix-cryo-menthol-ingredients.sql" (
    set "MIGRATION_FILE=%SCRIPT_DIR%database\migrations\fix-cryo-menthol-ingredients.sql"
) else (
    REM Try current directory
    cd /d "%~dp0"
    if exist "database\migrations\fix-cryo-menthol-ingredients.sql" (
        set "MIGRATION_FILE=database\migrations\fix-cryo-menthol-ingredients.sql"
    ) else if exist "..\database\migrations\fix-cryo-menthol-ingredients.sql" (
        set "MIGRATION_FILE=..\database\migrations\fix-cryo-menthol-ingredients.sql"
    )
)

if "!MIGRATION_FILE!"=="" (
    echo ERROR: Migration file not found!
    echo.
    echo Searched in:
    echo   - %SCRIPT_DIR%..\database\migrations\
    echo   - %SCRIPT_DIR%database\migrations\
    echo   - database\migrations\
    echo   - ..\database\migrations\
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
    echo ERROR: PostgreSQL is not installed or not in PATH
    pause
    exit /b 1
)

echo Checking PostgreSQL connection...
set PGPASSWORD=%PGPASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -c "SELECT version();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to PostgreSQL
    echo If password is not Admin123, set it using:
    echo   set PGPASSWORD=your_password
    pause
    exit /b 1
)
echo PostgreSQL is running
echo.

echo Running SQL script to fix ingredients...
set PGPASSWORD=%PGPASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "!MIGRATION_FILE!"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Fix completed successfully!
    echo ========================================
    echo.
    echo CRYO-MENTHOL IP-CM0006 should now have only 2 active ingredients:
    echo   - MC-001 (MENTHOLIC CRYSTALS) - 100g
    echo   - MP-001 (MATERIAL PG SKPIC) - 900g
    echo.
) else (
    echo.
    echo ========================================
    echo Failed to fix ingredients!
    echo ========================================
    echo.
)

pause
