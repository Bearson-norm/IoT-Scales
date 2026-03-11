@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo Building IoT Scales V2 Package
echo ========================================
echo.

REM Trap errors
set "ERROR_OCCURRED=0"

REM Ensure we're in the correct directory
cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    set "ERROR_OCCURRED=1"
    goto :END
)

REM Step 1: Build frontend
echo [1/5] Building React frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed!
    set "ERROR_OCCURRED=1"
    goto :END
)
echo ✅ Frontend build complete
echo.

REM Step 2: Install pkg globally if not installed
echo [2/5] Checking pkg installation...
where pkg >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing pkg globally...
    call npm install -g pkg
    if errorlevel 1 (
        echo ERROR: Failed to install pkg
        set "ERROR_OCCURRED=1"
        goto :END
    )
)
echo ✅ pkg is available
echo.

REM Step 3: Build executable
echo [3/5] Building executable...

REM Clean up old executables to avoid conflicts
echo   Checking for running processes...
REM Try to close any running instances first
tasklist /FI "IMAGENAME eq IoT-scales-V2.exe" 2>nul | find /I /N "IoT-scales-V2.exe">nul
if "%ERRORLEVEL%"=="0" (
    echo   ⚠️  Found running instance, attempting to close...
    taskkill /F /IM "IoT-scales-V2.exe" >nul 2>&1
    timeout /t 2 /nobreak >nul
)

REM Also check for node processes that might be running the server
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I /N "node.exe">nul
if "%ERRORLEVEL%"=="0" (
    echo   ⚠️  Warning: Node.js processes detected. Make sure server is not running.
)

REM Wait a moment before deleting
timeout /t 1 /nobreak >nul

REM Try to delete old executables with retries
echo   Cleaning up old executables...
if exist "release\IoT-scales-V2.exe" (
    REM Try delete with retries
    set "RETRY_COUNT=0"
    :DELETE_RETRY_1
    del /F /Q "release\IoT-scales-V2.exe" 2>nul
    if exist "release\IoT-scales-V2.exe" (
        set /a RETRY_COUNT+=1
        if !RETRY_COUNT! LSS 3 (
            echo   ⚠️  File locked, retrying... (!RETRY_COUNT!/3)
            timeout /t 2 /nobreak >nul
            goto DELETE_RETRY_1
        ) else (
            echo   ❌ Error: Could not delete old executable (may be in use)
            echo   Please close IoT-scales-V2.exe if it's running, then try again.
            set "ERROR_OCCURRED=1"
            goto :END
        )
    ) else (
        echo   ✅ Deleted old IoT-scales-V2.exe
    )
)

if exist "release\server.exe" (
    del /F /Q "release\server.exe" 2>nul
    if not exist "release\server.exe" echo   ✅ Deleted old server.exe
)
if exist "release\prisma-form-pro.exe" (
    del /F /Q "release\prisma-form-pro.exe" 2>nul
    if not exist "release\prisma-form-pro.exe" echo   ✅ Deleted old prisma-form-pro.exe
)

REM Build executable directly with output name (using -o for output)
if not exist "release" mkdir "release"
call pkg server.js --targets node18-win-x64 -o release\IoT-scales-V2.exe
if errorlevel 1 (
    echo ERROR: Packaging failed!
    set "ERROR_OCCURRED=1"
    goto :END
)

REM Verify executable was created
if exist "release\IoT-scales-V2.exe" (
    echo ✅ Executable created successfully
) else (
    REM Fallback: check for other names and rename
    if exist "release\server.exe" (
        ren "release\server.exe" "IoT-scales-V2.exe"
        echo ✅ Executable created and renamed from server.exe
    ) else if exist "release\prisma-form-pro.exe" (
        ren "release\prisma-form-pro.exe" "IoT-scales-V2.exe"
        echo ✅ Executable created and renamed from prisma-form-pro.exe
    ) else (
        echo ⚠️  Warning: Could not find executable in release folder
        echo    Please check if pkg build was successful
    )
)
echo.

REM Step 4: Copy native modules and other files
echo [4/5] Copying files to release directory...
if not exist "release" mkdir "release"

REM Copy serialport and all its dependencies (required for COM port access)
echo   Copying serialport module and dependencies...
if not exist "release\node_modules" mkdir "release\node_modules"

if exist "node_modules\serialport" (
    REM Copy serialport main module (recursive, including all files)
    xcopy /E /I /Y /Q node_modules\serialport release\node_modules\serialport >nul 2>&1
    if errorlevel 1 (
        echo   ⚠️  Warning: Failed to copy serialport module
    ) else (
        echo   ✅ Copied serialport module
    )
) else (
    echo   ⚠️  Warning: serialport module not found in node_modules
    echo   You may need to install it: npm install serialport
)

REM Copy @serialport scoped packages (CRITICAL for serialport 12.x)
if exist "node_modules\@serialport" (
    if not exist "release\node_modules\@serialport" mkdir "release\node_modules\@serialport"
    xcopy /E /I /Y /Q node_modules\@serialport release\node_modules\@serialport >nul 2>&1
    if errorlevel 1 (
        echo   ⚠️  Warning: Failed to copy @serialport scoped packages
    ) else (
        echo   ✅ Copied @serialport scoped packages
        REM Verify prebuilds exist (native bindings for serialport 12.x)
        if exist "release\node_modules\@serialport\bindings-cpp\prebuilds\win32-x64\node.napi.node" (
            echo   ✅ Found native bindings for win32-x64
        ) else (
            echo   ⚠️  Warning: Native bindings for win32-x64 not found
            echo      Serialport may not work properly
        )
    )
) else (
    echo   ⚠️  Warning: @serialport folder not found
    echo   Serialport may not work - dependencies may not be installed correctly
)

