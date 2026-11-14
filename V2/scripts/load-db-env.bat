@echo off
REM Load database connection settings from .env (call from setup scripts)
REM NOTE: Do NOT use setlocal here — variables must propagate to the caller.

if not defined DB_HOST set "DB_HOST=localhost"
if not defined DB_PORT set "DB_PORT=5432"
if not defined DB_USER set "DB_USER=postgres"
if not defined DB_NAME set "DB_NAME=FLB_MOWS"
if not defined PGPASSWORD set "PGPASSWORD=Admin123"

set "ENV_FILE="
if exist "%~dp0..\.env" set "ENV_FILE=%~dp0..\.env"
if "%ENV_FILE%"=="" if exist "%~dp0.env" set "ENV_FILE=%~dp0.env"
if "%ENV_FILE%"=="" if exist "%CD%\.env" set "ENV_FILE=%CD%\.env"

if not "%ENV_FILE%"=="" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%ENV_FILE%") do (
        if /i "%%a"=="DB_HOST" if not "%%b"=="" set "DB_HOST=%%b"
        if /i "%%a"=="DB_PORT" if not "%%b"=="" set "DB_PORT=%%b"
        if /i "%%a"=="DB_USER" if not "%%b"=="" set "DB_USER=%%b"
        if /i "%%a"=="DB_NAME" if not "%%b"=="" set "DB_NAME=%%b"
        if /i "%%a"=="DB_PASSWORD" if not "%%b"=="" set "PGPASSWORD=%%b"
    )
)
