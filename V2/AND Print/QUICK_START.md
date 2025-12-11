# Quick Start Guide

## Program Sudah Berhasil! ✅

Program sudah bisa membaca data dari timbangan dengan benar.

## Menjalankan Program

### Tanpa Debug Mode (Output Bersih)
```powershell
npm start
```

### Dengan COM Port Tertentu
```powershell
$env:COM_PORT="COM5"; npm start
```

### Dengan Debug Mode (Untuk Troubleshooting)
```powershell
$env:DEBUG="true"; npm start
```

## Output Normal

Tanpa debug mode, output akan seperti ini:
```
=== Data Timbangan ===
Status: ST
Berat: 200.2 g
Timestamp: 2025-12-03T04:25:43.530Z
Raw Data: ST,+000200.2  g
======================
```

## Konfigurasi Saat Ini

Program menggunakan konfigurasi berikut (sudah benar):
- **Baud Rate**: 2400
- **Data Bits**: 7
- **Parity**: Even
- **Stop Bits**: 1
- **Delimiter**: CR/LF (\r\n)
- **Mode**: Raw (langsung membaca tanpa parser)

## Format Data

Program mendukung 2 format:

1. **Format Sederhana** (yang Anda gunakan):
   ```
   ST,+000200.2  g
   ```

2. **Format Lengkap** (jika timbangan mengirim waktu/tanggal):
   ```
   ST,-000000.8  g,11:06:00,03/12/2025,36
   ```

## Selanjutnya

Sekarang Anda bisa:
1. Menonaktifkan debug mode untuk output yang lebih bersih
2. Menambahkan fitur untuk menyimpan data ke file/database
3. Mengirim data ke API atau sistem lain
4. Menambahkan notifikasi atau alert

Lihat file `example-save-to-file.js` untuk contoh menyimpan data ke CSV.

