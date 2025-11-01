# Documentation Index

## Overview
Dokumentasi lengkap untuk IoT Scales V2, termasuk fitur baru Formula Import.

## Main Documentation

### 1. Setup and Installation
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)**: Panduan setup lengkap dari nol
- **[QUICK_START.md](QUICK_START.md)**: Panduan quick start
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**: Panduan troubleshooting

### 2. Features Documentation
- **[IMPORT_LOGGING_FEATURES.md](IMPORT_LOGGING_FEATURES.md)**: Fitur import logging
- **[FORMULA_IMPORT_FEATURES.md](FORMULA_IMPORT_FEATURES.md)**: Fitur Formula Import
- **[FORMULA_IMPORT_COMPLETE_GUIDE.md](FORMULA_IMPORT_COMPLETE_GUIDE.md)**: Panduan lengkap Formula Import

### 3. Database Documentation
- **[DATABASE_CONFIGURATION.md](DATABASE_CONFIGURATION.md)**: Konfigurasi database
- **[DATABASE_IMPORT_FEATURE.md](DATABASE_IMPORT_FEATURE.md)**: Fitur import database
- **[DATABASE_STRUCTURE_UPDATE.md](DATABASE_STRUCTURE_UPDATE.md)**: Update struktur database

### 4. Packaging & Deployment
- **[PACKAGING_GUIDE.md](PACKAGING_GUIDE.md)**: Panduan packaging aplikasi
- **[SERIALPORT_PACKAGING.md](SERIALPORT_PACKAGING.md)**: Packaging serialport module
- **[SERVER_TROUBLESHOOTING.md](SERVER_TROUBLESHOOTING.md)**: Troubleshooting server

### 5. Development & Testing
- **[TESTING_INSTRUCTIONS.md](TESTING_INSTRUCTIONS.md)**: Instruksi testing
- **[QUICK_STATS_FIX.md](QUICK_STATS_FIX.md)**: Quick stats fix
- **[IMPORT_FIX_SUMMARY.md](IMPORT_FIX_SUMMARY.md)**: Summary import fix

### 6. UI & Features
- **[UI_ENHANCEMENTS.md](UI_ENHANCEMENTS.md)**: UI enhancements
- **[UI_MASTER_PRODUCT_UPDATE.md](UI_MASTER_PRODUCT_UPDATE.md)**: Update master product UI
- **[API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)**: Panduan integrasi API

### 3. User Guides
- **[FORMULA_IMPORT_README.md](FORMULA_IMPORT_README.md)**: Panduan Formula Import untuk user
- **[Templates README](../templates/README.md)**: Panduan template files

## Feature Documentation

### Import Logging Features
- **File**: `IMPORT_LOGGING_FEATURES.md`
- **Description**: Dokumentasi fitur import logging dan server database configuration
- **Features**:
  - Import logging untuk semua operasi import
  - Server database configuration
  - Import history tracking
  - Error logging dan monitoring

### Formula Import Features
- **File**: `FORMULA_IMPORT_FEATURES.md`
- **Description**: Dokumentasi teknis fitur Formula Import
- **Features**:
  - Import file Formula to Input
  - Data transformation
  - File validation
  - Progress tracking
  - Error handling

### Formula Import Complete Guide
- **File**: `FORMULA_IMPORT_COMPLETE_GUIDE.md`
- **Description**: Panduan lengkap untuk Formula Import
- **Content**:
  - Fitur utama
  - Cara menggunakan
  - Format file
  - Data transformation
  - Integration
  - Troubleshooting
  - Best practices
  - Technical details

## User Guides

### Formula Import README
- **File**: `docs/FORMULA_IMPORT_README.md`
- **Description**: Panduan user untuk Formula Import
- **Content**:
  - Pengenalan fitur
  - Cara menggunakan
  - Format file
  - Troubleshooting
  - Best practices

### Templates README
- **File**: `templates/README.md`
- **Description**: Panduan template files
- **Content**:
  - Template CSV
  - Format kolom
  - Tips dan best practices
  - Troubleshooting

## Setup Documentation

### Setup Guide
- **File**: `SETUP_GUIDE.md`
- **Description**: Panduan setup lengkap dari nol
- **Content**:
  - System requirements
  - Dependency installation
  - Database setup
  - Application configuration
  - Hardware setup
  - Deployment
  - Testing

