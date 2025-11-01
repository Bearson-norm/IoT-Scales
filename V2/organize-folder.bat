@echo off
echo ========================================
echo Organizing Folder Structure
echo ========================================
echo.

REM Step 1: Move documentation files to docs/
echo [1/5] Moving documentation files to docs/...
if not exist "docs" mkdir docs

if exist "API_INTEGRATION_GUIDE.md" move "API_INTEGRATION_GUIDE.md" "docs\"
if exist "CARA_MELANJUTKAN.md" move "CARA_MELANJUTKAN.md" "docs\"
if exist "CARA_MENGATASI_ERROR.md" move "CARA_MENGATASI_ERROR.md" "docs\"
if exist "CARA_MENJALANKAN.md" move "CARA_MENJALANKAN.md" "docs\"
if exist "CLEANUP.md" move "CLEANUP.md" "docs\"
if exist "DATABASE_CONFIGURATION.md" move "DATABASE_CONFIGURATION.md" "docs\"
if exist "DATABASE_DATA_REPORT.md" move "DATABASE_DATA_REPORT.md" "docs\"
if exist "DATABASE_IMPORT_FEATURE.md" move "DATABASE_IMPORT_FEATURE.md" "docs\"
if exist "DATABASE_IMPORT_STATUS.md" move "DATABASE_IMPORT_STATUS.md" "docs\"
if exist "DATABASE_SETTINGS_UI_FLOW.md" move "DATABASE_SETTINGS_UI_FLOW.md" "docs\"
if exist "DATABASE_STRUCTURE_UPDATE.md" move "DATABASE_STRUCTURE_UPDATE.md" "docs\"
if exist "FORMULA_IMPORT_COMPLETE_GUIDE.md" move "FORMULA_IMPORT_COMPLETE_GUIDE.md" "docs\"
if exist "FORMULA_IMPORT_FEATURES.md" move "FORMULA_IMPORT_FEATURES.md" "docs\"
if exist "IMPORT_FIX_SUMMARY.md" move "IMPORT_FIX_SUMMARY.md" "docs\"
if exist "IMPORT_LOGGING_FEATURES.md" move "IMPORT_LOGGING_FEATURES.md" "docs\"
if exist "PACKAGING_GUIDE.md" move "PACKAGING_GUIDE.md" "docs\"
if exist "QUICK_START.md" move "QUICK_START.md" "docs\"
if exist "QUICK_STATS_FIX.md" move "QUICK_STATS_FIX.md" "docs\"
if exist "SERIALPORT_PACKAGING.md" move "SERIALPORT_PACKAGING.md" "docs\"
if exist "SERVER_TROUBLESHOOTING.md" move "SERVER_TROUBLESHOOTING.md" "docs\"
if exist "SETUP_GUIDE.md" move "SETUP_GUIDE.md" "docs\"
if exist "TESTING_INSTRUCTIONS.md" move "TESTING_INSTRUCTIONS.md" "docs\"
if exist "TROUBLESHOOTING.md" move "TROUBLESHOOTING.md" "docs\"
if exist "UI_ENHANCEMENTS.md" move "UI_ENHANCEMENTS.md" "docs\"
if exist "UI_MASTER_PRODUCT_UPDATE.md" move "UI_MASTER_PRODUCT_UPDATE.md" "docs\"

echo ✅ Documentation files moved

REM Step 2: Create scripts folder and move batch files
echo.
echo [2/5] Creating scripts/ folder and moving batch files...
if not exist "scripts" mkdir scripts

REM Keep essential batch files in root, move others to scripts
if exist "fix-database.bat" move "fix-database.bat" "scripts\"
if exist "quick-fix.bat" move "quick-fix.bat" "scripts\"
if exist "setup-fix.bat" move "setup-fix.bat" "scripts\"

REM Keep these in root (they are frequently used):
REM - setup.bat (main setup)
REM - setup-database.bat (database setup)
REM - build-package.bat (packaging)
REM - start-server.bat (start server)
REM - stop-server.bat (stop server)

echo ✅ Batch files organized

REM Step 3: Create samples folder and move test files
echo.
echo [3/5] Creating samples/ folder and moving test files...
if not exist "samples" mkdir samples

if exist "test-import.csv" move "test-import.csv" "samples\"
if exist "populate-formulation-ingredients.js" move "populate-formulation-ingredients.js" "samples\"

REM Move Excel/CSV files with spaces in name
for %%f in ("Formula to Input*.xlsx") do move "%%f" "samples\" 2>nul
for %%f in ("Formula to Input*.csv") do move "%%f" "samples\" 2>nul

echo ✅ Sample files moved

REM Step 4: Clean Hardware/build folder
echo.
echo [4/5] Cleaning Hardware/build folder...
if exist "Hardware\build" (
    rmdir /S /Q "Hardware\build" 2>nul
    if exist "Hardware\build" (
        echo ⚠️  Warning: Could not delete Hardware\build (may be in use)
    ) else (
        echo ✅ Hardware\build folder cleaned
    )
)

REM Step 5: Create .gitignore if not exists
echo.
echo [5/5] Creating/updating .gitignore...
(
echo # Dependencies
echo node_modules/
echo release/node_modules/
echo Hardware/node_modules/
echo.
echo # Build outputs
echo dist/
echo release/*.exe
echo Hardware/build/
echo.
echo # Logs
echo *.log
echo npm-debug.log*
echo.
echo # Environment
echo .env
echo .env.local
echo.
echo # IDE
echo .vscode/
echo .idea/
echo *.swp
echo *.swo
echo *~
echo.
echo # OS
echo .DS_Store
echo Thumbs.db
echo.
echo # Uploads and temp files
echo uploads/*
echo !uploads/.gitkeep
echo release/uploads/*
echo !release/uploads/.gitkeep
echo.
echo # Test files
echo test-*.csv
echo Formula to Input*.xlsx
echo Formula to Input*.csv
echo.
echo # Build artifacts
echo *.exe
echo !release/*.exe
) > .gitignore 2>nul

echo ✅ .gitignore created/updated

echo.
echo ========================================
echo Folder Organization Complete!
echo ========================================
echo.
echo Summary:
echo   ✅ Documentation files moved to docs/
echo   ✅ Scripts organized in scripts/ folder
echo   ✅ Sample files moved to samples/
echo   ✅ Hardware/build folder cleaned
echo   ✅ .gitignore created
echo.
echo Note: Essential batch files remain in root for easy access:
echo   - setup.bat
echo   - setup-database.bat
echo   - build-package.bat
echo   - start-server.bat
echo   - stop-server.bat
echo.
pause

