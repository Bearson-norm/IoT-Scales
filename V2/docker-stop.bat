@echo off
echo ========================================
echo IoT Scales V2 - Docker Stop
echo ========================================
echo.

echo Stopping all services...
call npm run docker:down

echo.
echo ========================================
echo All services stopped!
echo ========================================
echo.
echo To start again: npm run docker:up
echo To clean everything: npm run docker:clean
echo.
pause



