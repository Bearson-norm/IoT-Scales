# 🚀 START HERE - Setup Pertama Kali

## ⚡ Setup Database Langsung Tertutup?

### Jangan Panik! Ada 2 Solusi Mudah:

---

## 🎯 Solusi 1: Gunakan File Debug (PALING MUDAH!)

**JANGAN jalankan:**
```
❌ setup-database.bat
```

**JALANKAN ini:**
```
✅ setup-database-debug.bat
```

File ini akan:
- ✅ Menampilkan error dengan jelas
- ✅ Window TIDAK akan tertutup otomatis
- ✅ Memberikan hint solusi

**Double-click file tersebut dan lihat error yang muncul!**

---

## 🎯 Solusi 2: Jalankan dari Command Prompt

### Langkah 1: Buka Command Prompt
- Tekan `Windows Key`
- Ketik `cmd`
- Tekan `Enter`

### Langkah 2: Masuk ke Folder V2
```cmd
cd C:\path\to\your\V2\folder
```
*(Ubah path sesuai lokasi folder Anda!)*

### Langkah 3: Jalankan
```cmd
setup-database.bat
```

**Sekarang Anda bisa LIHAT ERROR dengan jelas!** 👀

---

## 📋 Belum Install Requirement?

**Jalankan ini untuk cek:**
```
check-requirements.bat
```

File ini akan memberitahu:
- ❌ PostgreSQL: Belum install? Download di: https://www.postgresql.org/
- ❌ Node.js: Belum install? Download di: https://nodejs.org/
- ✅ Apa yang sudah OK

---

## 📚 Butuh Panduan Lengkap?

Baca file-file ini berurutan:

1. **`QUICK_FIX_SETUP_DATABASE.md`** ⚡ - Solusi cepat 1 menit
2. **`PANDUAN_SETUP_DATABASE.md`** 📚 - Panduan step-by-step detail
3. **`CARA_MENGATASI_BAT_TERTUTUP.md`** 🔧 - Troubleshooting umum
4. **`README_FILES_BANTUAN.md`** 📖 - Daftar semua file bantuan

---

## 🎉 Setup Berhasil?

Jika setup database sudah OK, lanjut ke:

```bash
# 1. Install dependencies
npm install

# 2. Start server
start-server.bat

# 3. Buka browser
http://localhost:3001

# 4. Login
Username: admin
Password: admin123
```

---

## 🆘 Masih Bermasalah?

**Kirim informasi ini ke developer:**

1. Screenshot dari `check-requirements.bat`
2. Screenshot error dari `setup-database-debug.bat`
3. Windows version Anda
4. PostgreSQL version: `psql --version`
5. Node.js version: `node --version`

---

**TL;DR:**
- Setup tertutup? → Gunakan `setup-database-debug.bat`
- Atau jalankan dari Command Prompt
- Belum install? → Jalankan `check-requirements.bat` dulu

**Selamat mencoba!** 🚀
