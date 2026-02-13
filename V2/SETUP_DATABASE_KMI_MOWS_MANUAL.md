# Setup Database KMI_MOWS - Manual Guide

Panduan manual untuk setup database `KMI_MOWS` dengan superuser `postgres` dan user `admin` (password: `admin123`).

## Prerequisites

- PostgreSQL sudah terinstall
- PostgreSQL service sedang berjalan
- Akses sebagai superuser `postgres`

## Langkah-langkah Setup Manual

### 1. Set Environment Variable (Optional)

Jika password PostgreSQL superuser bukan `Admin123`, set environment variable:

```cmd
set PGPASSWORD=Admin123
```

Atau jika password berbeda:
```cmd
set PGPASSWORD=your_postgres_password
```

### 2. Test Koneksi PostgreSQL

```cmd
psql -U postgres -c "SELECT version();"
```

Jika berhasil, akan menampilkan versi PostgreSQL.

### 3. Buat Database KMI_MOWS

```cmd
psql -U postgres -c "DROP DATABASE IF EXISTS \"KMI_MOWS\";"
psql -U postgres -c "CREATE DATABASE \"KMI_MOWS\";"
```

### 4. Buat User Admin

```cmd
psql -U postgres -c "DROP USER IF EXISTS admin;"
psql -U postgres -c "CREATE USER admin WITH PASSWORD 'admin123';"
```

### 5. Berikan Privileges ke User Admin

```cmd
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON DATABASE \"KMI_MOWS\" TO admin;"
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL ON SCHEMA public TO admin;"
psql -U postgres -d "KMI_MOWS" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;"
psql -U postgres -d "KMI_MOWS" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;"
```

### 6. Import Schema Database

**PENTING:** Sebelum import, pastikan file `schema.sql` ada. Jika file menggunakan nama database `FLB_MOWS`, ganti dengan `KMI_MOWS`.

```cmd
REM Coba path pertama
psql -U postgres -d "KMI_MOWS" -f database\schema.sql

REM Jika error, coba path kedua
psql -U postgres -d "KMI_MOWS" -f ..\database\schema.sql
```

**Catatan:** Jika file `schema.sql` masih menggunakan `FLB_MOWS`, Anda perlu:
1. Copy file `schema.sql` ke `schema_kmi_mows.sql`
2. Replace semua `FLB_MOWS` dengan `KMI_MOWS` di file tersebut
3. Import file yang sudah di-replace

Atau gunakan PowerShell untuk replace otomatis:
```powershell
(Get-Content database\schema.sql) -replace 'FLB_MOWS', 'KMI_MOWS' | Set-Content database\schema_kmi_mows.sql
psql -U postgres -d "KMI_MOWS" -f database\schema_kmi_mows.sql
```

### 7. Import Core Schema

```cmd
REM Coba path pertama
psql -U postgres -d "KMI_MOWS" -f database\init\01-core-schema.sql

REM Jika error, coba path kedua
psql -U postgres -d "KMI_MOWS" -f ..\database\init\01-core-schema.sql
```

### 8. Import Weighing Tables

```cmd
REM Coba path pertama
psql -U postgres -d "KMI_MOWS" -f database\init\02-weighing.sql

REM Jika error, coba path kedua
psql -U postgres -d "KMI_MOWS" -f ..\database\init\02-weighing.sql
```

### 9. Berikan Privileges pada Semua Tables

```cmd
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;"
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;"
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO admin;"
```

### 10. Run Migrations (Optional)

Jika ada file migration, jalankan satu per satu:

```cmd
psql -U postgres -d "KMI_MOWS" -f database\migration-add-reject-status.sql
psql -U postgres -d "KMI_MOWS" -f database\migration-add-opened-at.sql
psql -U postgres -d "KMI_MOWS" -f database\migration-add-print-history.sql
psql -U postgres -d "KMI_MOWS" -f database\migration-add-qc-role-and-reactivate-note.sql
psql -U postgres -d "KMI_MOWS" -f database\migration-add-sequence-order.sql
```

