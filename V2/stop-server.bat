@echo off
echo Stopping IoT Scales V2 Server...
echo.

REM Find and kill processes using port 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Stopping process PID %%a...
    taskkill /PID %%a /F >nul 2>&1
    if %errorlevel% equ 0 (
        echo Process %%a stopped successfully.
    ) else (
        echo Failed to stop process %%a.
    )
)

echo.
echo Server stopped.
pause

