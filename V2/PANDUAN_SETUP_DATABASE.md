# Panduan Setup Database - Jika File .BAT Langsung Tertutup

## 🚨 Masalah: setup-database.bat Langsung Tertutup

Jika `setup-database.bat` langsung tertutup di device baru, **jangan panik!** Ini adalah masalah umum dan bisa diperbaiki.

---

## ✅ Solusi Termudah (Gunakan File Debug)

### Langkah 1: Gunakan File Debug

**Jangan** jalankan `setup-database.bat` langsung!

**Jalankan** file ini sebagai gantinya:

```
setup-database-debug.bat
```

File ini akan:
- ✅ Menampilkan informasi debug
- ✅ Tetap membuka window meskipun ada error
- ✅ Menampilkan pesan error yang jelas
- ✅ Memberikan hint solusi

### Langkah 2: Lihat Pesan Error

Setelah menjalankan `setup-database-debug.bat`, Anda akan melihat **EXACT ERROR** yang terjadi!

---

## 🔍 Cara Debug Manual (Metode Command Prompt)

Jika Anda ingin tahu error secara detail:

### Langkah 1: Buka Command Prompt

**Windows 10/11:**
1. Tekan `Windows Key`
2. Ketik `cmd`
3. Klik **Command Prompt** (atau tekan Enter)

**ATAU:**
1. Tekan `Windows Key + R`
2. Ketik `cmd`
3. Tekan Enter

### Langkah 2: Navigate ke Folder V2

```cmd
cd C:\Users\info\Documents\Project\not-released\IoT-Project\Released-Github\IoT-Scales\V2
```

**PENTING:** Ubah path di atas sesuai lokasi folder V2 Anda!

### Langkah 3: Jalankan Setup

```cmd
setup-database.bat
```

**Sekarang Anda bisa LIHAT ERROR dengan jelas!** 👀

---

## 📋 Checklist Sebelum Setup Database

Sebelum menjalankan `setup-database.bat`, pastikan:

### 1. PostgreSQL Terinstall ✅

**Cara cek:**
```cmd
psql --version
```

**Jika error "command not found":**
- Download PostgreSQL: https://www.postgresql.org/download/windows/
- Install dengan password: `Admin123`
- **CENTANG** "Add PostgreSQL to PATH" saat install
- Restart computer setelah install

### 2. PostgreSQL Service Running ✅

**Cara cek:**

1. Tekan `Windows Key + R`
2. Ketik `services.msc`
3. Tekan Enter
4. Cari service `postgresql-x64-XX` (XX = versi, misal 15, 16)
5. Pastikan Status = **Running**

**Jika Stopped:**
- Klik kanan → **Start**

**ATAU dari Command Prompt (as Administrator):**
```cmd
net start postgresql-x64-15
```
(Ubah `15` sesuai versi PostgreSQL Anda)

### 3. Password PostgreSQL Benar ✅

**Default password yang dipakai:** `Admin123`

**Jika password PostgreSQL Anda berbeda:**

**Metode 1 - Set environment variable (sementara):**
```cmd
set PGPASSWORD=password_anda_disini
setup-database.bat
```

**Metode 2 - Edit file setup-database.bat:**
- Buka `setup-database.bat` dengan Notepad
- Cari baris 11: `set PGPASSWORD=Admin123`
- Ubah `Admin123` menjadi password Anda
- Save file

### 4. Folder Database Ada ✅

Pastikan folder `database\` ada di lokasi yang sama dengan `setup-database.bat`.

**Struktur folder yang benar:**
```
V2\
├── setup-database.bat
├── database\
│   ├── schema.sql
│   ├── init\
│   │   ├── 01-core-schema.sql
│   │   └── 02-weighing.sql
│   └── migration-*.sql files
└── ... file lainnya
```

---

## 🎯 Langkah-Langkah Setup (Urutan yang Benar)

### STEP 0: Persiapan (Di Device Baru)

```cmd
# 1. Install PostgreSQL
Download dari: https://www.postgresql.org/download/windows/
Password saat install: Admin123
Centang: Add to PATH

# 2. Install Node.js (untuk server)
Download dari: https://nodejs.org/
Pilih: LTS version

# 3. Restart computer
Penting agar PATH terupdate!
```

### STEP 1: Cek Requirement

```cmd
# Pindah ke folder V2
cd path\to\V2

# Jalankan pengecekan
check-requirements.bat
```

**Pastikan semua hijau (✅) sebelum lanjut!**

### STEP 2: Setup Database (Pilih salah satu)

**Opsi A - Menggunakan file debug (RECOMMENDED):**
```cmd
setup-database-debug.bat
```

**Opsi B - Dari Command Prompt:**
```cmd
setup-database.bat
```

**Opsi C - Jika password bukan Admin123:**
```cmd
set PGPASSWORD=password_anda
setup-database.bat
```

### STEP 3: Verifikasi Database Berhasil Dibuat

```cmd
# Set password
set PGPASSWORD=Admin123

