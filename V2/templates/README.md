# Templates

Folder ini berisi template file untuk berbagai fitur import di IoT Scales V2.

## File Template

### 1. formula_template.csv
Template untuk Formula Import dengan format "Formula to Input".

**Format:**
```csv
formulationCode,formulationName,productCode,productName,targetMass,totalMass,uom,totalIngredient,status,mustFollowOrder,min,max,toleranceGroupingName,toleranceType,maxAllowedWeighingQty,implementToleranceGrouping,instruction
```

**Contoh Data:**
```csv
MIXING - FROOZY BANANA BLISS,MIXING - FROOZY BANANA BLISS,RMLIQ00255,YOGHURT N7S8006,40,1000,g,11,active,FALSE,0,0,timbanganKecil,mass,5000,TRUE,-
```

## Cara Menggunakan Template

### 1. Download Template
- Buka halaman **Master Product** atau **Master Formulation**
- Klik tombol **"Formula Import"**
- Klik **"Download Template"**
- Simpan file template

### 2. Isi Data
- Buka file template dengan Excel atau text editor
- Isi data sesuai dengan format yang ditentukan
- Pastikan semua kolom yang diperlukan diisi
- Simpan file sebagai CSV

### 3. Import Data
- Kembali ke halaman Formula Import
- Pilih file yang sudah diisi
- Klik **"Import"** untuk memulai proses

## Format Kolom

### Kolom Wajib
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

## Tips dan Best Practices

### 1. Data Quality
- Pastikan productCode unik
- Pastikan formulationCode konsisten
- Periksa data numerik (targetMass, totalMass)
- Pastikan status adalah "active" atau "inactive"

### 2. Format Data
- Gunakan koma sebagai separator
- Hindari karakter khusus dalam data
- Pastikan encoding UTF-8
- Periksa format tanggal jika ada

### 3. Validasi
- Test dengan data kecil terlebih dahulu
- Periksa preview sebelum import
- Backup database sebelum import besar
- Monitor import logs

## Troubleshooting

### Error: File Format Tidak Valid
- Pastikan file adalah CSV
- Periksa separator koma
- Pastikan encoding UTF-8
- Download template baru

### Error: Data Tidak Valid
- Periksa kolom yang diperlukan
- Pastikan data tidak kosong
- Periksa format data numerik
- Periksa format boolean (TRUE/FALSE)

### Error: Import Gagal
- Periksa koneksi database
- Periksa permission user
- Periksa log error
- Coba dengan data kecil

## Support

### Dokumentasi
- **Formula Import Features**: `../FORMULA_IMPORT_FEATURES.md`
- **Formula Import README**: `../docs/FORMULA_IMPORT_README.md`
- **Setup Guide**: `../SETUP_GUIDE.md`
- **Troubleshooting**: `../TROUBLESHOOTING.md`

### Contact
- **Technical Support**: [Contact Information]
- **Documentation**: [Documentation Link]
- **Issues**: [Issue Tracker Link]

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Compatibility**: IoT Scales V2

