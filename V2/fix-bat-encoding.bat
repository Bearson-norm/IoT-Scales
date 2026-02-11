@echo off
echo ========================================
echo Fix .BAT File Encoding
echo ========================================
echo.
echo This script will recreate setup-database.bat with correct encoding.
echo.
echo Press any key to continue...
pause >nul

REM Backup original file
if exist "setup-database.bat" (
    echo Backing up original file...
    copy "setup-database.bat" "setup-database.bat.backup" >nul
    echo ✅ Backup created: setup-database.bat.backup
    echo.
)

echo Creating new setup-database.bat with ANSI encoding...
echo.

REM Note: This will prompt user to manually save with correct encoding
echo ========================================
echo MANUAL STEPS REQUIRED:
echo ========================================
echo.
echo 1. Open setup-database.bat with Notepad
echo 2. Click File → Save As
echo 3. At the bottom, change "Encoding" to: ANSI
echo 4. Click Save
echo 5. Confirm to replace the file
echo.
echo This will fix encoding issues!
echo.
echo ========================================
echo.
echo Opening Notepad now...
echo Please follow the steps above.
echo.
pause

notepad setup-database.bat

echo.
echo ========================================
echo.
echo Did you save the file with ANSI encoding?
echo If yes, the file should now work correctly!
echo.
echo Test it by running: setup-database.bat
echo.
pause




