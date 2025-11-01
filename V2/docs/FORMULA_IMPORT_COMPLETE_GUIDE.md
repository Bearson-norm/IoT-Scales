# Formula Import - Panduan Lengkap

## Overview
Formula Import adalah fitur baru di IoT Scales V2 yang memungkinkan pengguna untuk mengimpor data formulation dan product dari file Excel/CSV dengan format "Formula to Input" yang spesifik. Fitur ini terintegrasi dengan sistem logging dan dapat mengimpor data ke database dengan validasi yang ketat.

## Table of Contents
1. [Fitur Utama](#fitur-utama)
2. [Cara Menggunakan](#cara-menggunakan)
3. [Format File](#format-file)
4. [Data Transformation](#data-transformation)
5. [Integration](#integration)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [Technical Details](#technical-details)

## Fitur Utama

### 1. Formula Import Modal
- ✅ **File Selection**: Mendukung file CSV, XLSX, dan XLS
- ✅ **Template Download**: Menyediakan template CSV untuk referensi format
- ✅ **Validation**: Validasi otomatis format file sebelum import
- ✅ **Preview**: Tampilan preview data sebelum import
- ✅ **Progress Tracking**: Indikator progress selama proses import
- ✅ **Error Handling**: Penanganan error yang komprehensif

### 2. Data Transformation
- ✅ **Products**: Ekstrak unique products dari file
- ✅ **Formulations**: Group data berdasarkan formulationCode
- ✅ **Tolerance Groupings**: Ekstrak unique tolerance groupings
- ✅ **Ingredients**: Map products ke formulations sebagai ingredients

### 3. Integration
- ✅ **Master Product**: Tombol "Formula Import" di halaman Master Product
- ✅ **Master Formulation**: Tombol "Formula Import" di halaman Master Formulation
- ✅ **Import Logging**: Semua import dicatat di import_logs table
- ✅ **History**: Import history dapat dilihat di History > Import History

## Cara Menggunakan

### Langkah 1: Akses Formula Import
1. Buka halaman **Master Product** atau **Master Formulation**
2. Klik tombol **"Formula Import"** (ikon FileText)

### Langkah 2: Pilih File
1. Klik **"Choose File"** untuk memilih file
2. Pilih file CSV/Excel dengan format Formula to Input
3. Sistem akan otomatis validasi file

### Langkah 3: Preview Data
1. Klik **"Show Preview"** untuk melihat data
2. Periksa data yang akan diimpor
3. Pastikan format sesuai dengan yang diharapkan

### Langkah 4: Import
1. Klik **"Import"** untuk memulai proses
2. Tunggu proses import selesai
3. Lihat hasil import dan error (jika ada)

## Format File

### Template CSV
```csv
formulationCode,formulationName,productCode,productName,targetMass,totalMass,uom,totalIngredient,status,mustFollowOrder,min,max,toleranceGroupingName,toleranceType,maxAllowedWeighingQty,implementToleranceGrouping,instruction
MIXING - FROOZY BANANA BLISS,MIXING - FROOZY BANANA BLISS,RMLIQ00255,YOGHURT N7S8006,40,1000,g,11,active,FALSE,0,0,timbanganKecil,mass,5000,TRUE,-
```

### Kolom yang Diperlukan
- `formulationCode`: Kode formulasi (string)
- `formulationName`: Nama formulasi (string)
- `productCode`: Kode produk (string)
- `productName`: Nama produk (string)
- `targetMass`: Massa target (number)
- `totalMass`: Total massa (number)
- `uom`: Unit of measure (string)
- `status`: Status (active/inactive)

### Kolom Opsional
- `totalIngredient`: Total bahan (number)
- `mustFollowOrder`: Harus mengikuti urutan (TRUE/FALSE)
- `min`: Minimum (number)
- `max`: Maximum (number)
- `toleranceGroupingName`: Nama grouping toleransi (string)
- `toleranceType`: Tipe toleransi (string)
- `maxAllowedWeighingQty`: Maksimal quantity (number)
- `implementToleranceGrouping`: Implementasi grouping (TRUE/FALSE)
- `instruction`: Instruksi (string)

## Data Transformation

### Input Format (CSV)
```csv
formulationCode,formulationName,productCode,productName,targetMass,totalMass,uom,totalIngredient,status,mustFollowOrder,min,max,toleranceGroupingName,toleranceType,maxAllowedWeighingQty,implementToleranceGrouping,instruction
MIXING - FROOZY BANANA BLISS,MIXING - FROOZY BANANA BLISS,RMLIQ00255,YOGHURT N7S8006,40,1000,g,11,active,FALSE,0,0,timbanganKecil,mass,5000,TRUE,-
```

### Output Data Structure

#### Products
```javascript
{
  productCode: "RMLIQ00255",
  productName: "YOGHURT N7S8006",
  description: "Imported from Formula to Input - YOGHURT N7S8006",
  category: "Imported",
  unit: "g",
  status: "active"
}
```

#### Formulations
```javascript
{
  formulationCode: "MIXING - FROOZY BANANA BLISS",
  formulationName: "MIXING - FROOZY BANANA BLISS",
  totalMass: 1000,
  uom: "g",
  totalIngredient: 11,
  status: "active",
  ingredients: [
    {
      productCode: "RMLIQ00255",
      productName: "YOGHURT N7S8006",
      targetMass: 40
    }
  ]
}
```

#### Tolerance Groupings
```javascript
{
  name: "timbanganKecil",
  description: "Imported tolerance grouping for timbanganKecil",
  toleranceType: "mass",
  minTolerance: 0,
  maxTolerance: 0,
  status: "active"
}
```

## Integration

### Master Product Integration
- Tombol "Formula Import" ditambahkan di halaman Master Product
- Modal Formula Import terintegrasi
- Import completion handler untuk update product list

### Master Formulation Integration
- Tombol "Formula Import" ditambahkan di halaman Master Formulation
- Modal Formula Import terintegrasi
- Import completion handler untuk update formulation list

### Import Logging
- Semua import dicatat di `import_logs` table
- Informasi logging:
  - Import type: `master_formulation`
  - Source type: `file`
  - Source name: nama file
  - Total records, successful, failed
  - Error details
  - User yang melakukan import
  - Timestamp

### History Tracking
- Import history dapat dilihat di History > Import History
- Filter berdasarkan type, status, tanggal
- Detail error untuk troubleshooting

## Troubleshooting

### Common Issues

#### 1. File Format Error
**Problem**: File tidak dapat dibaca
**Solution**: 
- Pastikan file adalah CSV dengan encoding UTF-8
- Periksa separator koma
- Download template untuk referensi

#### 2. Validation Failed
**Problem**: File tidak valid
**Solution**:
- Periksa kolom yang diperlukan
- Pastikan data tidak kosong
- Periksa format data

#### 3. Import Failed
**Problem**: Import gagal
**Solution**:
- Periksa koneksi database
- Periksa log error
- Pastikan user memiliki permission

### Debug Steps
1. **Check File Format**: Pastikan file sesuai template
2. **Validate Data**: Gunakan preview untuk periksa data
3. **Check Logs**: Lihat import history untuk error details
4. **Test Small**: Coba dengan data kecil terlebih dahulu

## Best Practices

### 1. File Preparation
- Pastikan file memiliki format yang benar
- Gunakan template yang disediakan
- Validasi data sebelum import

### 2. Data Quality
- Pastikan productCode unik
- Pastikan formulationCode konsisten
- Periksa data numerik (targetMass, totalMass)

### 3. Import Process
- Test dengan data kecil terlebih dahulu
- Backup database sebelum import besar
- Monitor import logs untuk error

### 4. Maintenance
- Regular cleanup import logs
- Monitor database size
- Update template jika diperlukan
- Training user untuk format yang benar

## Technical Details

### Files Created/Modified

#### New Files:
1. **`src/utils/formulaImport.js`**
   - `parseFormulaCSV()`: Parse CSV content
   - `transformFormulaData()`: Transform data ke format database
   - `importFormulaFile()`: Main import function
   - `validateFormulaFile()`: Validate file format

2. **`src/components/FormulaImportModal.jsx`**
   - Modal component untuk Formula Import
   - File selection dan validation
   - Preview data
   - Progress tracking

3. **`templates/formula_template.csv`**
   - Template CSV untuk Formula Import
   - Contoh data dengan format yang benar

4. **`FORMULA_IMPORT_FEATURES.md`**
   - Dokumentasi fitur Formula Import
   - Technical implementation details

5. **`docs/FORMULA_IMPORT_README.md`**
   - Panduan lengkap untuk Formula Import
   - Troubleshooting dan best practices

#### Modified Files:
1. **`src/components/database/MasterProduct.jsx`**
   - Added Formula Import button
   - Added Formula Import modal integration
   - Added import completion handler

2. **`src/components/database/MasterFormulation.jsx`**
   - Added Formula Import button
   - Added Formula Import modal integration
   - Added import completion handler

### Database Schema
Tidak ada perubahan pada database schema. Fitur ini menggunakan tabel yang sudah ada:
- `master_product`: Untuk menyimpan products
- `master_formulation`: Untuk menyimpan formulations
- `master_tolerance_grouping`: Untuk menyimpan tolerance groupings
- `import_logs`: Untuk logging import operations

### API Endpoints
Fitur ini menggunakan utility functions yang sudah ada:
- `importLogger.startImport()`: Start import logging
- `importLogger.updateImportProgress()`: Update progress
- `importLogger.completeImport()`: Complete import logging

## Monitoring dan Logging

### Import History
- Buka **History** > **Import History**
- Lihat semua import yang pernah dilakukan
- Filter berdasarkan type, status, tanggal
- Periksa error details

### Log Information
- Import type: `master_formulation`
- Source type: `file`
- Source name: nama file
- Total records, successful, failed
- Error details
- User dan timestamp

## Future Enhancements

### Planned Features
1. **Batch Import**: Import multiple files sekaligus
2. **Data Mapping**: Custom mapping untuk kolom yang berbeda
3. **Import Templates**: Multiple template untuk format berbeda
4. **Scheduling**: Scheduled import dari external sources
5. **Data Validation Rules**: Custom validation rules

### Integration Opportunities
1. **API Integration**: Import dari external APIs
2. **Real-time Sync**: Sync dengan external systems
3. **Data Transformation**: Advanced data transformation
4. **Workflow Integration**: Integration dengan approval workflows

## Support

### Dokumentasi
- **Setup Guide**: `SETUP_GUIDE.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Import Logging**: `IMPORT_LOGGING_FEATURES.md`
- **Formula Import Features**: `FORMULA_IMPORT_FEATURES.md`
- **Formula Import README**: `docs/FORMULA_IMPORT_README.md`

### Contact
- **Technical Support**: [Contact Information]
- **Documentation**: [Documentation Link]
- **Issues**: [Issue Tracker Link]

## Changelog

### Version 1.0.0
- ✅ Initial release
- ✅ Basic Formula Import functionality
- ✅ File validation
- ✅ Data transformation
- ✅ Import logging
- ✅ History tracking
- ✅ Template download
- ✅ Preview functionality
- ✅ Error handling

## Roadmap

### Planned Features
- [ ] Batch import multiple files
- [ ] Custom data mapping
- [ ] Multiple import templates
- [ ] Scheduled imports
- [ ] Advanced validation rules
- [ ] API integration
- [ ] Real-time sync
- [ ] Workflow integration

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Compatibility**: IoT Scales V2

