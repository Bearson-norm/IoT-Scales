@echo off
REM ========================================
REM SUPER SAFE WRAPPER - Window AKAN tetap terbuka
REM ========================================

REM Pause IMMEDIATELY at start
echo.
echo ========================================
echo Setup Database - SAFE MODE
echo ========================================
echo.
echo This window will NEVER close automatically.
echo You can see all errors clearly.
echo.
echo Press any key to start...
pause >nul

REM Show environment info
echo.
echo === ENVIRONMENT INFO ===
echo Current Directory: %CD%
echo Script Location: %~dp0
echo Date/Time: %DATE% %TIME%
echo.

REM Check if setup-database.bat exists
echo === CHECKING FILES ===
if exist "setup-database.bat" (
    echo [OK] setup-database.bat found
) else (
    echo [ERROR] setup-database.bat NOT found!
    echo.
    echo Please make sure you are running this from the V2 folder.
    echo.
    goto :END
)

if exist "database\" (
    echo [OK] database folder found
) else (
    echo [WARNING] database folder NOT found
)
echo.

REM Try to run setup-database.bat
echo === STARTING SETUP ===
echo Running setup-database.bat...
echo.
echo ========================================
echo.

call setup-database.bat

REM Capture exit code
set EXIT_CODE=%errorlevel%

echo.
echo ========================================
echo === SETUP FINISHED ===
echo ========================================
echo.
echo Exit Code: %EXIT_CODE%
echo.

if %EXIT_CODE% equ 0 (
    echo Result: SUCCESS
) else (
    echo Result: FAILED or EXITED WITH ERROR
    echo.
    echo Please read the error messages above.
)

:END
echo.
echo ========================================
echo.
echo This window will stay open.
echo Press any key to close...
pause >nul




