@echo off
REM Debug version of build-package.bat that keeps window open on error
setlocal enabledelayedexpansion

echo ========================================
echo Building IoT Scales V2 Package (DEBUG)
echo ========================================
echo.
echo Working directory: %CD%
echo Script location: %~dp0
echo.
pause

REM Continue with normal build
call build-package.bat

if errorlevel 1 (
    echo.
    echo ========================================
    echo ❌ BUILD FAILED - DEBUG MODE
    echo ========================================
    echo.
    echo Press any key to close...
    pause >nul
    exit /b 1
)




























