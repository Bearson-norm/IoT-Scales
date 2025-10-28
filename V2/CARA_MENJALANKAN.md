# 📋 Cara Menjalankan IoT Scales V2

## 🚀 Cara Cepat - Start Aplikasi

### Windows (PowerShell / Command Prompt)

```bash
# 1. Buka terminal di folder proyek
cd "C:\Users\info\Documents\Project\not-released\IoT-Project\Released-Github\IoT-Scales\V2"

# 2. Install dependencies (jika belum)
npm install

# 3. Start Server Backend (Terminal 1)
npm run start-server
# atau
start-server.bat

# Server akan running di: http://localhost:3001

# 4. Start Frontend Development Server (Terminal 2)
npm run dev
# atau
npx vite

# Frontend akan running di: http://localhost:5173
```

### Atau Dengan Script Batch (Lebih Mudah)

```bash
# Double-click file start-server.bat
# Akan auto-start server backend
```

---

## 📝 Penjelasan Lengkap

### 1. Prerequisites (Yang Diperlukan)

✅ **Node.js** (v18 atau lebih baru)  
✅ **PostgreSQL** (Database server)  
✅ **Database FLB_MOWS** sudah dibuat dan di-setup

### 2. Start Server Backend (API)

Server backend berjalan di **port 3001** dan menyediakan API endpoints:

```bash
npm run start-server
```

**Atau jalankan file batch:**
- Windows: Double-click `start-server.bat`
- Akan menampilkan:
  ```
  Starting IoT Scales V2 Server...
  Server will be available at: http://localhost:3001
  API endpoints available at: http://localhost:3001/api/
  ```

### 3. Start Frontend (UI React)

Di terminal **TERPISAH**, jalankan:

```bash
npm run dev
```

**Vite Dev Server** akan start di: **http://localhost:5173**

### 4. Akses Aplikasi

1. Buka browser
2. Go to: **http://localhost:5173**
3. Login dengan akun demo:
   - **Username:** `faliq`
   - **Password:** `123456`
   - **Role:** Operator

---

## 🔧 Troubleshooting

### Port 3001 Already in Use

Jika port 3001 sudah digunakan:

```bash
# Windows PowerShell
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Atau restart server dengan:
stop-server.bat
start-server.bat
```

### Port 5173 Already in Use (Vite)

```bash
# Windows PowerShell
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F
```

### Database Connection Failed

Pastikan PostgreSQL service running:

```bash
# Windows
sc query postgresql

# Start service
net start postgresql-x64-15

# Atau melalui Services.msc
```

### Module Not Found Error

```bash
# Clear cache dan reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

---

## 📊 Struktur Running

### Terminal 1: Backend Server
```bash
npm run start-server
# Menyediakan API di: http://localhost:3001/api/
```

### Terminal 2: Frontend Dev Server  
```bash
npm run dev
# Menyediakan UI di: http://localhost:5173
```

### Browser
```
http://localhost:5173
# Akan auto-connect ke API di port 3001
```

---

## 🎯 Test Fitur Master Formulation

Setelah aplikasi running:

1. **Login** dengan akun: `faliq` / `123456`
2. Klik menu **"Master Formulation"** di sidebar
3. Lihat tabel formulations:
   - Formulation Name
   - Formulation Code (SKU)
   - Total Ingredients
   - Status
   - Action menu (titik tiga)
4. Klik **Edit** (tombol titik tiga) pada salah satu formulation
5. Halaman Edit akan menampilkan:
   - Formulation details (Code, Name, Total Mass, Status)
   - Tabel ingredients dengan kolom lengkap

---

## 📚 Perintah NPM yang Tersedia

```bash
# Development
npm run dev              # Start Vite dev server (frontend)
npm run build            # Build untuk production
npm run preview          # Preview production build

# Server
npm run server           # Start backend server saja
npm run start-server     # Start dengan batch script
npm run stop-server      # Stop server

# Production
npm run start            # Build + start server (production mode)
```

---

## ✅ Checklist Sebelum Running

- [ ] PostgreSQL service running
- [ ] Database FLB_MOWS sudah dibuat
- [ ] Dependencies sudah di-install (`npm install`)
- [ ] Port 3001 dan 5173 tidak digunakan aplikasi lain
- [ ] File `server.js` dan `src/` folder ada
- [ ] File `.env` atau konfigurasi database sudah setup

---

## 🎉 Selesai!

Jika semua berjalan dengan baik, Anda akan melihat:
- ✅ Server running di terminal 1
- ✅ Frontend dev server running di terminal 2  
- ✅ Browser terbuka di http://localhost:5173
- ✅ Login page muncul
- ✅ Master Formulation menampilkan data dari database

**Selamat mencoba! 🚀**



