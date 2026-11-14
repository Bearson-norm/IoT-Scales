@echo off
setlocal enabledelayedexpansion
echo ========================================
echo IoT Scales V2 - Full Setup (Windows)
echo ========================================
echo.
echo Recommended setup path:
echo   1. check-requirements.bat
echo   2. setup-database.bat  (upgrade DB + migrations, preserves data)
echo   3. npm run dev:full    (backend :3001 + frontend :3000)
echo.
echo NOTE: setup.bat does NOT create folder release/
echo       release/ + IoT-scales-V2.exe = run build-package.bat (production package)
echo.

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js OK.

echo.
echo [2/4] Checking PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL not found. Install from https://www.postgresql.org/
    pause
    exit /b 1
)
echo PostgreSQL OK.

echo.
echo [3/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

if not exist ".env" (
    if exist "env.example" (
        echo Creating .env from env.example...
        copy /Y env.example .env >nul
    )
)

echo.
echo [4/4] Running database setup - upgrade mode, data preserved...
call "%~dp0setup-database.bat"
if %errorlevel% neq 0 (
    echo ERROR: Database setup failed. Try setup-database-debug.bat for details.
    pause
    exit /b 1
)

echo.
if not exist "release\IoT-scales-V2.exe" (
    echo INFO: Folder release/ belum ada - ini normal setelah setup.bat
    echo       setup.bat = lingkungan development ^(npm run dev:full^)
    echo       Untuk .exe portable / installer: jalankan build-package.bat
    echo.
)

echo ========================================
echo Setup complete.
echo.
echo To start the application:
echo   npm run dev:full     ^(backend :3001 + frontend :3000^)
echo   start-server.bat     ^(backend only :3001^)
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo   Login:    admin / admin123
echo ========================================
echo.
pause
