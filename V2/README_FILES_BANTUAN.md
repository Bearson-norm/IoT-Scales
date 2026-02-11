# 📚 File-File Bantuan & Troubleshooting

Folder ini berisi beberapa file bantuan untuk memudahkan setup dan troubleshooting.

---

## 🚀 File Eksekusi (.bat)

### Untuk Setup Database:

| File | Kegunaan | Kapan Digunakan |
|------|----------|-----------------|
| `setup-database.bat` | Setup database normal | Jika semua dependency sudah OK |
| **`setup-database-debug.bat`** ⭐ | Setup database dengan debug mode | **Jika setup-database.bat langsung tertutup** |
| `fix-passwords-standalone.bat` | Fix password user | Jika tidak bisa login setelah setup |

### Untuk Menjalankan Server:

| File | Kegunaan | Kapan Digunakan |
|------|----------|-----------------|
| `start-server.bat` | Start aplikasi server | Setelah database setup selesai |
| `stop-server.bat` | Stop server | Jika ingin stop server yang running |

### Untuk Pengecekan:

| File | Kegunaan | Kapan Digunakan |
|------|----------|-----------------|
| **`check-requirements.bat`** ⭐ | Cek semua system requirement | **PERTAMA KALI di device baru** |

---

## 📖 File Dokumentasi (.md)

### Quick Start (Baca Ini Dulu!):

| File | Isi | Untuk Siapa? |
|------|-----|--------------|
| **`QUICK_FIX_SETUP_DATABASE.md`** ⚡ | Solusi super cepat 1 menit | **Jika setup-database.bat langsung tertutup** |
| `README.md` | Dokumentasi utama aplikasi | Semua user |

### Panduan Setup:

| File | Isi | Untuk Siapa? |
|------|-----|--------------|
| **`PANDUAN_SETUP_DATABASE.md`** 📚 | Panduan lengkap setup database | Setup di device baru |
| `docs/CARA_MENJALANKAN.md` | Cara menjalankan aplikasi | User baru |

### Troubleshooting:

| File | Isi | Untuk Siapa? |
|------|-----|--------------|
| **`CARA_MENGATASI_BAT_TERTUTUP.md`** 🔧 | Troubleshooting file .bat tertutup | Jika .bat file langsung tertutup |
| `docs/TROUBLESHOOTING_BAT_FILES.md` | Troubleshooting detail .bat files | Developer / advanced user |
| `docs/CARA_MENGATASI_ERROR.md` | Troubleshooting error umum | Jika ada error saat running |

---

## 🎯 Flowchart: File Mana yang Harus Dibaca?

```
┌─────────────────────────────────┐
│ Baru setup di device baru?      │
└─────────────┬───────────────────┘
              │
              ▼
        ┌─────────────┐
        │ STEP 1:     │
        │ check-      │
        │ requirements│
        │ .bat        │
        └─────┬───────┘
              │
              ▼
        Semua hijau ✅?
              │
      ┌───────┴───────┐
      │               │
      NO              YES
      │               │
      ▼               ▼
Install yang    STEP 2:
kurang          setup-database.bat
      │         langsung tertutup?
      │               │
      │         ┌─────┴─────┐
      │         │           │
      │         YES         NO
      │         │           │
      │         ▼           ▼
      │   Gunakan:    Lanjut ke
      │   setup-      STEP 3
      │   database-
      │   debug.bat
      │         │
      │         ▼
      └─────► Baca error
                    │
              ┌─────┴─────┐
              │           │
          Error?       Success?
              │           │
              ▼           ▼
        Baca file:   STEP 3:
        PANDUAN_     npm install
        SETUP_       │
        DATABASE.md  ▼
              │      start-server.bat
              │           │
              │           ▼
              └──────► DONE! 🎉
```

---

## 🆘 Saya Punya Masalah Ini:

### ❌ "setup-database.bat langsung tertutup"

**Solusi tercepat:**
1. Jalankan `setup-database-debug.bat`
2. ATAU baca `QUICK_FIX_SETUP_DATABASE.md`
3. ATAU baca `PANDUAN_SETUP_DATABASE.md` (detail lengkap)

### ❌ "Semua file .bat langsung tertutup"

**Solusi:**
1. Baca `CARA_MENGATASI_BAT_TERTUTUP.md`
2. Jalankan dari Command Prompt (bukan double-click)

