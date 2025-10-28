# Formula Import - Panduan Lengkap

## Pengenalan
Formula Import adalah fitur baru di IoT Scales V2 yang memungkinkan pengguna untuk mengimpor data formulation dan product dari file Excel/CSV dengan format "Formula to Input" yang spesifik.

## Fitur Utama

### 1. Import File Formula to Input
- ✅ Support file CSV, XLSX, XLS
- ✅ Validasi format otomatis
- ✅ Preview data sebelum import
- ✅ Template download
- ✅ Progress tracking
- ✅ Error handling

### 2. Data Transformation
- ✅ Extract unique products
- ✅ Group formulations by code
- ✅ Map ingredients to formulations
- ✅ Create tolerance groupings

### 3. Integration
- ✅ Master Product page
- ✅ Master Formulation page
- ✅ Import logging
- ✅ History tracking

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

## Format File yang Didukung

### Template CSV
```csv
formulationCode,formulationName,productCode,productName,targetMass,totalMass,uom,totalIngredient,status,mustFollowOrder,min,max,toleranceGroupingName,toleranceType,maxAllowedWeighingQty,implementToleranceGrouping,instruction
MIXING - FROOZY BANANA BLISS,MIXING - FROOZY BANANA BLISS,RMLIQ00255,YOGHURT N7S8006,40,1000,g,11,active,FALSE,0,0,timbanganKecil,mass,5000,TRUE,-
```

### Kolom yang Diperlukan
- `formulationCode`: Kode formulasi
- `formulationName`: Nama formulasi
- `productCode`: Kode produk
- `productName`: Nama produk
- `targetMass`: Massa target
- `totalMass`: Total massa
- `uom`: Unit of measure
- `status`: Status (active/inactive)

## Data yang Diimpor

### Products
- Product Code
- Product Name
- Category: "Imported"
- Unit: dari kolom `uom`
- Status: "active"

### Formulations
- Formulation Code
- Formulation Name
- Total Mass
- UOM
- Status
- Ingredients (dari products)

### Tolerance Groupings
- Name: dari `toleranceGroupingName`
- Type: dari `toleranceType`
- Status: "active"

## Troubleshooting

### Error: File Format Tidak Valid
**Solusi:**
1. Pastikan file adalah CSV dengan encoding UTF-8
2. Periksa separator koma
3. Download template untuk referensi
4. Pastikan semua kolom yang diperlukan ada

### Error: Data Tidak Valid
**Solusi:**
1. Periksa data numerik (targetMass, totalMass)
2. Pastikan productCode unik
3. Pastikan formulationCode konsisten
4. Periksa data tidak kosong

### Error: Import Gagal
**Solusi:**
1. Periksa koneksi database
2. Periksa log error di History > Import History
3. Pastikan user memiliki permission
4. Coba dengan data kecil terlebih dahulu

## Best Practices

### 1. Persiapan File
- Gunakan template yang disediakan
- Validasi data sebelum import
- Pastikan format konsisten
- Test dengan data kecil terlebih dahulu

### 2. Proses Import
- Backup database sebelum import besar
- Monitor import logs
- Periksa hasil import
- Verifikasi data yang diimpor

### 3. Maintenance
- Regular cleanup import logs
- Monitor database size
- Update template jika diperlukan
- Training user untuk format yang benar

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

## Support dan Bantuan

### Dokumentasi
- **Setup Guide**: `SETUP_GUIDE.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Formula Import Features**: `FORMULA_IMPORT_FEATURES.md`

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

