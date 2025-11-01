@echo off
echo ========================================
echo IoT Scales V2 - Database Setup
echo ========================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL from https://www.postgresql.org/
    pause
    exit /b 1
)

echo [1/6] Checking PostgreSQL connection...
psql -U postgres -c "SELECT version();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to PostgreSQL
    echo Please ensure PostgreSQL service is running
    pause
    exit /b 1
)
echo ✅ PostgreSQL is running

echo.
echo [2/6] Creating database FLB_MOWS...
REM Drop database if exists (case-sensitive with quotes)
psql -U postgres -c "DROP DATABASE IF EXISTS \"FLB_MOWS\";" >nul 2>&1
REM Wait a moment for drop to complete
timeout /t 1 /nobreak >nul 2>&1
REM Create database (case-sensitive with quotes)
psql -U postgres -c "CREATE DATABASE \"FLB_MOWS\";" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Failed to create database, checking if it already exists...
    REM Check if database exists
    psql -U postgres -lqt | findstr /i "FLB_MOWS" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ⚠️  Database already exists, continuing...
    ) else (
        echo ❌ ERROR: Failed to create database FLB_MOWS
        pause
        exit /b 1
    )
) else (
    echo ✅ Database created successfully
)
REM Verify database was created
psql -U postgres -lqt | findstr /i "FLB_MOWS" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Database FLB_MOWS was not created successfully
    pause
    exit /b 1
)

echo.
echo [3/6] Importing database schema...
REM Try to find schema.sql in current directory (for release folder) or parent directory
if exist "database\schema.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import database schema
        pause
        exit /b 1
    )
    echo ✅ Schema imported successfully
) else if exist "..\database\schema.sql" (
    psql -U postgres -d "FLB_MOWS" -f ..\database\schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import database schema
        pause
        exit /b 1
    )
    echo ✅ Schema imported successfully
) else (
    echo ⚠️  Schema file not found, skipping...
    echo    Searched: database\schema.sql and ..\database\schema.sql
)

echo.
echo [4/6] Importing core schema...
if exist "database\init\01-core-schema.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\init\01-core-schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import core schema
        pause
        exit /b 1
    )
    echo ✅ Core schema imported successfully
) else if exist "..\database\init\01-core-schema.sql" (
    psql -U postgres -d "FLB_MOWS" -f ..\database\init\01-core-schema.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import core schema
        pause
        exit /b 1
    )
    echo ✅ Core schema imported successfully
) else (
    echo ⚠️  Core schema file not found, skipping...
)

echo.
echo [5/6] Importing weighing tables...
if exist "database\init\02-weighing.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\init\02-weighing.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import weighing tables
        pause
        exit /b 1
    )
    echo ✅ Weighing tables imported successfully
) else if exist "..\database\init\02-weighing.sql" (
    psql -U postgres -d "FLB_MOWS" -f ..\database\init\02-weighing.sql
    if %errorlevel% neq 0 (
        echo ERROR: Failed to import weighing tables
        pause
        exit /b 1
    )
    echo ✅ Weighing tables imported successfully
) else (
    echo ⚠️  Weighing tables file not found, skipping...
    echo    Searched: database\init\02-weighing.sql and ..\database\init\02-weighing.sql
)

echo.
echo [6/6] Verifying database setup...
psql -U postgres -d "FLB_MOWS" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Could not verify database setup
) else (
    echo ✅ Database setup complete
)

echo.
echo ========================================
echo Database Setup Complete!
echo ========================================
echo.
echo Database Configuration:
echo   Host: localhost
echo   Port: 5432
echo   Database: FLB_MOWS
echo   Username: postgres
echo   Password: Admin123
echo.
pause

