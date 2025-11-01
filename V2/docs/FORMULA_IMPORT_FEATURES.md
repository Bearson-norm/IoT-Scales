# Formula Import Features

## Overview
Fitur Formula Import memungkinkan pengguna untuk mengimpor data formulation dan product dari file Excel/CSV dengan format "Formula to Input" yang spesifik. Fitur ini terintegrasi dengan sistem logging dan dapat mengimpor data ke database dengan validasi yang ketat.

## Features

### 1. Formula Import Modal
- **File Selection**: Mendukung file CSV, XLSX, dan XLS
- **Template Download**: Menyediakan template CSV untuk referensi format
- **Validation**: Validasi otomatis format file sebelum import
- **Preview**: Tampilan preview data sebelum import
- **Progress Tracking**: Indikator progress selama proses import

### 2. Format File yang Didukung
File harus memiliki kolom berikut:
```
formulationCode,formulationName,productCode,productName,targetMass,totalMass,uom,totalIngredient,status,mustFollowOrder,min,max,toleranceGroupingName,toleranceType,maxAllowedWeighingQty,implementToleranceGrouping,instruction
```

### 3. Data Transformation
- **Products**: Ekstrak unique products dari file
- **Formulations**: Group data berdasarkan formulationCode
- **Tolerance Groupings**: Ekstrak unique tolerance groupings
- **Ingredients**: Map products ke formulations sebagai ingredients

### 4. Integration Points
- **Master Product**: Tombol "Formula Import" di halaman Master Product
- **Master Formulation**: Tombol "Formula Import" di halaman Master Formulation
- **Import Logging**: Semua import dicatat di import_logs table
- **History**: Import history dapat dilihat di History > Import History

## Technical Implementation

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

#### Modified Files:
1. **`src/components/database/MasterProduct.jsx`**
   - Added Formula Import button
   - Added Formula Import modal integration
   - Added import completion handler

2. **`src/components/database/MasterFormulation.jsx`**
   - Added Formula Import button
   - Added Formula Import modal integration
   - Added import completion handler

## Usage

### 1. Access Formula Import
- Buka halaman **Master Product** atau **Master Formulation**
- Klik tombol **"Formula Import"** (ikon FileText)

### 2. Import Process
1. **Select File**: Pilih file CSV/Excel dengan format Formula to Input
2. **Validation**: Sistem akan otomatis validasi format file
3. **Preview**: Klik "Show Preview" untuk melihat data yang akan diimpor
4. **Import**: Klik "Import" untuk memulai proses import
5. **Result**: Lihat hasil import dan error (jika ada)

### 3. Template Download
- Klik "Download Template" untuk mendapatkan template CSV
- Template berisi contoh data dengan format yang benar

## Data Mapping

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

## Error Handling

### Validation Errors
- **Missing Columns**: File tidak memiliki kolom yang diperlukan
- **Empty File**: File kosong atau tidak valid
- **Format Error**: Format data tidak sesuai

### Import Errors
- **Database Connection**: Gagal koneksi ke database
- **Data Validation**: Data tidak valid untuk database
- **Duplicate Data**: Data duplikat yang sudah ada

## Logging

### Import Logs
Semua import dicatat di `import_logs` table dengan informasi:
- Import type: `master_formulation`
- Source type: `file`
- Source name: nama file
- Total records, successful, failed
- Error details
- User yang melakukan import
- Timestamp

### History View
- Buka **History** > **Import History**
- Lihat semua import yang pernah dilakukan
- Filter berdasarkan type, status, tanggal

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

### Documentation
- **Setup Guide**: `SETUP_GUIDE.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Import Logging**: `IMPORT_LOGGING_FEATURES.md`

### Contact
- **Technical Support**: [Contact Information]
- **Documentation**: [Documentation Link]
- **Issues**: [Issue Tracker Link]

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Compatibility**: IoT Scales V2

