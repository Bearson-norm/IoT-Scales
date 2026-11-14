# 🏭 IoT Scales V2 - Manufacturing Weighing System

Aplikasi penimbangan mixing untuk proses manufaktur produksi yang memungkinkan pengguna untuk melakukan proses penimbangan dengan verifikasi barcode yang ketat.

## 🚀 Quick Start

### Windows Setup (5 Menit)
```bash
# 1. Install Node.js 18+ dan PostgreSQL
# 2. Jalankan setup otomatis
check-requirements.bat   # opsional
setup.bat
# Frontend: http://localhost:3000  |  API: http://localhost:3001
# Login: admin / admin123
```

Panduan lengkap: **[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)**

### Linux/macOS Setup
```bash
# 1. Install dependencies
sudo apt install nodejs npm postgresql postgresql-contrib

# 2. Setup database
sudo -u postgres psql -c "CREATE DATABASE FLB_MOWS;"
sudo -u postgres psql -d FLB_MOWS -f database/schema.sql

# 3. Install dan start aplikasi
npm install
npm run dev
```

## 📋 Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| faliq | 123456 | Operator |
| admin | admin123 | Admin |
| operator1 | op123 | Operator |
| supervisor | sup123 | Supervisor |

## 🎯 Fitur Utama

### 🔐 Sistem Autentikasi
- Multi-role authentication (Admin, Operator, Supervisor)
- Demo accounts untuk testing
- Session management

### 📊 Sistem Penimbangan
- Real-time weight monitoring
- Hardware scale integration
- Progress tracking
- Tolerance control

### 📱 Barcode Scanning
- Multi-type scanner support
- Hardware scanner integration
- Camera-based scanning
- Manual input fallback

### 🗄️ Database Management
- Master data management
- Product, formulation, user management
- Data import/export
- Backup & restore

### 📥 Formula Import (NEW!)
- Import data formulation dan product dari file Excel/CSV
- Format "Formula to Input" yang spesifik
- Validasi file otomatis
- Preview data sebelum import
- Template download
- Progress tracking
- Error handling

### 📊 Import Logging (NEW!)
- Logging untuk semua operasi import
- Import history tracking
- Error logging dan monitoring
- Server database configuration
- Import progress tracking

### ⚙️ Settings & Configuration
- Scale configuration
- Database settings
- User management
- Notification settings
- Server database configuration

### 📈 History & Reporting
- Production history tracking
- Import history tracking
- Advanced filtering
- Export functionality
- Audit trail

## 🛠️ Teknologi

- **Frontend:** React 18, Vite, Lucide React
- **Backend:** PostgreSQL
- **Hardware:** Serial/USB scale, barcode scanner
- **Platform:** Windows, Linux, macOS

## 📁 Struktur Proyek

```
IoT-Scales-V2/
├── src/
│   ├── components/          # UI Components
│   ├── config/             # Configuration
│   └── utils/              # Utilities
├── database/
│   ├── schema.sql          # Database schema
│   └── README.md           # Database documentation
├── setup.bat               # Windows setup script
├── setup.sh                # Linux/macOS setup script
└── docs/                   # Documentation
```

## 📚 Dokumentasi

### Setup and Installation
- **[Setup Guide](docs/SETUP_GUIDE.md)** - Panduan setup lengkap (port, password, branding)
- **[Quick Start](QUICK_START.md)** - Setup cepat
- **[Troubleshooting](TROUBLESHOOTING.md)** - Panduan troubleshooting

### Feature Documentation
- **[Import Logging](IMPORT_LOGGING_FEATURES.md)** - Fitur import logging
- **[Formula Import](FORMULA_IMPORT_FEATURES.md)** - Fitur Formula Import
- **[Complete Guide](FORMULA_IMPORT_COMPLETE_GUIDE.md)** - Panduan lengkap Formula Import

### User Guides
- **[Documentation Index](docs/README.md)** - Index dokumentasi
- **[Formula Import User Guide](docs/FORMULA_IMPORT_README.md)** - Panduan user Formula Import
- **[Templates Guide](templates/README.md)** - Panduan template files

### Database
- **[Database Schema](database/schema.sql)** - Database structure

## 🔧 Troubleshooting

### Common Issues:
1. **Database connection failed** → Check PostgreSQL service
2. **Port 3000 in use** → Kill process or change port
3. **Dependencies failed** → Clear cache and reinstall

**📋 For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

## 🚀 Development

### Prerequisites:
- Node.js 18+
- PostgreSQL 12+
- Git

### Setup Development:
```bash
# Clone repository
git clone <repository-url>
cd IoT-Scales-V2

# Install dependencies
npm install

# Setup database
psql -U postgres -c "CREATE DATABASE FLB_MOWS;"
psql -U postgres -d FLB_MOWS -f database/schema.sql

# Start development server
npm run dev
```

### Build for Production:
```bash
npm run build
npm run preview
```

## 📞 Support

- **Email:** support@presisitech.com
- **Documentation:** [Setup Guide](SETUP_GUIDE.md)
- **Issues:** [GitHub Issues]

## 📄 License

v1.7.0 - PRESISITECH

---

**🎯 Ready to start? Run `setup.bat` (Windows) or `setup.sh` (Linux/macOS) to get started!**