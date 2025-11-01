# 📦 Packaging Guide - IoT Scales V2

Panduan lengkap untuk mempackage aplikasi IoT Scales V2 menjadi executable Windows.

## 🎯 Metode Packaging

Ada 2 metode yang bisa digunakan:

### Metode 1: Portable Executable (Rekomendasi)
Membuat executable yang bisa dijalankan langsung tanpa installer, dengan semua dependencies.

### Metode 2: Full Installer
Membuat installer Windows menggunakan Inno Setup.

---

## 📋 Prerequisites

1. **Node.js 18.x atau lebih baru**
2. **npm atau yarn**
3. **Visual Studio Build Tools** (untuk kompilasi native modules)
   - Download dari: https://visualstudio.microsoft.com/downloads/
   - Install "Desktop development with C++" workload
4. **Python 3.x** (untuk kompilasi native modules)
   - Download dari: https://www.python.org/downloads/

---

## 🚀 Metode 1: Portable Executable

### Langkah 1: Install Dependencies untuk Packaging

```bash
npm install -g pkg
npm install -g node-gyp
npm install --production
```

### Langkah 2: Build Frontend

```bash
npm run build
```

### Langkah 3: Build Executable

```bash
node build-package.js
```

Atau secara manual:

```bash
# Build executable
pkg . --config pkg.config.json

# File executable akan dibuat di folder release/
# Windows: release/iot-scales-v2.exe
```

### Langkah 4: Copy Dependencies Native

Karena `serialport` adalah native module, kita perlu copy `node_modules/serialport` dan semua dependencies-nya secara manual. **Script `build-package.js` atau `build-package.bat` akan otomatis melakukan ini untuk Anda**.

Module yang akan di-copy:
- `node_modules/serialport` - Main module (wajib)
- `node_modules/@serialport/*` - Scoped packages termasuk `bindings-cpp` dengan native bindings (wajib)
- `node_modules/debug` - Dependency serialport (optional, tapi recommended)
- `node_modules/node-gyp-build` - Build tool untuk native modules (optional)
- `node_modules/node-addon-api` - Native addon API (optional)

**Catatan Penting:**
- Native modules **TIDAK BISA** di-bundle ke dalam executable dengan `pkg`
- Mereka harus berada di folder `node_modules/` di release directory
- Executable akan secara otomatis mencari serialport di `release/node_modules/` saat runtime
- Script build akan otomatis verify bahwa semua file native bindings ter-copy dengan benar

### Langkah 5: Struktur Release Folder

Setelah build, struktur folder `release/` akan seperti ini:

```
release/
├── iot-scales-v2.exe      # Executable utama
├── dist/                   # Frontend build
├── database/               # Database schema
├── uploads/                # Upload directory
├── node_modules/
│   ├── serialport/         # Main serialport module (wajib)
│   ├── @serialport/        # Scoped packages (wajib)
│   │   ├── bindings-cpp/   # Native bindings dengan prebuilds/
│   │   ├── stream/
│   │   └── parser-*/
│   ├── debug/              # Serialport dependency (optional)
│   ├── node-gyp-build/     # Build tool (optional)
│   └── node-addon-api/     # Native API (optional)
├── package.json            # Package info
└── run.bat                 # Run script (auto-created)
```

### Langkah 6: Jalankan Aplikasi

```bash
cd release
iot-scales-v2.exe
```

Aplikasi akan berjalan di `http://localhost:3001`

---

## 🎁 Metode 2: Full Installer (Inno Setup)

### Langkah 1: Install Inno Setup

1. Download Inno Setup dari: https://jrsoftware.org/isdl.php
2. Install Inno Setup Compiler

### Langkah 2: Build Portable Version Terlebih Dahulu

Ikuti Metode 1 sampai Langkah 4 untuk membuat folder `release/`.

### Langkah 3: Edit installer.iss (jika perlu)

File `installer.iss` sudah dikonfigurasi dengan:
- Default installation path: `C:\Program Files\IoT Scales V2`
- Start menu shortcut
- Desktop shortcut
- Registry entries untuk uninstall

### Langkah 4: Build Installer

```bash
# Jika Inno Setup sudah di-install elas PATH
iscc installer.iss

# Atau buka installer.iss di Inno Setup Compiler dan klik "Build"
```

### Langkah 5: Hasil Installer

Installer akan dibuat di folder `release/` dengan nama:
```
IoT-Scales-V2-Setup-1.7.0.exe
```

---

## 🔧 Script Helper

### Script Build Lengkap (build-package.bat)

Buat file `build-package.bat`:

