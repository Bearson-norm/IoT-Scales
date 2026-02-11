# Troubleshooting: File .BAT Langsung Tertutup

## Mengapa File .BAT Langsung Tertutup?

File `.bat` (batch file) akan langsung tertutup setelah selesai dijalankan atau jika terjadi error. Ini adalah perilaku normal Windows Command Prompt.

### Penyebab Umum:

1. **Script selesai dijalankan terlalu cepat**
   - Tidak ada perintah `pause` di akhir script
   - Script berhasil dijalankan dan langsung selesai

2. **Terjadi error sebelum mencapai perintah `pause`**
   - Dependency tidak terinstall (PostgreSQL, Node.js, Python)
   - File yang dibutuhkan tidak ditemukan
   - Permission error
   - Service tidak running

3. **Path atau working directory salah**
   - Script dijalankan dari folder yang salah
   - File yang dicari tidak ada di lokasi yang diharapkan

---

## Solusi dan Pencegahan

### Solusi 1: Jalankan dari Command Prompt

**Cara paling efektif untuk melihat error:**

1. Buka **Command Prompt** (cmd)
2. Navigate ke folder yang berisi file .bat:
   ```cmd
   cd C:\Users\info\Documents\Project\not-released\IoT-Project\Released-Github\IoT-Scales\V2
   ```
3. Jalankan file .bat dengan mengetik namanya:
   ```cmd
   setup-database.bat
   ```
4. Sekarang Anda bisa melihat pesan error lengkap!

### Solusi 2: Tambahkan `pause` di Akhir Script

Edit file .bat dan tambahkan `pause` di baris terakhir:

```batch
@echo off
echo Hello World
REM ... script lainnya ...
pause
```

**Catatan:** File-file berikut SUDAH memiliki `pause`:
- ✅ `setup-database.bat`
- ✅ `fix-passwords-standalone.bat`
- ✅ `release-NORMAL\setup-database.bat`
- ✅ `release-NORMAL\run.bat`
- ✅ `Hardware\start-server.bat`
- ✅ `start-server.bat` (baru saja diperbaiki)

### Solusi 3: Tambahkan Error Handling

Tambahkan pengecekan dependency di awal script:

```batch
@echo off

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed
    pause
    exit /b 1
)

REM Check if required file exists
if not exist "server.js" (
    echo ERROR: server.js not found
    pause
    exit /b 1
)

REM ... lanjutkan script ...
```

### Solusi 4: Buat Shortcut dengan Pause

Buat file baru `start-server-debug.bat`:

```batch
@echo off
call start-server.bat
pause
```

---

## Checklist: Requirement untuk Setiap File .BAT

### Untuk `setup-database.bat`:
- [ ] PostgreSQL sudah diinstall
- [ ] PostgreSQL service sedang running
- [ ] Password PostgreSQL adalah `Admin123` (atau set `PGPASSWORD` environment variable)
- [ ] Folder `database\` ada di lokasi yang benar

### Untuk `start-server.bat`:
- [ ] Node.js sudah diinstall
- [ ] File `server.js` ada di folder yang sama
- [ ] Dependencies sudah diinstall (`npm install`)
- [ ] Port 3001 tidak sedang digunakan

### Untuk `fix-passwords-standalone.bat`:
- [ ] PostgreSQL sudah diinstall dan running
- [ ] Database `FLB_MOWS` sudah dibuat (jalankan `setup-database.bat` dulu)

### Untuk `Hardware\start-server.bat`:
- [ ] Python sudah diinstall
- [ ] File `vibra-scale-reader.html` ada di folder yang sama

---

## Cara Debugging Step-by-Step

### 1. Buka Command Prompt sebagai Administrator
```
Windows Key + X → Command Prompt (Admin)
```

### 2. Navigate ke folder V2
```cmd
cd C:\Users\info\Documents\Project\not-released\IoT-Project\Released-Github\IoT-Scales\V2
```

### 3. Test dependency satu per satu

**Test PostgreSQL:**
```cmd
psql --version
```
Jika error: Install PostgreSQL dari https://www.postgresql.org/

**Test Node.js:**
```cmd
node --version
```
Jika error: Install Node.js dari https://nodejs.org/

**Test Python:**
```cmd
python --version
```
Jika error: Install Python dari https://python.org/

### 4. Jalankan file .bat dengan verbose output

Tambahkan `echo on` di awal script untuk melihat setiap perintah:
```batch
@echo on
REM ... script ...
```

---

## Tips untuk Device Lain

Saat menjalankan di device lain:

1. **Pastikan semua dependency terinstall**
   - PostgreSQL 12+
   - Node.js 16+
   - Python 3.8+ (untuk Hardware folder)

2. **Check environment variables**
   ```cmd
   echo %PATH%
   ```
   Pastikan path PostgreSQL, Node.js, dan Python ada di PATH

3. **Jalankan sebagai Administrator**
   - Right-click file .bat → "Run as administrator"

4. **Periksa antivirus/firewall**
   - Beberapa antivirus memblok .bat files
   - Whitelist folder project Anda

5. **Periksa file permissions**
   - Right-click folder → Properties → Security
   - Pastikan user Anda punya Full Control

---

## Error Messages dan Solusinya

### Error: "PostgreSQL is not installed or not in PATH"
**Solusi:**
1. Install PostgreSQL dari https://www.postgresql.org/
2. Atau tambahkan PostgreSQL ke PATH:
   ```
   Control Panel → System → Advanced → Environment Variables
   Tambahkan: C:\Program Files\PostgreSQL\15\bin
   ```

### Error: "Node.js is not installed or not in PATH"
**Solusi:**
1. Install Node.js dari https://nodejs.org/
2. Restart Command Prompt setelah install

### Error: "Cannot connect to PostgreSQL"
**Solusi:**
1. Buka Services (services.msc)
2. Cari "postgresql-x64-15" (atau versi Anda)
3. Klik "Start" jika statusnya Stopped

### Error: "server.js not found"
**Solusi:**
1. Pastikan Anda menjalankan .bat dari folder yang benar
2. Check path dengan `dir server.js`

### Error: "Port 3001 is already in use"
**Solusi:**
Script sudah auto-handle ini, tapi jika masih error:
```cmd
netstat -ano | findstr :3001
taskkill /PID [PID] /F
```

---

## File .BAT yang Sudah Diperbaiki

✅ `start-server.bat` - Ditambahkan:
- Pengecekan Node.js
- Pengecekan server.js
- Error handling saat server exit
- Pause saat error

✅ `setup-database.bat` - Sudah baik:
- Lengkap dengan error handling
- Pause di setiap error
- Pause di akhir script

✅ `fix-passwords-standalone.bat` - Sudah baik:
- Error handling lengkap
- Pause di setiap error

---

## Kontak Support

Jika masih ada masalah:
1. Jalankan dari Command Prompt
2. Screenshot error message
3. Check log-error.txt (jika ada)
4. Hubungi developer dengan informasi lengkap

---

**Dibuat:** 19 Desember 2025  
**Terakhir Update:** 19 Desember 2025  
**Versi:** 1.0