### ❌ "Tidak tahu apa yang harus diinstall"

**Solusi:**
1. Jalankan `check-requirements.bat`
2. File ini akan memberitahu SEMUA yang perlu diinstall

### ❌ "Tidak bisa login setelah setup database"

**Solusi:**
1. Jalankan `fix-passwords-standalone.bat`
2. Password default: admin/admin123

### ❌ "Server tidak bisa start"

**Solusi:**
1. Pastikan database sudah setup: `setup-database.bat`
2. Install dependencies: `npm install`
3. Jalankan: `start-server.bat`
4. Baca: `docs/CARA_MENJALANKAN.md`

### ❌ "Error lain yang tidak tahu cara fix"

**Solusi:**
1. Baca `docs/CARA_MENGATASI_ERROR.md`
2. Atau hubungi developer dengan screenshot error

---

## 🎓 Urutan Baca untuk Pemula

Jika Anda **pertama kali** setup di device baru:

```
1. ✅ check-requirements.bat
   ↓ (cek apa yang perlu diinstall)
   
2. 📚 QUICK_FIX_SETUP_DATABASE.md  
   ↓ (baca ini jika setup-database.bat tertutup)
   
3. ✅ setup-database-debug.bat
   ↓ (jalankan ini untuk setup database)
   
4. 📚 docs/CARA_MENJALANKAN.md
   ↓ (cara jalankan aplikasi)
   
5. ✅ start-server.bat
   ↓ (jalankan server)
   
6. 🎉 Buka browser: http://localhost:3001
```

---

## 🎓 Urutan Baca untuk Advanced User

Jika Anda sudah familiar dengan command line:

```
1. ✅ check-requirements.bat
2. ✅ setup-database.bat (dari cmd)
3. ✅ npm install
4. ✅ start-server.bat
5. 🎉 Done!
```

---

## 💡 Tips Pro

### Tip 1: Gunakan File Debug
Jangan langsung double-click `.bat` file di device baru.
Selalu gunakan versi `-debug.bat` atau jalankan dari Command Prompt.

### Tip 2: Baca Quick Fix Dulu
Sebelum baca dokumentasi panjang, cek dulu `QUICK_FIX_*.md` files.

### Tip 3: Check Requirements First
Selalu jalankan `check-requirements.bat` di device baru sebelum setup.

### Tip 4: Screenshot Error
Jika ada error, screenshot dan kirim ke developer dengan output dari:
- `check-requirements.bat`
- Error message lengkap

---

## 📞 Butuh Bantuan?

Jika masih bingung setelah membaca semua file di atas:

1. **Screenshot** output dari `check-requirements.bat`
2. **Screenshot** error yang muncul
3. **Kirim** ke developer dengan informasi:
   - Windows version
   - PostgreSQL version
   - Node.js version
   - Error message lengkap

---

## 📁 Struktur File Bantuan

```
V2/
├── ⭐ check-requirements.bat         (CEK INI DULU!)
├── ⭐ setup-database-debug.bat       (GUNAKAN INI JIKA SETUP TERTUTUP!)
├── setup-database.bat
├── start-server.bat
├── stop-server.bat
├── fix-passwords-standalone.bat
│
├── ⚡ QUICK_FIX_SETUP_DATABASE.md   (BACA INI DULU JIKA ADA MASALAH!)
├── 📚 PANDUAN_SETUP_DATABASE.md     (Panduan detail setup)
├── 🔧 CARA_MENGATASI_BAT_TERTUTUP.md
├── README.md
├── README_FILES_BANTUAN.md           (File ini!)
│
└── docs/
    ├── CARA_MENJALANKAN.md
    ├── CARA_MENGATASI_ERROR.md
    └── TROUBLESHOOTING_BAT_FILES.md
```

---

**Quick Links:**
- 🚨 Setup database tertutup? → `QUICK_FIX_SETUP_DATABASE.md`
- 📋 Setup di device baru? → `PANDUAN_SETUP_DATABASE.md`  
- 🔧 File .bat tertutup? → `CARA_MENGATASI_BAT_TERTUTUP.md`
- ✅ Cek requirement? → `check-requirements.bat`

---

**Dibuat:** 19 Desember 2025  
**Versi:** 1.0  
**Untuk:** IoT Scales V2
