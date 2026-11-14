@echo off
REM Wipe and recreate database - ALL production data will be deleted
REM For normal updates use setup-database.bat (preserves data)
call "%~dp0setup-database.bat" fresh
