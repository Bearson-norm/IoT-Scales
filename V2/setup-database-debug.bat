@echo off
echo ========================================
echo Setup Database - Debug Mode
echo ========================================
echo.
echo This wrapper will keep the window open even if errors occur.
echo This helps you see what went wrong.
echo.
echo Press any key to start setup...
pause >nul
echo.

REM Show current directory
echo Current directory: %CD%
echo.

REM Run the actual setup script
call setup-database.bat

REM Capture exit code
set SETUP_EXIT_CODE=%errorlevel%

echo.
echo ========================================
echo Setup finished with exit code: %SETUP_EXIT_CODE%
echo ========================================
echo.

if %SETUP_EXIT_CODE% neq 0 (
    echo ⚠️  Setup failed or exited with error
    echo.
    echo Common issues:
    echo   1. PostgreSQL not installed or not in PATH
    echo   2. PostgreSQL service not running
    echo   3. Wrong password (not Admin123)
    echo   4. Database files not found
    echo.
    echo Try running check-requirements.bat first!
) else (
    echo ✅ Setup completed successfully!
)

echo.
echo Window will stay open. Press any key to close...
pause >nul
