@echo off
REM Wipe and recreate database - preserves master_user only, no sample master data
REM For full wipe including users: setup-database-fresh.bat
call "%~dp0setup-database.bat" fresh-keep-users
