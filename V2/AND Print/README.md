# IoT Scales RS232 Reader

Program Node.js untuk membaca data dari mesin timbangan via RS232 dengan format:
```
ST,-000000.8  g,11:06:00,03/12/2025,36
```

## Fitur

- Membaca data real-time dari timbangan via RS232
- Parse data sesuai format yang ditentukan
- Menampilkan data dalam format yang mudah dibaca
- Dapat dikonfigurasi (COM port, baud rate, dll)
- Error handling yang baik

## Format Data

Format data yang diharapkan:
```
ST,-000000.8  g,11:06:00,03/12/2025,36
```

Keterangan:
- **ST**: Status kode
- **-000000.8  g**: Berat dengan satuan
- **11:06:00**: Waktu (HH:MM:SS)
- **03/12/2025**: Tanggal (DD/MM/YYYY)
- **36**: Nilai tambahan (mungkin suhu atau parameter lain)

## Instalasi

1. Pastikan Node.js sudah terinstall (versi 14 atau lebih baru)

2. Install dependencies:
```bash
npm install
```

## Penggunaan

### Cara 1: Langsung dengan default setting
```bash
npm start
```

Program akan menggunakan default:
- COM Port: `COM3`
- Baud Rate: `9600`

### Cara 2: Dengan environment variable
```bash
# Windows PowerShell
$env:COM_PORT="COM5"; $env:BAUD_RATE="2400"; npm start

# Windows CMD
set COM_PORT=COM5 && set BAUD_RATE=2400 && npm start

# Linux/Mac
COM_PORT=/dev/ttyUSB0 BAUD_RATE=9600 npm start
```

### Cara 3: Edit langsung di file scaleReader.js
Ubah konfigurasi di bagian `SERIAL_CONFIG`:
```javascript
const SERIAL_CONFIG = {
  path: 'COM3',  // Ganti dengan COM port Anda
  baudRate: 9600,  // Ganti dengan baud rate timbangan Anda
  // ...
};
```

## Konfigurasi Serial Port

### Menemukan COM Port

**Windows:**
1. Buka Device Manager
2. Cari di bawah "Ports (COM & LPT)"
3. COM port akan terlihat seperti "USB Serial Port (COM3)"

Atau gunakan PowerShell:
```powershell
Get-PnPDevice -Class Ports
```

**Linux/Mac:**
```bash
ls /dev/tty* | grep -E "(USB|ACM|serial)"
```

### Baud Rate Umum

Baud rate yang umum digunakan untuk timbangan:
- 9600 (default)
- 2400
- 4800
- 19200

Periksa manual timbangan untuk mengetahui baud rate yang digunakan.

## Output Program

Program akan menampilkan data setiap kali menerima data dari timbangan:

```
=== Data Timbangan ===
Status: ST
Berat: -0.8 g
Waktu: 11:06:00
Tanggal: 03/12/2025
Nilai Tambahan: 36
Timestamp: 2025-12-03T04:06:00.000Z
Raw Data: ST,-000000.8  g,11:06:00,03/12/2025,36
======================
```

## Troubleshooting

### Error: Cannot open port
- Pastikan COM port sudah benar
- Pastikan timbangan sudah terhubung
- Pastikan tidak ada program lain yang menggunakan COM port yang sama
- Coba jalankan dengan Administrator

### Tidak ada data yang diterima
- Periksa kabel RS232
- Periksa baud rate sesuai dengan setting timbangan
- Periksa apakah timbangan sudah dikonfigurasi untuk mengirim data secara kontinyu
- Coba restart program

### Format data tidak sesuai atau data terlihat rusak
Jika data yang diterima terlihat seperti `?S?T,+?0?0?0?0?0?0?.?0?  g`:

1. **Aktifkan Debug Mode** untuk melihat raw bytes:
   ```bash
   $env:DEBUG="true"; npm start
   ```

2. **Coba Mode Raw** (jika parser tidak bekerja):
   ```bash
   $env:MODE="raw"; npm start
   ```

3. **Coba berbagai konfigurasi** (DataBits, Parity, dll):
   ```bash
   $env:DATA_BITS="8"; $env:PARITY="even"; npm start
   ```

4. **Lihat panduan lengkap** di [CONFIGURATION.md](CONFIGURATION.md)

**Tips**: Jika Anda sudah berhasil membaca dengan RSCOM, gunakan setting yang sama di program ini.

### Mode Debug dan Raw

Program memiliki dua mode:

- **Mode Parser (default)**: Menggunakan ReadlineParser untuk membaca per baris
- **Mode Raw**: Membaca data langsung tanpa parser (berguna jika parser tidak bekerja)

Aktifkan mode raw:
```bash
$env:MODE="raw"; npm start
```

Aktifkan debug untuk melihat raw bytes:
```bash
$env:DEBUG="true"; npm start
```

### Konfigurasi Lanjutan

Lihat [CONFIGURATION.md](CONFIGURATION.md) untuk:
- Cara mengubah DataBits (7 atau 8)
- Cara mengubah Parity (none, even, odd)
- Cara mengubah delimiter
- Kombinasi konfigurasi yang bisa dicoba

## Pengembangan

Untuk menambahkan fitur seperti:
- Menyimpan data ke database
- Mengirim data ke API
- Menulis ke file CSV/JSON
- Email notification

Edit bagian di dalam event handler `parser.on('data', ...)` di file `scaleReader.js`.

## Lisensi

MIT