REM Copy additional serialport dependencies that might be needed
REM These are typically in nested node_modules or at root level
if exist "node_modules\debug" (
    if not exist "release\node_modules\debug" (
        xcopy /E /I /Y /Q node_modules\debug release\node_modules\debug >nul 2>&1
        if not errorlevel 1 echo   ✅ Copied debug dependency
    )
)

if exist "node_modules\node-gyp-build" (
    if not exist "release\node_modules\node-gyp-build" (
        xcopy /E /I /Y /Q node_modules\node-gyp-build release\node_modules\node-gyp-build >nul 2>&1
        if not errorlevel 1 echo   ✅ Copied node-gyp-build dependency
    )
)

if exist "node_modules\node-addon-api" (
    if not exist "release\node_modules\node-addon-api" (
        xcopy /E /I /Y /Q node_modules\node-addon-api release\node_modules\node-addon-api >nul 2>&1
        if not errorlevel 1 echo   ✅ Copied node-addon-api dependency
    )
)

REM Copy dist folder
if exist "dist" (
    echo   Copying dist folder...
    xcopy /E /I /Y /Q dist release\dist >nul
    echo   ✅ Copied dist
)

REM Copy database folder
if exist "database" (
    echo   Copying database folder...
    xcopy /E /I /Y /Q database release\database >nul
    echo   ✅ Copied database
)

REM Create uploads directory
if not exist "release\uploads" mkdir "release\uploads"
echo   ✅ Created uploads directory

REM Copy package.json
if exist "package.json" (
    copy /Y package.json release\package.json >nul
    echo   ✅ Copied package.json
)

REM Copy README if exists
if exist "README.md" (
    copy /Y README.md release\README.md >nul
    echo   ✅ Copied README.md
)

REM Copy setup-database.bat if exists
if exist "setup-database.bat" (
    copy /Y setup-database.bat release\setup-database.bat >nul
    echo   ✅ Copied setup-database.bat
)

REM Copy printer-config.json if exists (for fallback printer detection)
if exist "printer-config.json" (
    copy /Y printer-config.json release\printer-config.json >nul
    echo   ✅ Copied printer-config.json
)

REM Copy scale-config.json if exists
if exist "scale-config.json" (
    copy /Y scale-config.json release\scale-config.json >nul
    echo   ✅ Copied scale-config.json
)

REM Copy .env file if exists (for database configuration)
if exist ".env" (
    copy /Y .env release\.env >nul
    echo   Copied .env
) else if exist "env.example" (
    echo   .env not found, copying env.example as .env template
    copy /Y env.example release\.env >nul
)
echo.

REM Step 5: Create run script
echo [5/5] Creating run script...
(
echo @echo off
echo cd /d "%%~dp0"
echo echo Starting IoT Scales V2...
echo echo Server will be available at: http://localhost:3001
echo echo.
echo IoT-scales-V2.exe
echo pause
) > release\run.bat
echo ✅ Created run.bat
echo.

REM Step 6: Verify serialport installation
echo [6/6] Verifying serialport installation...
set "VERIFY_OK=1"

REM Check serialport module exists
if not exist "release\node_modules\serialport" (
    echo   ❌ serialport module not found
    set "VERIFY_OK=0"
) else (
    echo   ✅ serialport module found
)

REM Check @serialport scoped packages
if not exist "release\node_modules\@serialport" (
    echo   ❌ @serialport packages not found
    set "VERIFY_OK=0"
) else (
    echo   ✅ @serialport packages found
)

REM Check native bindings (most important)
if exist "release\node_modules\@serialport\bindings-cpp\prebuilds\win32-x64\node.napi.node" (
    echo   ✅ Native bindings for win32-x64 found
) else (
    echo   ⚠️  Warning: Native bindings for win32-x64 not found
    echo      Serialport may not work properly
    echo      Check: release\node_modules\@serialport\bindings-cpp\prebuilds\win32-x64\
)

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo 📁 Release files are in: release\
echo 📄 Executable: release\IoT-scales-V2.exe
echo 📄 Run script: release\run.bat
echo.
if "!VERIFY_OK!"=="1" (
    echo ✅ Serialport module verified - ready for standalone use!
) else (
    echo ⚠️  Warning: Serialport verification had issues
    echo    Please check the errors above
)
echo.
echo Next steps:
echo   1. Test the executable: cd release ^&^& IoT-scales-V2.exe
echo   2. Or use run.bat: cd release ^&^& run.bat
echo   3. Build installer (optional): iscc installer.iss
echo   4. Test serialport functionality by connecting to a COM port
echo.

:END
if "%ERROR_OCCURRED%"=="1" (
    echo.
    echo ========================================
    echo ❌ Build failed with errors!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ========================================
    echo ✅ Build completed successfully!
    echo ========================================
    echo.
    pause
    exit /b 0
)

