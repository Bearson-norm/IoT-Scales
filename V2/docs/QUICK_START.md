# Quick Start Guide - IoT Scales V2

## Setup Cepat (5 Menit)

### Windows

1. **Install prerequisites:**
   - Node.js 18+ LTS: https://nodejs.org/
   - PostgreSQL 14+: https://www.postgresql.org/download/windows/

2. **Cek sistem (opsional):**
   ```cmd
   check-requirements.bat
   ```

3. **Jalankan setup otomatis:**
   ```cmd
   setup.bat
   ```
   Setup akan: `npm install` → buat `.env` dari `env.example` → `setup-database.bat` → `npm run dev:full`

4. **Buka aplikasi:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - Login: `admin` / `admin123`

Panduan lengkap: [SETUP_GUIDE.md](./SETUP_GUIDE.md)

### Linux/macOS

1. Install Node.js dan PostgreSQL
2. Copy env: `cp env.example .env`
3. Setup DB: `./setup.sh` (jika tersedia) atau manual import schema
4. `npm install && npm run dev:full`

## Port Resmi

| Layanan | Port |
|---------|------|
| Frontend (Vite dev) | 3000 |
| Backend API | 3001 |
| PostgreSQL | 5432 |

## Kredensial Database (Default)

| Setting | Nilai |
|---------|-------|
| DB_NAME | FLB_MOWS |
| DB_USER | postgres |
| DB_PASSWORD | Admin123 |
| DB_PORT | 5432 |

## Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| faliq | 123456 | Operator |
| operator1 | op123 | Operator |
| supervisor | sup123 | Supervisor |

## Manual Setup (Jika Script Gagal)

```bash
npm install
copy env.example .env          # Windows
setup-database.bat             # Windows
npm run dev:full
```

## Troubleshooting

### Port 3000 / 3001 Already in Use

```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Failed

1. Pastikan PostgreSQL service running
2. Cek `DB_PASSWORD=Admin123` di `.env`
3. Jalankan `setup-database.bat`

### Server Tidak Merespons di Login

Jalankan `start-server.bat` atau `npm run server` — halaman login menampilkan status health.

## Next Steps (Admin)

1. Settings → checklist setup awal (timbangan, printer, import CSV)
2. Database → Import CSV dengan **Full Refresh**
3. Settings → Umum → upload logo (opsional)
