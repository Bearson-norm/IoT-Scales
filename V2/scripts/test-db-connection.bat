@echo off
setlocal enabledelayedexpansion

echo ========================================
echo IoT Scales V2 - PostgreSQL Connection Test
echo ========================================
echo.

if not defined DB_HOST set "DB_HOST=localhost"
if not defined DB_PORT set "DB_PORT=5432"
if not defined DB_USER set "DB_USER=postgres"
if not defined DB_NAME set "DB_NAME=FLB_MOWS"
if not defined PGPASSWORD set "PGPASSWORD=Admin123"

set "LOAD_DB_ENV="
if exist "%~dp0load-db-env.bat" set "LOAD_DB_ENV=%~dp0load-db-env.bat"
if not defined LOAD_DB_ENV if exist "%~dp0..\scripts\load-db-env.bat" set "LOAD_DB_ENV=%~dp0..\scripts\load-db-env.bat"
if not defined LOAD_DB_ENV if exist "%~dp0scripts\load-db-env.bat" set "LOAD_DB_ENV=%~dp0scripts\load-db-env.bat"
if defined LOAD_DB_ENV call "%LOAD_DB_ENV%"

echo [1] Configuration
echo     Host:     %DB_HOST%
echo     Port:     %DB_PORT%
echo     User:     %DB_USER%
echo     Database: %DB_NAME%
if defined PGPASSWORD (
    echo     Password: *** set ***
) else (
    echo     Password: NOT SET
)
echo.

echo [2] psql command available?
where psql >nul 2>&1
if errorlevel 1 (
    echo     FAIL - psql not found in PATH
    echo     Install PostgreSQL and add its bin folder to PATH, e.g.:
    echo       C:\Program Files\PostgreSQL\16\bin
    goto :end
)
for /f "tokens=*" %%i in ('psql --version 2^>nul') do echo     OK - %%i
echo.

echo [3] PostgreSQL Windows service
set "SVC_FOUND=0"
for /f "tokens=1,*" %%a in ('sc query type^= service state^= all ^| findstr /i "postgresql"') do (
    echo     %%a %%b
    set "SVC_FOUND=1"
)
if "!SVC_FOUND!"=="0" (
    echo     WARN - no service name containing "postgresql" found
    echo     Check Services.msc manually
) else (
    sc query type= service state= all | findstr /i "postgresql" >nul 2>&1
)
echo.

echo [4] TCP port %DB_PORT% listening?
netstat -an | findstr ":%DB_PORT% " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo     FAIL - nothing listening on port %DB_PORT%
    echo     PostgreSQL may not be running, or uses a different port
) else (
    echo     OK - port %DB_PORT% is in use
    netstat -an | findstr ":%DB_PORT% " | findstr "LISTENING"
)
echo.

echo [5] Connection test (shows real error below)
echo ----------------------------------------
set "PGPASSWORD=%PGPASSWORD%"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT version();"
set "CONN_ERR=!errorlevel!"
echo ----------------------------------------
echo.

if "!CONN_ERR!"=="0" (
    echo RESULT: SUCCESS - PostgreSQL connection OK
    echo You can run setup-database.bat now.
) else (
    echo RESULT: FAILED
    echo.
    echo Common fixes:
    echo   A) Service not running:
    echo        services.msc -^> start "postgresql-x64-..." 
    echo   B) Wrong password:
    echo        Edit .env DB_PASSWORD=your_actual_postgres_password
    echo        Test login in pgAdmin with user postgres first
    echo   C) PostgreSQL not installed:
    echo        https://www.postgresql.org/download/windows/
    echo   D) Wrong port:
    echo        Check pgAdmin connection - update DB_PORT in .env
)

:end
echo.
pause
