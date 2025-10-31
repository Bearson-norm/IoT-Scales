@echo off
echo ========================================
echo IoT Scales V2 - Docker Deployment
echo ========================================
echo.

echo Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running!
    echo Please install Docker Desktop and start it.
    pause
    exit /b 1
)

echo Docker is available.
echo.

echo Building Docker images...
call npm run docker:build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build Docker images!
    pause
    exit /b 1
)

echo.
echo Starting services...
call npm run docker:up
if %errorlevel% neq 0 (
    echo ERROR: Failed to start services!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment completed successfully!
echo ========================================
echo.
echo Services running:
echo - Main Application: http://localhost:3001
echo - Database: localhost:5432
echo - pgAdmin: http://localhost:8080 (optional)
echo.
echo To view logs: npm run docker:logs
echo To stop services: npm run docker:down
echo.
echo Press any key to continue...
pause >nul