# Check database
psql -U postgres -l | findstr FLB_MOWS
```

**Jika berhasil, Anda akan melihat:**
```
FLB_MOWS | postgres | UTF8 | ...
```

---

## 🚨 Error Messages dan Solusi Cepat

| Error Yang Muncul | Penyebab | Solusi Cepat |
|-------------------|----------|--------------|
| `'psql' is not recognized as an internal or external command` | PostgreSQL belum install atau belum di PATH | Install PostgreSQL atau tambahkan ke PATH |
| `connection to server at "localhost" (::1), port 5432 failed` | PostgreSQL service tidak running | Start service dari services.msc |
| `FATAL: password authentication failed for user "postgres"` | Password salah | Set `PGPASSWORD=password_yang_benar` |
| `could not connect to database postgres` | PostgreSQL tidak running | Start PostgreSQL service |
| `cannot drop the currently open database` | Ada koneksi aktif ke database | Close semua aplikasi yang konek ke PostgreSQL |
| `schema.sql: No such file or directory` | File database tidak ada atau path salah | Pastikan folder `database\` ada di lokasi yang benar |

---

## 💡 Tips Pro

### Tip 1: Selalu Cek Requirement Dulu

Sebelum setup di device baru, **SELALU** jalankan:
```cmd
check-requirements.bat
```

File ini akan memberitahu **SEMUA** yang perlu diinstall!

### Tip 2: Gunakan File Debug

**JANGAN** double-click `setup-database.bat` di device baru.

**SELALU** gunakan `setup-database-debug.bat` atau jalankan dari Command Prompt.

### Tip 3: Screenshot Error

Jika masih error:
1. Screenshot pesan error lengkap
2. Screenshot output dari `check-requirements.bat`
3. Kirim ke developer

### Tip 4: Restart Setelah Install

Setelah install PostgreSQL atau Node.js:
1. **Restart computer**
2. Baru jalankan setup

Ini penting agar environment variables terupdate!

### Tip 5: Run as Administrator

Jika ada permission error:
1. Right-click `setup-database-debug.bat`
2. Pilih **Run as administrator**

---

## 📝 Troubleshooting Checklist

Jika setup gagal, ikuti checklist ini:

```
[ ] PostgreSQL terinstall (cek: psql --version)
[ ] PostgreSQL service running (cek: services.msc)
[ ] Password PostgreSQL adalah Admin123 (atau sudah set PGPASSWORD)
[ ] Folder database\ ada di lokasi yang benar
[ ] File schema.sql ada di folder database\
[ ] Computer sudah di-restart setelah install PostgreSQL
[ ] Menjalankan dari folder yang benar (V2\)
[ ] Tidak ada antivirus yang memblok
[ ] User punya permission (coba run as administrator)
```

---

## 🎓 Video Tutorial (Jika Perlu)

Jika masih bingung, Anda bisa:

1. **Record screen saat menjalankan `setup-database-debug.bat`**
2. **Kirim video ke developer** untuk diagnostic
3. **Screenshot setiap error yang muncul**

---

## 📞 Masih Butuh Bantuan?

Jika setelah mengikuti semua panduan di atas masih bermasalah:

### Informasi yang Perlu Disiapkan:

1. **Screenshot output dari:**
   ```cmd
   check-requirements.bat
   ```

2. **Screenshot error dari:**
   ```cmd
   setup-database-debug.bat
   ```

3. **Informasi system:**
   ```cmd
   psql --version
   node --version
   systeminfo | findstr OS
   ```

4. **Check service status:**
   ```cmd
   sc query postgresql-x64-15
   ```
   (Ubah 15 sesuai versi Anda)

5. **Check PATH:**
   ```cmd
   echo %PATH%
   ```

Kirim semua informasi di atas ke developer!

---

## ✨ File Bantuan yang Tersedia

Di folder V2, ada beberapa file yang bisa membantu:

| File | Kegunaan |
|------|----------|
| `check-requirements.bat` | Cek semua requirement |
| `setup-database-debug.bat` | Setup database dengan debug mode ✨ |
| `setup-database.bat` | Setup database normal |
| `fix-passwords-standalone.bat` | Fix password user jika login gagal |
| `CARA_MENGATASI_BAT_TERTUTUP.md` | Panduan umum .bat file |
| `docs/TROUBLESHOOTING_BAT_FILES.md` | Troubleshooting detail |

**MULAI DARI `check-requirements.bat` DULU!**

---

## 🎉 Setelah Setup Berhasil

Jika setup database berhasil, Anda akan melihat:

```
========================================
Database Setup Complete!
========================================

Database Configuration:
  Host: localhost
  Port: 5432
  Database: FLB_MOWS
  Username: postgres
  Password: Admin123

Default User Passwords:
  admin: admin123
  faliq: faliq123
  operator1: operator123
  supervisor: supervisor123
  qc: qc123
```

**Langkah selanjutnya:**
1. Install dependencies: `npm install`
2. Start server: `start-server.bat`
3. Buka browser: http://localhost:3001
4. Login dengan user admin/admin123

---

**Dibuat:** 19 Desember 2025  
**Untuk:** IoT Scales V2  
**Versi:** 1.0  
**Kategori:** Setup & Installation
