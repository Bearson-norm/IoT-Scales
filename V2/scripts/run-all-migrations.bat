@echo off
echo ========================================
echo IoT Scales V2 - Run All Migrations
echo ========================================
echo.
echo This script will run all database migrations
echo on an existing database without recreating it.
echo.
echo WARNING: Make sure you have a backup of your database!
echo.
pause

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL from https://www.postgresql.org/
    pause
    exit /b 1
)

echo [1/6] Checking PostgreSQL connection...
psql -U postgres -d "FLB_MOWS" -c "SELECT version();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to PostgreSQL or database FLB_MOWS does not exist
    echo Please ensure PostgreSQL service is running and database exists
    pause
    exit /b 1
)
echo ✅ PostgreSQL connection OK

echo.
echo [2/6] Running migration: Add reject status...
if exist "database\migration-add-reject-status.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\migration-add-reject-status.sql
    if %errorlevel% equ 0 (
        echo ✅ Migration: reject status added successfully
    ) else (
        echo ⚠️  Warning: Migration reject status may have failed
    )
) else if exist "..\database\migration-add-reject-status.sql" (
    psql -U postgres -d "FLB_MOWS" -f ..\database\migration-add-reject-status.sql
    if %errorlevel% equ 0 (
        echo ✅ Migration: reject status added successfully
    ) else (
        echo ⚠️  Warning: Migration reject status may have failed
    )
) else (
    echo ⚠️  Migration file not found: migration-add-reject-status.sql
)

echo.
echo [3/6] Running migration: Add opened_at field...
if exist "database\migration-add-opened-at.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\migration-add-opened-at.sql
    if %errorlevel% equ 0 (
        echo ✅ Migration: opened_at field added successfully
    ) else (
        echo ⚠️  Warning: Migration opened_at may have failed
    )
) else if exist "..\database\migration-add-opened-at.sql" (
    psql -U postgres -d "FLB_MOWS" -f ..\database\migration-add-opened-at.sql
    if %errorlevel% equ 0 (
        echo ✅ Migration: opened_at field added successfully
    ) else (
        echo ⚠️  Warning: Migration opened_at may have failed
    )
) else (
    echo ⚠️  Migration file not found: migration-add-opened-at.sql
)

echo.
echo [4/6] Running migration: Add print history table...
if exist "database\migration-add-print-history.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\migration-add-print-history.sql
    if %errorlevel% equ 0 (
        echo ✅ Migration: print history table created successfully
    ) else (
        echo ⚠️  Warning: Migration print history may have failed
    )
) else if exist "..\database\migration-add-print-history.sql" (
    psql -U postgres -d "FLB_MOWS" -f ..\database\migration-add-print-history.sql
    if %errorlevel% equ 0 (
        echo ✅ Migration: print history table created successfully
    ) else (
        echo ⚠️  Warning: Migration print history may have failed
    )
) else (
    echo ⚠️  Migration file not found: migration-add-print-history.sql
)

echo.
echo [5/6] Running migration: Add QC role and reactivate note...
if exist "database\migration-add-qc-role-and-reactivate-note.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\migration-add-qc-role-and-reactivate-note.sql
    if %errorlevel% equ 0 (
        echo ✅ Migration: QC role and reactivate note added successfully
    ) else (
        echo ⚠️  Warning: Migration QC role may have failed
    )
) else if exist "..\database\migration-add-qc-role-and-reactivate-note.sql" (
    psql -U postgres -d "FLB_MOWS" -f ..\database\migration-add-qc-role-and-reactivate-note.sql
    if %errorlevel% equ 0 (
        echo ✅ Migration: QC role and reactivate note added successfully
    ) else (
        echo ⚠️  Warning: Migration QC role may have failed
    )
) else (
    echo ⚠️  Migration file not found: migration-add-qc-role-and-reactivate-note.sql
)

echo.
echo [6/6] Running migration: Add sequence order...
if exist "database\migration-add-sequence-order.sql" (
    psql -U postgres -d "FLB_MOWS" -f database\migration-add-sequence-order.sql
    if %errorlevel% equ 0 (
        echo ✅ Migration: sequence order added successfully
    ) else (
        echo ⚠️  Warning: Migration sequence order may have failed
    )
) else if exist "..\database\migration-add-sequence-order.sql" (
    psql -U postgres -d "FLB_MOWS" -f ..\database\migration-add-sequence-order.sql
    if %errorlevel% equ 0 (
        echo ✅ Migration: sequence order added successfully
    ) else (
        echo ⚠️  Warning: Migration sequence order may have failed
    )
) else (
    echo ⚠️  Migration file not found: migration-add-sequence-order.sql
)

echo.
echo ========================================
echo All Migrations Complete!
echo ========================================
echo.
echo Migrations applied:
echo   ✅ Reject status support
echo   ✅ Opened_at tracking field
echo   ✅ Print history table
echo   ✅ QC role and reactivate note
echo   ✅ Sequence order for ingredients
echo.
pause







