# Cara Mengatasi File .BAT yang Langsung Tertutup

## 🎯 Masalah
Saat menjalankan file `.bat` di device lain, file langsung tertutup tanpa menampilkan error.

## ✅ Solusi yang Sudah Diterapkan

Saya sudah memperbaiki semua file `.bat` dengan menambahkan:
1. ✅ Error handling di awal script (cek dependency)
2. ✅ Perintah `pause` di setiap error
3. ✅ Perintah `pause` di akhir script
4. ✅ Pesan error yang jelas dan informatif

### File yang Sudah Diperbaiki:

1. **`start-server.bat`**
   - Cek Node.js terinstall
   - Cek file server.js ada
   - Auto-stop port 3001 jika sudah digunakan
   - Pause saat error

2. **`release-NORMAL\run.bat`**
   - Cek executable ada
   - Tampilkan error yang jelas
   - Pause saat error

3. **`check-requirements.bat`** (BARU ✨)
   - File khusus untuk cek semua requirement
   - Bisa dijalankan di device baru
   - Memberikan laporan lengkap

---

## 📋 Langkah-Langkah Saat Setup di Device Baru

### Langkah 1: Jalankan Pengecekan Requirement

Klik ganda atau jalankan dari Command Prompt:

```batch
check-requirements.bat
```

File ini akan mengecek:
- ✅ PostgreSQL terinstall?
- ✅ Node.js terinstall?
- ⚠️ Python terinstall? (optional)
- ✅ File-file penting ada?
- ✅ PostgreSQL service running?
- ✅ Database FLB_MOWS sudah ada?
- ✅ node_modules sudah diinstall?

**Output akan memberitahu apa yang perlu diinstall!**

### Langkah 1.5: Jika setup-database.bat Langsung Tertutup ⚠️

**Gunakan file debug sebagai gantinya:**

```batch
setup-database-debug.bat
```

File ini akan:
- ✅ Tetap membuka window meskipun ada error
- ✅ Menampilkan error yang jelas
- ✅ Memberikan hint solusi
- ✅ Membantu Anda troubleshoot

**ATAU** jalankan dari Command Prompt (lihat Metode 1 di bawah)

### Langkah 2: Install Dependency yang Kurang

Jika ada yang kurang, install:

**PostgreSQL:**
- Download: https://www.postgresql.org/download/windows/
- Install dengan password: `Admin123` (atau ubah di script)

**Node.js:**
- Download: https://nodejs.org/
- Install versi LTS (Long Term Support)

**Python (optional, hanya untuk Hardware folder):**
- Download: https://www.python.org/downloads/
- Centang "Add Python to PATH" saat install

### Langkah 3: Install Node.js Dependencies

Buka Command Prompt di folder V2, lalu jalankan:

```cmd
npm install
```

### Langkah 4: Setup Database

Jalankan:

```batch
setup-database.bat
```

Jika error:
- Pastikan PostgreSQL service running
- Pastikan password PostgreSQL adalah `Admin123`
- Atau set environment variable: `set PGPASSWORD=your_password`

### Langkah 5: Jalankan Aplikasi

```batch
start-server.bat
```

---

## 🔍 Cara Debug Jika Masih Error

### Metode 1: Jalankan dari Command Prompt (RECOMMENDED ⭐)

1. Buka **Command Prompt** (bukan PowerShell)
   - Tekan `Windows Key + R`
   - Ketik `cmd` → Enter

2. Navigate ke folder V2:
   ```cmd
   cd C:\Users\info\Documents\Project\not-released\IoT-Project\Released-Github\IoT-Scales\V2
   ```

3. Jalankan file .bat:
   ```cmd
   start-server.bat
   ```

4. **Sekarang Anda bisa LIHAT ERROR dengan jelas!** 👀

### Metode 2: Tambahkan `pause` Manual

Edit file `.bat` (klik kanan → Edit), tambahkan di baris paling atas:

```batch
@echo off
pause
REM ... script lainnya ...
```

Ini akan menahan window agar tidak langsung tertutup.

### Metode 3: Buat Wrapper Script

Buat file baru `debug-start.bat`:

```batch
@echo off
echo Running with debug mode...
call start-server.bat
echo.
echo Script finished. Check errors above.
pause
```

---

## 📝 Checklist Setup Device Baru

Gunakan checklist ini saat setup di device baru:

