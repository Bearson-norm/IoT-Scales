@echo off
REM =============================================
REM Script: Setup User PostgreSQL untuk KMI_MOWS
REM =============================================
REM Script ini akan membuat user 'admin' dengan password 'admin123'
REM dan memberikan semua privileges pada database KMI_MOWS
REM =============================================

echo ========================================
echo Setup User PostgreSQL untuk KMI_MOWS
echo ========================================
echo.

REM Cek apakah PostgreSQL terinstall
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: PostgreSQL tidak ditemukan di PATH
    echo.
    echo Pastikan PostgreSQL sudah terinstall dan ditambahkan ke PATH
    echo Atau gunakan full path ke psql.exe
    echo.
    pause
    exit /b 1
)

echo ✅ PostgreSQL ditemukan
echo.

REM Minta input password PostgreSQL superuser (postgres)
set /p POSTGRES_PASSWORD="Masukkan password untuk user 'postgres' (atau tekan Enter untuk 'Admin123'): "
if "%POSTGRES_PASSWORD%"=="" set "POSTGRES_PASSWORD=Admin123"

REM Set PGPASSWORD untuk non-interactive authentication
set "PGPASSWORD=%POSTGRES_PASSWORD%"

echo.
echo Testing koneksi ke PostgreSQL...
psql -U postgres -c "SELECT version();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Tidak dapat terhubung ke PostgreSQL
    echo.
    echo Pastikan:
    echo   1. PostgreSQL service sedang berjalan
    echo   2. Password yang dimasukkan benar
    echo   3. PostgreSQL sudah terinstall dengan benar
    echo.
    pause
    exit /b 1
)

echo ✅ Koneksi ke PostgreSQL berhasil
echo.

REM Cek apakah database KMI_MOWS sudah ada
echo Memeriksa database KMI_MOWS...
psql -U postgres -lqt | findstr /i "KMI_MOWS" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  WARNING: Database KMI_MOWS tidak ditemukan!
    echo.
    set /p CREATE_DB="Apakah Anda ingin membuat database KMI_MOWS sekarang? (Y/N): "
    if /i "%CREATE_DB%"=="Y" (
        echo.
        echo Membuat database KMI_MOWS...
        psql -U postgres -c "CREATE DATABASE \"KMI_MOWS\";" >nul 2>&1
        if %errorlevel% neq 0 (
            echo ❌ ERROR: Gagal membuat database KMI_MOWS
            pause
            exit /b 1
        )
        echo ✅ Database KMI_MOWS berhasil dibuat
    ) else (
        echo.
        echo Setup dibatalkan. Silakan buat database KMI_MOWS terlebih dahulu.
        pause
        exit /b 1
    )
) else (
    echo ✅ Database KMI_MOWS sudah ada
)
echo.

REM Minta konfirmasi untuk membuat/update user admin
echo ========================================
echo Konfigurasi User Admin
echo ========================================
echo.
echo User yang akan dibuat/diupdate:
echo   Username: admin
echo   Password: admin123
echo   Database: KMI_MOWS
echo.
set /p CONFIRM="Lanjutkan setup user admin? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Setup dibatalkan.
    pause
    exit /b 0
)
echo.

REM Cek apakah user admin sudah ada
echo Memeriksa user admin...
psql -U postgres -c "SELECT 1 FROM pg_roles WHERE rolname='admin';" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  User admin sudah ada
    echo.
    echo [1/4] Mengupdate password user admin...
    psql -U postgres -c "ALTER USER admin WITH PASSWORD 'admin123';" >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Gagal mengupdate password user admin
        pause
        exit /b 1
    )
    echo ✅ Password user admin berhasil diupdate
) else (
    echo User admin belum ada
    echo.
    echo [1/4] Membuat user admin...
    psql -U postgres -c "CREATE USER admin WITH PASSWORD 'admin123';" >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Gagal membuat user admin
        pause
        exit /b 1
    )
    echo ✅ User admin berhasil dibuat
)
echo.

REM Grant privileges pada database
echo [2/4] Memberikan privileges pada database KMI_MOWS...
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON DATABASE \"KMI_MOWS\" TO admin;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Gagal memberikan privileges pada database
    pause
    exit /b 1
)
echo ✅ Privileges pada database diberikan
echo.

REM Grant privileges pada schema
echo [3/4] Memberikan privileges pada schema public...
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL ON SCHEMA public TO admin;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Gagal memberikan privileges pada schema
    pause
    exit /b 1
)
echo ✅ Privileges pada schema diberikan
echo.

REM Set default privileges
echo [4/4] Mengatur default privileges...
psql -U postgres -d "KMI_MOWS" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;" >nul 2>&1
psql -U postgres -d "KMI_MOWS" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;" >nul 2>&1
psql -U postgres -d "KMI_MOWS" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO admin;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Gagal mengatur default privileges
    pause
    exit /b 1
)
echo ✅ Default privileges diatur
echo.

REM Grant privileges pada existing tables (jika ada)
echo Memberikan privileges pada tabel yang sudah ada...
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;" >nul 2>&1
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;" >nul 2>&1
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO admin;" >nul 2>&1
echo ✅ Privileges pada tabel yang sudah ada diberikan
echo.

REM Test koneksi dengan user admin
echo ========================================
echo Testing koneksi dengan user admin...
echo ========================================
set "PGPASSWORD=admin123"
psql -U admin -d "KMI_MOWS" -c "SELECT current_user, current_database();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  WARNING: Koneksi test dengan user admin gagal
    echo    (Ini mungkin normal jika database belum memiliki tabel)
) else (
    echo ✅ Koneksi dengan user admin berhasil!
)
echo.

REM Tampilkan summary
echo ========================================
echo Setup User Selesai!
echo ========================================
echo.
echo Konfigurasi Database:
echo   Database: KMI_MOWS
echo   Username: admin
echo   Password: admin123
echo.
echo Konfigurasi untuk file .env:
echo   DB_HOST=localhost
echo   DB_PORT=5432
echo   DB_NAME=KMI_MOWS
echo   DB_USER=admin
echo   DB_PASSWORD=admin123
echo.
echo ========================================
pause
