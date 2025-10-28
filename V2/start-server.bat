@echo off
echo Starting IoT Scales V2 Server...
echo.

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