```
STEP 1: DEPENDENCY
[ ] PostgreSQL terinstall
[ ] Node.js terinstall
[ ] Python terinstall (optional)

STEP 2: SERVICE
[ ] PostgreSQL service running (cek di services.msc)
[ ] Port 3001 tidak digunakan aplikasi lain

STEP 3: FILE & FOLDER
[ ] Semua file dari project sudah dicopy
[ ] Folder database\ ada dan berisi file SQL
[ ] File server.js ada

STEP 4: ENVIRONMENT
[ ] PostgreSQL sudah di PATH
[ ] Node.js sudah di PATH
[ ] Password PostgreSQL adalah Admin123 (atau sudah set PGPASSWORD)

STEP 5: INSTALL
[ ] npm install sudah dijalankan (node_modules ada)
[ ] setup-database.bat sudah dijalankan
[ ] Database FLB_MOWS sudah dibuat

STEP 6: TEST
[ ] check-requirements.bat → semua hijau ✅
[ ] start-server.bat → server running
[ ] Browser http://localhost:3001 → aplikasi muncul
```

---

## 🚨 Error Messages dan Solusinya

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `PostgreSQL is not installed or not in PATH` | PostgreSQL belum install atau PATH salah | Install PostgreSQL atau tambahkan ke PATH |
| `Node.js is not installed or not in PATH` | Node.js belum install | Install Node.js dari nodejs.org |
| `Cannot connect to PostgreSQL` | Service tidak running atau password salah | Start service atau set PGPASSWORD |
| `server.js not found` | Jalankan dari folder yang salah | Pindah ke folder V2 |
| `Port 3001 is already in use` | Port sedang digunakan | Script akan auto-close, atau manual taskkill |
| `Database FLB_MOWS does not exist` | Database belum dibuat | Jalankan setup-database.bat |
| `node_modules not found` | Dependencies belum diinstall | Jalankan npm install |

---

## 🎓 Tips Pro

### Tip 1: Selalu Jalankan dari Command Prompt Saat Development

Jangan double-click `.bat` file saat development. Selalu jalankan dari Command Prompt agar bisa lihat error!

### Tip 2: Buat Shortcut dengan Pause

Buat shortcut `.bat` yang otomatis pause:

```batch
@echo off
call setup-database.bat
echo.
echo === Script selesai, window akan tetap terbuka ===
pause
```

### Tip 3: Check PATH dengan Cepat

Untuk cek apakah program sudah di PATH:

```cmd
where node
where psql
where python
```

Jika "not found" → belum di PATH.

### Tip 4: Run as Administrator

Jika ada permission error, coba:
- Right-click file `.bat` → **Run as administrator**

### Tip 5: Disable Antivirus Sementara

Beberapa antivirus memblock `.bat` files. Coba whitelist folder project Anda.

---

## 📚 Dokumentasi Lengkap

Untuk troubleshooting lebih detail, baca:

- **`docs/TROUBLESHOOTING_BAT_FILES.md`** - Panduan lengkap troubleshooting
- **`docs/CARA_MENJALANKAN.md`** - Panduan menjalankan aplikasi
- **`docs/CARA_MENGATASI_ERROR.md`** - Panduan mengatasi error umum

---

## 🆘 Masih Bermasalah?

Jika setelah mengikuti semua langkah di atas masih bermasalah:

1. Jalankan `check-requirements.bat`
2. Screenshot output lengkap
3. Jalankan `.bat` dari Command Prompt
4. Screenshot error message
5. Check file `log-error.txt` jika ada
6. Hubungi developer dengan informasi di atas

---

## ✨ Apa yang Baru?

**Update 19 Desember 2025:**

1. ✅ **`start-server.bat`** - Diperbaiki dengan error handling lengkap
2. ✅ **`release-NORMAL\run.bat`** - Diperbaiki dengan error handling
3. ✨ **`check-requirements.bat`** - File BARU untuk cek system requirement
4. ✨ **`setup-database-debug.bat`** - File BARU wrapper untuk debug setup database ⭐
5. ✨ **`release-NORMAL\setup-database-debug.bat`** - Debug wrapper untuk release folder
6. 📚 **`PANDUAN_SETUP_DATABASE.md`** - Panduan lengkap setup database step-by-step
7. 📚 **`docs/TROUBLESHOOTING_BAT_FILES.md`** - Dokumentasi troubleshooting lengkap
8. 📚 **`CARA_MENGATASI_BAT_TERTUTUP.md`** - Panduan ini!

Semua file `.bat` sekarang memiliki:
- Error handling di awal
- Pesan error yang jelas
- Perintah `pause` otomatis saat error
- Instruksi solusi di setiap error
- **File debug wrapper** untuk troubleshooting ⭐

---

**Dibuat:** 19 Desember 2025  
**Author:** IoT Scales Development Team  
**Versi:** 1.0
