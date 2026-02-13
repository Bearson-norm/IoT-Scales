# Setup Database KMI_MOWS

File-file untuk setup database `KMI_MOWS` dengan superuser `postgres` dan user `admin` (password: `admin123`).

## 📁 File yang Tersedia

### 1. **setup-database-kmi-mows.bat** ⭐ RECOMMENDED
   - Script otomatis untuk setup database
   - Menjalankan semua langkah secara otomatis
   - **Cara pakai:**
     ```cmd
     setup-database-kmi-mows.bat
     ```

### 2. **setup_kmi_mows.sql**
   - SQL script untuk create database dan user
   - **Cara pakai:**
     ```cmd
     psql -U postgres -f setup_kmi_mows.sql
     ```
   - Setelah itu, lanjutkan dengan import schema manual

### 3. **MANUAL_SETUP_KMI_MOWS.txt**
   - Panduan step-by-step untuk setup manual
   - Copy-paste commands yang bisa dijalankan langsung
   - Cocok untuk troubleshooting atau setup custom

### 4. **SETUP_DATABASE_KMI_MOWS_MANUAL.md**
   - Dokumentasi lengkap untuk setup manual
   - Penjelasan detail setiap langkah
   - Troubleshooting guide

## 🚀 Quick Start

### Opsi 1: Script Otomatis (Paling Mudah)

```cmd
cd C:\Users\info\Documents\Project\not-released\IoT-Project\Released-Github\IoT-Scales\V2
setup-database-kmi-mows.bat
```

**Catatan:** Jika password PostgreSQL bukan `Admin123`, set dulu:
```cmd
set PGPASSWORD=your_password
setup-database-kmi-mows.bat
```

### Opsi 2: SQL Script + Manual Import

```cmd
REM 1. Create database dan user
psql -U postgres -f setup_kmi_mows.sql

REM 2. Import schema (replace FLB_MOWS dengan KMI_MOWS)
powershell -Command "(Get-Content database\schema.sql) -replace 'FLB_MOWS', 'KMI_MOWS' | Set-Content database\schema_kmi_mows.sql"
psql -U postgres -d "KMI_MOWS" -f database\schema_kmi_mows.sql

REM 3. Import core schema
psql -U postgres -d "KMI_MOWS" -f database\init\01-core-schema.sql

REM 4. Import weighing tables
psql -U postgres -d "KMI_MOWS" -f database\init\02-weighing.sql

REM 5. Grant privileges
psql -U postgres -d "KMI_MOWS" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;"
```

### Opsi 3: Manual Setup (Step-by-Step)

Ikuti panduan di file `MANUAL_SETUP_KMI_MOWS.txt` atau `SETUP_DATABASE_KMI_MOWS_MANUAL.md`.

## ✅ Verifikasi Setup

Setelah setup selesai, test koneksi:

```cmd
REM Test dengan superuser
psql -U postgres -d "KMI_MOWS" -c "\dt"

REM Test dengan user admin
set PGPASSWORD=admin123
psql -U admin -d "KMI_MOWS" -c "\dt"
```

Kedua command harus berhasil menampilkan daftar tables.

## 📋 Konfigurasi Database

| Parameter | Value |
|-----------|-------|
| Database Name | KMI_MOWS |
| Superuser | postgres |
| Superuser Password | Admin123 (default) |
| Application User | admin |
| Application Password | admin123 |
| Host | localhost |
| Port | 5432 |

## 🔧 Troubleshooting

### Password PostgreSQL Berbeda

Jika password PostgreSQL superuser bukan `Admin123`:

```cmd
set PGPASSWORD=your_actual_password
setup-database-kmi-mows.bat
```

### Database Sudah Ada

Script akan otomatis drop dan recreate. Jika ingin skip:

```cmd
REM Comment out bagian drop database di script
REM atau skip step create database jika sudah ada
```

### File Schema Tidak Ditemukan

Pastikan:
1. Anda berada di folder `V2`
2. Folder `database` ada
3. File `database\schema.sql` ada

Jika masih error, gunakan path lengkap:
```cmd
psql -U postgres -d "KMI_MOWS" -f "C:\full\path\to\database\schema.sql"
```

## 📝 Catatan Penting

1. **Nama Database**: Gunakan `KMI_MOWS` (huruf besar) karena PostgreSQL case-sensitive untuk quoted identifiers.

2. **Schema Files**: File `schema.sql` mungkin masih menggunakan `FLB_MOWS`. Script otomatis akan replace otomatis, tapi untuk manual setup perlu replace manual.

3. **User Admin**: User `admin` dibuat dengan full privileges pada database `KMI_MOWS`.

4. **Migrations**: File migration bersifat optional. Jika ada error, bisa di-skip.

## 🆘 Bantuan Lebih Lanjut

- Lihat `SETUP_DATABASE_KMI_MOWS_MANUAL.md` untuk dokumentasi lengkap
- Lihat `MANUAL_SETUP_KMI_MOWS.txt` untuk copy-paste commands
- Pastikan PostgreSQL service sedang berjalan sebelum setup
