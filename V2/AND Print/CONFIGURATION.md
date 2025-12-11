# Panduan Konfigurasi RS232

Jika data yang diterima terlihat rusak atau tidak sesuai format, coba berbagai konfigurasi berikut:

## Masalah Umum

### Data Terlihat Rusak (Contoh: `?S?T,+?0?0?0?0?0?0?.?0?  g`)

Ini biasanya disebabkan oleh:
1. **DataBits salah** - Coba ubah antara 7 dan 8
2. **Parity salah** - Coba none, even, atau odd
3. **Baud Rate salah** - Periksa manual timbangan
4. **Delimiter salah** - Data mungkin menggunakan \n atau \r saja

## Konfigurasi yang Bisa Dicoba

### 1. DataBits: 7 atau 8
```bash
# Windows PowerShell
$env:DATA_BITS="7"; npm start
$env:DATA_BITS="8"; npm start
```

### 2. Parity: none, even, odd
```bash
# Windows PowerShell
$env:PARITY="none"; npm start
$env:PARITY="even"; npm start
$env:PARITY="odd"; npm start
```

### 3. Mode: parser atau raw
```bash
# Mode Parser (default - menggunakan ReadlineParser)
$env:MODE="parser"; npm start

# Mode Raw (membaca langsung tanpa parser - coba jika parser tidak bekerja)
$env:MODE="raw"; npm start
```

### 4. Delimiter
```bash
# Windows PowerShell (harus escape khusus)
$env:DELIMITER="`r`n"; npm start  # \r\n
$env:DELIMITER="`n"; npm start     # \n saja
$env:DELIMITER="`r"; npm start     # \r saja
```

### 5. Debug Mode
Aktifkan debug untuk melihat raw bytes:
```bash
$env:DEBUG="true"; npm start
```

### 6. Kombinasi Lengkap
```bash
# Contoh kombinasi
$env:COM_PORT="COM5"; $env:BAUD_RATE="2400"; $env:DATA_BITS="7"; $env:PARITY="none"; $env:MODE="raw"; $env:DEBUG="true"; npm start
```

## Konfigurasi Umum Timbangan AND

Berdasarkan manual timbangan AND, konfigurasi umum adalah:

### Model GX / EW Series
- **Baud Rate**: 2400 atau 9600
- **Data Bits**: 7
- **Stop Bits**: 1
- **Parity**: Even atau None
- **Delimiter**: \r\n atau \n

### Cara Mengetahui Konfigurasi yang Benar

1. **Aktifkan Debug Mode**:
   ```bash
   $env:DEBUG="true"; npm start
   ```

2. **Perhatikan Raw Bytes (Hex)**:
   - Jika melihat pola yang konsisten, berarti konfigurasi mendekati benar
   - Jika banyak karakter aneh (?), coba ubah DataBits atau Parity

3. **Coba Mode Raw**:
   ```bash
   $env:MODE="raw"; $env:DEBUG="true"; npm start
   ```

4. **Cari pola karakter yang valid**:
   - Format: `ST,-000000.8  g,11:06:00,03/12/2025,36`
   - Jika muncul pola seperti ini meskipun ada karakter aneh, berarti hampir benar

## Contoh Script Testing

Buat file `test-config.ps1` (PowerShell):
```powershell
# Test berbagai konfigurasi
$comPort = "COM5"

Write-Host "Testing Configuration 1: 7N1"
$env:COM_PORT=$comPort
$env:BAUD_RATE="2400"
$env:DATA_BITS="7"
$env:PARITY="none"
$env:MODE="raw"
$env:DEBUG="true"
npm start
# Tunggu beberapa detik, lalu Ctrl+C

Write-Host "Testing Configuration 2: 7E1"
$env:COM_PORT=$comPort
$env:BAUD_RATE="2400"
$env:DATA_BITS="7"
$env:PARITY="even"
$env:MODE="raw"
$env:DEBUG="true"
npm start
```

## Tips dari RSCOM

Jika Anda sudah berhasil membaca dengan RSCOM, catat:
1. **COM Port** yang digunakan
2. **Baud Rate** yang digunakan
3. **Data Bits** (biasanya 7 atau 8)
4. **Parity** (None, Even, atau Odd)
5. **Stop Bits** (biasanya 1)

Kemudian gunakan setting yang sama di program ini.

## Format Data yang Diharapkan

Format lengkap: `ST,-000000.8  g,11:06:00,03/12/2025,36`

- **ST**: Status
- **-000000.8  g**: Berat (dengan unit)
- **11:06:00**: Waktu
- **03/12/2025**: Tanggal
- **36**: Nilai tambahan

Jika format berbeda, sesuaikan fungsi `parseScaleData()` di `scaleReader.js`.

