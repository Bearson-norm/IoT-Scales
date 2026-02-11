@echo off
echo Starting IoT Scales V2 Server...
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if server.js exists
if not exist "server.js" (
    echo ERROR: server.js not found in current directory
    echo Current directory: %CD%
    echo Please run this script from the V2 folder
    echo.
    pause
    exit /b 1
)

REM Check if port 3001 is in use
netstat -ano | findstr :3001 >nul 2>&1
if %errorlevel% equ 0 (
    echo Port 3001 is already in use. Stopping existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 2 >nul
    echo Existing process stopped.
    echo.
)

REM Start the server
echo Starting server on port 3001...
echo Server will be available at: http://localhost:3001
echo API endpoints available at: http://localhost:3001/api/
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js

REM If server exits with error, pause to show error message
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Server exited with error code %errorlevel%
    echo.
    pause
)