### 11. Verifikasi Setup

```cmd
REM Test koneksi dengan user admin
set PGPASSWORD=admin123
psql -U admin -d "KMI_MOWS" -c "SELECT current_user, current_database();"

REM Cek jumlah tables
psql -U postgres -d "KMI_MOWS" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

## Setup Menggunakan SQL Script Langsung

Alternatif: buat file SQL dan jalankan sekaligus.

### Buat file `setup_kmi_mows.sql`:

```sql
-- Setup Database KMI_MOWS
-- Superuser: postgres
-- User: admin
-- Password: admin123

-- Drop database if exists
DROP DATABASE IF EXISTS "KMI_MOWS";

-- Create database
CREATE DATABASE "KMI_MOWS";

-- Drop user if exists
DROP USER IF EXISTS admin;

-- Create user admin
CREATE USER admin WITH PASSWORD 'admin123';

-- Grant privileges on database
GRANT ALL PRIVILEGES ON DATABASE "KMI_MOWS" TO admin;

-- Connect to KMI_MOWS database
\c KMI_MOWS

-- Grant privileges on schema
GRANT ALL ON SCHEMA public TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;
```

### Jalankan file SQL:

```cmd
psql -U postgres -f setup_kmi_mows.sql
```

Kemudian lanjutkan dengan import schema dan file-file lainnya seperti langkah 6-10 di atas.

## Verifikasi Final

Setelah semua langkah selesai, test koneksi:

```cmd
REM Test dengan superuser
psql -U postgres -d "KMI_MOWS" -c "\dt"

REM Test dengan user admin
set PGPASSWORD=admin123
psql -U admin -d "KMI_MOWS" -c "\dt"
```

Kedua command di atas harus berhasil menampilkan daftar tables.

## Troubleshooting

### Error: "password authentication failed"
- Pastikan password PostgreSQL superuser benar
- Set environment variable `PGPASSWORD` dengan password yang benar

### Error: "database already exists"
- Database sudah ada, bisa skip langkah create atau drop dulu dengan:
  ```cmd
  psql -U postgres -c "DROP DATABASE IF EXISTS \"KMI_MOWS\";"
  ```

### Error: "user already exists"
- User admin sudah ada, bisa skip atau update password dengan:
  ```cmd
  psql -U postgres -c "ALTER USER admin WITH PASSWORD 'admin123';"
  ```

### Error: "permission denied"
- Pastikan menjalankan command sebagai superuser `postgres`
- Pastikan privileges sudah diberikan dengan benar

### File schema.sql tidak ditemukan
- Pastikan Anda berada di folder yang benar (folder V2)
- Cek apakah folder `database` ada
- Gunakan path lengkap jika perlu

## Connection String

Setelah setup selesai, gunakan connection string berikut:

**Untuk superuser:**
```
Host: localhost
Port: 5432
Database: KMI_MOWS
Username: postgres
Password: Admin123 (atau password PostgreSQL Anda)
```

**Untuk user admin:**
```
Host: localhost
Port: 5432
Database: KMI_MOWS
Username: admin
Password: admin123
```

## Catatan Penting

1. **Password PostgreSQL Superuser**: Default script menggunakan `Admin123`. Jika berbeda, set environment variable `PGPASSWORD` sebelum menjalankan command.

2. **Nama Database**: Pastikan menggunakan `KMI_MOWS` (huruf besar) karena PostgreSQL case-sensitive untuk identifier yang menggunakan quotes.

3. **User Admin**: User `admin` dibuat dengan password `admin123` dan memiliki full privileges pada database `KMI_MOWS`.

4. **Schema Files**: Jika file schema masih menggunakan nama `FLB_MOWS`, pastikan untuk replace dengan `KMI_MOWS` sebelum import.

5. **Migrations**: File migration bersifat optional dan non-critical. Jika ada error, bisa di-skip dan dilanjutkan.