```batch
@echo off
echo Building IoT Scales V2 Package...
echo.

REM Build frontend
echo [1/4] Building frontend...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

REM Build executable
echo [2/4] Building executable...
call pkg . --config pkg.config.json
if errorlevel 1 (
    echo Packaging failed!
    pause
    exit /b 1
)

REM Copy native modules
echo [3/4] Copying native modules...
if not exist "release\node_modules" mkdir "release\node_modules"
xcopy /E /I /Y node_modules\serialport release\node_modules\serialport

REM Copy other files
echo [4/4] Copying additional files...
xcopy /E /I /Y dist release\dist
xcopy /E /I /Y database release\database
if not exist "release\uploads" mkdir "release\uploads"
copy package.json release\package.json

echo.
echo Build complete! Executable: release\iot-scales-v2.exe
pause
```

### Script Run Portable (run-portable.bat)

Buat file `release/run.bat`:

```batch
@echo off
cd /d "%~dp0"
echo Starting IoT Scales V2...
iot-scales-v2.exe
```

---

## ⚠️ Catatan Penting

### Serialport Native Module

`serialport` memerlukan kompilasi native binding. Ada 2 opsi:

#### Opsi A: Copy node_modules (Recommended)
Copy seluruh folder `node_modules/serialport` ke release folder. File executable akan menggunakan native bindings yang sudah dikompilasi.

#### Opsi B: Pre-build Native Bindings
```bash
# Build serialport untuk platform target sebelum packaging
npm rebuild serialport --target_arch=x64 --target_platform=win32
```

### Dependencies yang Perlu Di-copy

Jika menggunakan metode copy node_modules:
- ✅ `serialport` - **Wajib** (native module)
- ❌ Dependencies lainnya bisa di-bundle oleh `pkg` (jika tidak native)

### Port Serial di Executable

Executable akan menggunakan COM port langsung dari Windows (tidak melalui WSL), jadi:
- ✅ COM1-COM9: Langsung
- ✅ COM10+: Otomatis di-normalize menjadi `\\\\.\\COM10`
- ✅ Port detection akan menggunakan Windows API langsung

---

## 🐛 Troubleshooting

### Error: Cannot find module 'serialport'

**Solusi:**
1. Pastikan `node_modules/serialport` sudah di-copy ke `release/node_modules/`
2. Atau install serialport di release folder:
   ```bash
   cd release
   npm install serialport
   ```

### Error: Cannot build native module

**Solusi:**
1. Install Visual Studio Build Tools
2. Installребю Python 3.x
3. Set environment variable:
   ```batch
   npm config set msvs_version 2022
   npm config set python python3
   ```

### Executable tidak bisa membaca COM port

**Solusi:**
1. Jalankan sebagai Administrator (jika diperlukan)
2. Pastikan COM port tidak digunakan aplikasi lain
3. Cek Device Manager untuk melihat COM port yang tersedia

### Error: Module not found untuk dependencies lain

**Solusi:**
Jika ada dependency lain yang tidak ter-bundle, tambahkan ke `pkg.config.json`:

```json
{
  "pkg": {
    "assets": [
      "dist/**/*",
      "database/**/*",
      "node_modules/dependency-name/**/*"
    ]
  }
}
```

---

## 📦 Distribusi

### Portable Version
1. Zip seluruh folder `release/`
2. Nama: `IoT-Scales-V2-Portable-1.7.0.zip`
3. User cukup extract dan jalankan `iot-scales-v2.exe`

### Installer Version
1. File installer: `IoT-Scales-V2-Setup-1.7.0.exe`
2. User double-click untuk install
3. Aplikasi akan terinstall di `C:\Program Files\IoT Scales V2`

---

## 🔄 Update Script di package.json

Tambahkan script berikut ke `package.json`:

```json
{
  "scripts": {
    "build:package": "node build-package.js",
    "build:installer": "iscc installer.iss",
    "package:full": "npm run build && npm run build:package && npm run build:installer"
  }
}
```

---

## 📝 Checklist Sebelum Distribusi

- [ ] Frontend sudah di-build (`npm run build`)
- [ ] Executable sudah dibuat (`node build-package.js`)
- [ ] `node_modules/serialport` sudah di-copy ke release
- [ ] Test executable di komputer tanpa Node.js
- [ ] Test koneksi serial port
- [ ] Test semua fitur aplikasi
- [ ] Buat installer (opsional)
- [ ] Dokumentasi user (README untuk user)

---

## 🎓 Tips

1. **Test di Clean Machine**: Test executable di komputer bersih (tanpa Node.js/npm) untuk memastikan semua dependencies sudah ter-bundle.

2. **Size Optimization**: 
   - Hanya copy native modules yang diperlukan
   - Hapus devDependencies sebelum packaging

3. **Version Management**:
   - Update version di `package.json` dan `pkg.config.json`
   - Update version di `installer.iss` juga

4. **Signing Executable** (Opsional):
   - Untuk distribusi profesional, pertimbangkan code signing
   - Tools: SignTool dari Windows SDK

---

Untuk pertanyaan lebih lanjut, lihat dokumentasi `pkg`: https://github.com/vercel/pkg


