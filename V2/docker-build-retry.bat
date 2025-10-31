@echo off
echo ========================================
echo IoT Scales V2 - Docker Build Script
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

echo Cleaning up previous builds...
docker-compose down --remove-orphans >nul 2>&1
docker system prune -f >nul 2>&1

echo.
echo Building with network retry strategy...
echo This may take several minutes due to network optimization...

REM Try building with the simple Dockerfile first
echo Attempting build with simple Dockerfile...
docker-compose build --no-cache app
if %errorlevel% neq 0 (
    echo.
    echo First build attempt failed. Trying alternative approach...
    echo.
    
    REM Try with the original Dockerfile
    docker-compose build --no-cache --build-arg BUILDKIT_INLINE_CACHE=1 app
    if %errorlevel% neq 0 (
        echo.
        echo Build failed. This might be due to network issues.
        echo.
        echo Troubleshooting steps:
        echo 1. Check your internet connection
        echo 2. Try running: docker system prune -f
        echo 3. Restart Docker Desktop
        echo 4. Try building without cache: docker-compose build --no-cache
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Build completed successfully!
echo.

echo Starting services...
docker-compose up -d
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
echo To view logs: docker-compose logs -f
echo To stop services: docker-compose down
echo.
echo Press any key to continue...
pause >nul