### Quick Start
- **File**: `QUICK_START.md`
- **Description**: Panduan quick start
- **Content**:
  - Prerequisites
  - Quick setup
  - Basic configuration
  - First run

### Troubleshooting
- **File**: `TROUBLESHOOTING.md`
- **Description**: Panduan troubleshooting
- **Content**:
  - Common issues
  - Error solutions
  - Performance issues
  - Hardware issues
  - Network issues

## File Structure

```
docs/
├── README.md                           # Documentation index (this file)
├── FORMULA_IMPORT_README.md           # User guide Formula Import
├── SETUP_GUIDE.md                      # Setup guide
├── QUICK_START.md                      # Quick start guide
├── TROUBLESHOOTING.md                  # Troubleshooting guide
├── IMPORT_LOGGING_FEATURES.md          # Import logging features
├── FORMULA_IMPORT_FEATURES.md          # Formula Import features
├── FORMULA_IMPORT_COMPLETE_GUIDE.md    # Complete Formula Import guide
├── PACKAGING_GUIDE.md                  # Packaging guide
├── DATABASE_*.md                       # Database documentation
├── SERVER_TROUBLESHOOTING.md           # Server troubleshooting
└── [Other documentation files]

scripts/
├── fix-database.bat                    # Database fix script
├── quick-fix.bat                       # Quick fix script
└── setup-fix.bat                       # Setup fix script

samples/
├── test-import.csv                     # Sample import file
├── populate-formulation-ingredients.js # Sample script
└── Formula to Input*.xlsx              # Sample Excel files

templates/
├── README.md                           # Templates guide
├── formula_template.csv                # Template CSV
└── [Other template files]

[Root Directory]
├── README.md                           # Main README
├── setup.bat                           # Main setup script
├── setup-database.bat                  # Database setup
├── build-package.bat                   # Packaging script
├── start-server.bat                    # Start server
├── stop-server.bat                     # Stop server
└── [Source files and configuration]
```

## Getting Started

### For New Users
1. **Setup**: Baca `docs/SETUP_GUIDE.md` untuk setup awal
2. **Quick Start**: Ikuti `docs/QUICK_START.md` untuk mulai cepat
3. **Features**: Pelajari fitur di `docs/IMPORT_LOGGING_FEATURES.md` dan `docs/FORMULA_IMPORT_FEATURES.md`

### For Developers
1. **Technical Details**: Baca `docs/FORMULA_IMPORT_FEATURES.md` untuk detail teknis
2. **Complete Guide**: Pelajari `docs/FORMULA_IMPORT_COMPLETE_GUIDE.md` untuk panduan lengkap
3. **Packaging**: Lihat `docs/PACKAGING_GUIDE.md` untuk packaging aplikasi
4. **Troubleshooting**: Gunakan `docs/TROUBLESHOOTING.md` untuk masalah teknis

### For Users
1. **User Guide**: Baca `docs/FORMULA_IMPORT_README.md` untuk panduan user
2. **Templates**: Gunakan `templates/README.md` untuk template files
3. **Samples**: Lihat `samples/` untuk contoh file import
4. **Troubleshooting**: Gunakan `docs/TROUBLESHOOTING.md` untuk masalah umum

## Support

### Documentation
- **Setup Guide**: `SETUP_GUIDE.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Feature Documentation**: `IMPORT_LOGGING_FEATURES.md`, `FORMULA_IMPORT_FEATURES.md`
- **User Guides**: `docs/FORMULA_IMPORT_README.md`

### Contact
- **Technical Support**: [Contact Information]
- **Documentation**: [Documentation Link]
- **Issues**: [Issue Tracker Link]

## Changelog

### Version 1.0.0
- ✅ Initial documentation
- ✅ Setup and installation guides
- ✅ Feature documentation
- ✅ User guides
- ✅ Troubleshooting guides
- ✅ Template documentation

## Roadmap

### Planned Documentation
- [ ] API documentation
- [ ] Advanced configuration guides
- [ ] Performance optimization guides
- [ ] Security best practices
- [ ] Deployment guides
- [ ] Monitoring and maintenance guides

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Compatibility**: IoT Scales V2