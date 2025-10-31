# 🗄️ Database Import Feature

## Overview
Fitur Database Import memungkinkan pengguna untuk mengimpor data database dari file CSV dengan fitur komparasi dan logging yang lengkap.

## Features

### 1. 📤 Upload CSV File
- Drag & drop atau klik untuk memilih file CSV
- Validasi format file (hanya CSV yang diterima)
- Progress bar saat upload
- Informasi file (nama, ukuran, tipe)

### 2. 🔍 Data Comparison
- **Modal komparasi** menampilkan perubahan data:
  - Total records yang diimpor
  - Produk baru yang ditambahkan
  - Produk yang diupdate
  - Formulasi baru
  - Ingredients baru
- **Detailed changes** dengan old vs new values
- **Color-coded badges** untuk jenis perubahan:
  - 🟢 New (hijau)
  - 🔵 Updated (biru)
  - 🔴 Deleted (merah)

### 3. 📋 Import Logging
- **Timestamp** kapan import dilakukan
- **Filename** yang diimpor
- **Status** import (completed, failed, in_progress)
- **Statistics**:
  - Total records
  - Successful records
  - Failed records
- **Error details** jika import gagal
- **History** hingga 50 import terakhir

### 4. 🔄 Real-time Progress
- Progress bar dengan persentase
- Status update real-time
- Error handling dengan rollback

## API Endpoints

### POST `/api/import-database`
Mengimpor data dari CSV file.

**Request:**
- `Content-Type: multipart/form-data`
- `file`: CSV file

**Response:**
```json
{
  "success": true,
  "message": "Database imported successfully",
  "comparison": {
    "total_records": 1806,
    "new_products": 15,
    "updated_products": 3,
    "new_formulations": 2,
    "new_ingredients": 1200,
    "changes": [...]
  },
  "filename": "formula_data.csv"
}
```

### GET `/api/import-logs`
Mengambil history import logs.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "import_type": "master_formulation",
      "source_name": "formula_data.csv",
      "total_records": 1806,
      "successful_records": 1800,
      "failed_records": 6,
      "status": "completed",
      "started_at": "2025-01-06T10:30:00Z",
      "completed_at": "2025-01-06T10:32:00Z"
    }
  ],
  "count": 1
}
```

## CSV Format

File CSV harus memiliki kolom berikut:
```csv
formulationCode,formulationName,productCode,productName,targetMass,totalMass,uom,totalIngredient,status,mustFollowOrder,min,max,toleranceGroupingName,toleranceType,maxAllowedWeighingQty,implementToleranceGrouping,instruction
```

## Database Changes

### Tables Affected:
1. **master_product** - Products/Ingredients
2. **master_formulation** - Formulations
3. **master_formulation_ingredients** - Formulation-Ingredient relationships
4. **import_logs** - Import history

### Import Process:
1. **Transaction-based** - All or nothing
2. **Duplicate handling** - Update existing, insert new
3. **Constraint validation** - Foreign key checks
4. **Error logging** - Detailed error tracking

## Usage

### 1. Access Database Import
- Klik menu **Database Import** di sidebar
- Atau navigasi ke `/database-import`

### 2. Upload File
- Klik area upload atau drag & drop file CSV
- File akan divalidasi sebelum upload
- Klik **Import Database** untuk memulai

### 3. Review Changes
- Modal komparasi akan muncul setelah import selesai
- Review semua perubahan yang dilakukan
- Klik **Close** untuk menutup modal

### 4. Check History
- Scroll ke bawah untuk melihat **Import History**
- Klik pada log untuk melihat detail
- Monitor status dan error jika ada

## Error Handling

### Common Errors:
1. **Invalid CSV format** - File bukan CSV atau struktur salah
2. **Missing columns** - Kolom required tidak ada
3. **Data validation** - Data tidak sesuai constraint
4. **Database connection** - Koneksi database gagal

### Error Recovery:
- **Automatic rollback** jika terjadi error
- **Detailed error logging** untuk debugging
- **File cleanup** otomatis setelah error

## Security

### File Upload Security:
- **File type validation** - Hanya CSV yang diterima
- **File size limit** - Maksimal ukuran file
- **Temporary storage** - File dihapus setelah proses
- **Path traversal protection** - Tidak bisa akses file sistem

### Database Security:
- **Transaction isolation** - Import tidak mempengaruhi data lain
- **Constraint validation** - Data integrity terjaga
- **Error sanitization** - Error message tidak expose sensitive info

## Performance

### Optimization:
- **Batch processing** - Import dalam batch untuk performa
- **Index usage** - Menggunakan index database
- **Memory management** - Streaming untuk file besar
- **Progress tracking** - Real-time progress update

### Scalability:
- **Async processing** - Non-blocking import
- **Resource cleanup** - Memory dan file cleanup
- **Error recovery** - Graceful error handling

## Monitoring

### Logs Available:
- **Import logs** - Database table `import_logs`
- **Server logs** - Console output
- **Error logs** - Detailed error information

### Metrics Tracked:
- **Import frequency** - Berapa sering import dilakukan
- **Success rate** - Persentase import berhasil
- **Processing time** - Waktu yang dibutuhkan
- **Data volume** - Jumlah data yang diimpor

---

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install multer csv-parser
   ```

2. **Create uploads directory:**
   ```bash
   mkdir uploads
   ```

3. **Start server:**
   ```bash
   npm run start-server
   ```

4. **Access Database Import:**
   - Navigate to Database Import page
   - Upload your CSV file
   - Review changes and confirm

---

**Note:** Pastikan database PostgreSQL sudah running dan tabel sudah dibuat sesuai schema.



