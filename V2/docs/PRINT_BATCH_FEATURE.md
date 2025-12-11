# Fitur Print Batch - Dokumentasi

## Deskripsi
Fitur ini memungkinkan untuk menyimpan sementara format data print hasil penimbangan selama 3 hari dan mencetak semua data sekaligus dengan urutan waktu.

## Setup

### 1. Buat Tabel Database
Jalankan migration script untuk membuat tabel `print_history`:

```batch
scripts\setup-print-history.bat
```

Atau manual dengan SQL:
```sql
-- Jalankan file: database\migration-add-print-history.sql
```

### 2. Verifikasi Tabel
Pastikan tabel sudah dibuat:
```sql
SELECT * FROM print_history LIMIT 1;
```

## Cara Kerja

### 1. Auto-Save Print Data
- Setiap kali print receipt dilakukan, data otomatis disimpan ke `print_history`
- Data disimpan dalam format JSONB (ZPL, layout, dll)
- Data akan otomatis dihapus setelah 3 hari

### 2. Print Batch
- Di halaman History, tombol "Print Batch (X)" akan muncul jika ada data
- Klik tombol untuk mencetak semua label sekaligus
- Data dicetak sesuai urutan waktu penimbangan (chronological order)

## Endpoint API

### GET /api/print-history
Mengambil semua print history yang tersimpan (maksimal 3 hari).

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

### POST /api/print/batch
Mencetak semua print history sekaligus.

**Request Body:**
```json
{
  "printMethod": "windows-raw",
  "printerPort": "Xprinter XP-420B",
  "printerIP": "192.168.1.100",
  "networkPort": 9100,
  "comPort": "COM3",
  "baudRate": 9600,
  "async": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Print batch job queued: 10 receipts",
  "total": 10,
  "status": "processing"
}
```

## Troubleshooting

### Tombol Print Batch Tidak Muncul

1. **Cek Console Browser (F12)**
   - Buka Developer Tools (F12)
   - Lihat tab Console
   - Cari log: `📋 Print history response` atau `❌ Error fetching print history`

2. **Cek Tabel Database**
   ```sql
   SELECT COUNT(*) FROM print_history;
   ```
   - Jika error "table does not exist", jalankan migration script

3. **Cek Endpoint Backend**
   - Buka: `http://localhost:3001/api/print-history`
   - Harus return JSON dengan `success: true`

4. **Cek Log Server**
   - Lihat console server untuk error messages
   - Cari: `📋 Print history query returned X records`

### Error: Table print_history does not exist

**Solusi:**
```batch
scripts\setup-print-history.bat
```

### Error: No print history found

**Kemungkinan:**
- Belum ada data print yang tersimpan
- Data sudah lebih dari 3 hari (auto-deleted)
- Belum pernah melakukan print receipt

**Solusi:**
- Lakukan print receipt terlebih dahulu
- Data akan otomatis tersimpan

### Debug Mode

Di development mode, counter print history akan ditampilkan di halaman History:
```
Print History: 5
```

## Testing

1. **Test Auto-Save:**
   - Lakukan print receipt
   - Cek database: `SELECT * FROM print_history ORDER BY created_at DESC LIMIT 1;`

2. **Test Print Batch:**
   - Pastikan ada beberapa data di `print_history`
   - Buka halaman History
   - Klik tombol "Print Batch (X)"
   - Verifikasi semua label tercetak

## Catatan

- Data print history hanya disimpan selama 3 hari
- Auto-cleanup berjalan setiap kali endpoint `/api/print-history` dipanggil
- Print batch menggunakan async mode untuk tidak memblokir UI
- Delay 500ms antar print untuk menghindari printer overload









