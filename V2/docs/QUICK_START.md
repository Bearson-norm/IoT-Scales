# Quick Start Guide - IoT Scales V2

## Setup Cepat (5 Menit)

### Windows
1. **Download dan Install Prerequisites:**
   - Node.js: https://nodejs.org/ (LTS version)
   - PostgreSQL: https://www.postgresql.org/download/windows/

2. **Jalankan Setup Otomatis:**
   ```cmd
   setup.bat
   ```

3. **Buka Aplikasi:**
   - Browser akan otomatis membuka di http://localhost:3000
   - Login dengan: `faliq` / `123456`

### Linux/macOS
1. **Install Prerequisites:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nodejs npm postgresql postgresql-contrib
   
   # macOS
   brew install node postgresql
   ```

2. **Jalankan Setup:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Buka Aplikasi:**
   - Buka browser ke http://localhost:3000
   - Login dengan: `faliq` / `123456`

## Manual Setup (Jika Script Gagal)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Buat database
sudo -u postgres psql -c "CREATE DATABASE FLB_MOWS;"

# Import schema
sudo -u postgres psql -d FLB_MOWS -f database/schema.sql
```

### 3. Start Application
```bash
npm run dev
```

## Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| faliq | 123456 | Operator |
| admin | admin123 | Admin |
| operator1 | op123 | Operator |
| supervisor | sup123 | Supervisor |

## Troubleshooting

### Port 3000 Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :3000
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Dependencies Install Failed
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Konfigurasi Hardware:** Lihat `SETUP_GUIDE.md` untuk setup timbangan dan scanner
2. **Customization:** Edit data di `src/App.jsx` untuk menyesuaikan dengan kebutuhan
3. **Production:** Lihat bagian Deployment di `SETUP_GUIDE.md`

## Support

- **Dokumentasi Lengkap:** `SETUP_GUIDE.md`
- **Issues:** [GitHub Issues]
- **Email:** support@presisitech.com

