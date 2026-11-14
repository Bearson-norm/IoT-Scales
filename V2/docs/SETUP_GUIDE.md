# IoT Scales V2 — Setup Guide

Panduan instalasi resmi untuk Windows (lingkungan produksi / development).

## Prerequisites

| Komponen | Versi | Catatan |
|----------|-------|---------|
| Node.js | 18+ LTS | https://nodejs.org/ |
| PostgreSQL | 14+ | https://www.postgresql.org/download/windows/ |
| npm | (bundled Node) | `npm install` di folder proyek |

## Port & Kredensial Resmi

| Layanan | Port / Nilai | File konfigurasi |
|---------|--------------|------------------|
| Backend API | **3001** | `.env` → `PORT=3001` |
| Frontend (dev) | **5173** (Vite default) atau **3000** jika `npm run dev:full` | `vite.config.js` |
| PostgreSQL | **5432** | `.env` → `DB_PORT=5432` |
| Database | **FLB_MOWS** | `.env` → `DB_NAME=FLB_MOWS` |
| DB User | **postgres** | `.env` → `DB_USER=postgres` |
| DB Password (default setup) | **Admin123** | `.env` → `DB_PASSWORD=Admin123` |

> Ubah password PostgreSQL di `.env` jika instalasi Anda menggunakan password berbeda. Pastikan `setup-database.bat` dan `scripts/load-db-env.bat` membaca nilai yang sama.

## Jalur Setup (Disarankan)

### 1. Cek sistem

```cmd
check-requirements.bat
```

### 2. Setup lengkap (otomatis)

```cmd
setup.bat
```

Script ini akan:
1. Cek Node.js & PostgreSQL
2. `npm install`
3. Copy `env.example` → `.env` jika belum ada
4. Menjalankan `setup-database.bat` (migration saja jika DB sudah ada; schema penuh hanya instalasi baru)

### Mode setup database

| Perintah | Perilaku |
|----------|----------|
| `setup-database.bat` | **Default (upgrade)** — data lama **tetap aman**. Hanya terapkan migration baru. |
| `setup-database.bat` (DB belum ada) | Instalasi baru — buat DB + schema + seed user |
| `setup-database-fresh.bat` | **Hapus semua data** — DROP + CREATE database (pakai hanya jika sengaja reset) |
| `setup-database-fresh-keep-users.bat` | Reset penuh **tanpa sample data**, **pertahankan akun login** (`master_user`) |
5. Start `npm run dev:full` (backend + frontend)

### 3. Setup database saja (manual)

```cmd
copy env.example .env
setup-database.bat
npm run dev:full
```

### 4. Start tanpa setup ulang

```cmd
start-server.bat    REM backend :3001
npm run dev         REM frontend :5173 (terminal terpisah)
```

Atau:

```cmd
npm run dev:full
```

## Login Default

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| faliq | 123456 | Operator |
| operator1 | op123 | Operator |
| supervisor | sup123 | Supervisor |

Halaman login menampilkan status server/database via `GET /api/health`.

## Branding & Logo

Setiap site/deployment dapat punya logo sendiri tanpa rebuild frontend.

### Opsi A — File di folder `branding/`

```
branding/
├── branding.json      # metadata (companyName, appTitle)
├── logo.png           # logo login & header (opsional)
├── favicon.ico        # favicon browser (opsional)
└── app.ico            # icon installer Inno Setup (opsional)
```

Contoh `branding.json`:

```json
{
  "companyName": "Nama Perusahaan Anda",
  "appTitle": "Manufacturing Weighing System",
  "logoUrl": null,
  "faviconUrl": null
}
```

### Opsi B — Upload via Settings

1. Login sebagai **admin**
2. **Settings → Umum → Branding & Logo → Upload Logo**

Server serve file statis di `/branding/*` dan metadata di `GET /api/branding`.

## Import Data Master (CSV)

1. **Database → Import**
2. Pastikan **Full Refresh** aktif (default) saat mengganti BOM / menghapus bahan dari formulasi
3. **Preview Import** — periksa estimasi baris BOM yang akan di-nonaktifkan
4. **Confirm Import**

Full Refresh:
- **Tanpa history produksi**: hard reset master data, lalu import CSV
- **Dengan history**: upsert + soft delete (`is_active=false`) — history penimbangan tetap aman

## Checklist Admin (First Run)

Di **Settings → Umum**, checklist setup awal mencakup:
- Database health OK
- Konfigurasi timbangan
- Konfigurasi printer
- Import data master CSV
- Upload logo (opsional)

## Troubleshooting

| Gejala | Solusi |
|--------|--------|
| Login: "Server tidak merespons" | Jalankan `start-server.bat` atau `npm run server` |
| Login: "Database belum diinisialisasi" | Jalankan `setup-database.bat` |
| `psql` connection refused | Start service PostgreSQL (`services.msc`) |
| Password PostgreSQL salah | Sesuaikan `DB_PASSWORD` di `.env`, jalankan ulang setup |
| Port 3001 sudah dipakai | Ubah `PORT` di `.env` atau hentikan proses yang memakai port |
| Import: bahan lama masih muncul di MO | Gunakan Full Refresh + nomor MO baru |
| Kolom `is_active` tidak ada | Jalankan migration: `run-migration-is-active.bat` |

## Build Package (Production)

```cmd
npm run build:package
```

Output di folder `release/` — termasuk `branding/`, `dist/`, `IoT-scales-V2.exe`.

Installer (Inno Setup):

```cmd
npm run build:installer
```

Letakkan `branding/app.ico` sebelum build installer untuk icon setup custom.
