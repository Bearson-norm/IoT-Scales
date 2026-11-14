@echo off
REM Start IoT Scales V2 WITHOUT showing CMD window - use this instead of IoT-scales-V2.exe
cd /d "%~dp0"
if exist "launcher\Start-IoT-Scales-Silent.vbs" (
    wscript.exe "%~dp0launcher\Start-IoT-Scales-Silent.vbs"
) else if exist "Start-IoT-Scales-Silent.vbs" (
    wscript.exe "%~dp0Start-IoT-Scales-Silent.vbs"
) else (
    echo Launcher not found. Run IoT-scales-V2.exe directly or rebuild package.
    pause
)
