# Thermal Label Printer - ZPL (100x72mm)

Program Node.js untuk mencetak stiker label thermal menggunakan command ZPL dengan ukuran kertas **100mm x 72mm**.

## Fitur

- ✅ Mencetak label thermal dengan ZPL commands
- ✅ Ukuran label: 100mm x 72mm (konfigurasi default)
- ✅ Support untuk Text, Barcode (Code 128), dan QR Code
- ✅ Template custom untuk berbagai jenis label
- ✅ **Print via Windows Printer Queue** (printer name)
- ✅ Print via network (TCP/IP) ke printer ZPL
- ✅ Print via COM port (USB Serial)
- ✅ Auto-detect metode print yang tersedia
- ✅ List printer Windows yang tersedia
- ✅ Generate ZPL untuk preview/testing tanpa print

## Instalasi

1. Install dependencies:
```bash
npm install
```

## Konfigurasi

Ada 3 cara untuk print ke printer:

### Opsi 1: Print via Windows Printer Queue (Disarankan untuk Windows)

1. **List printer yang tersedia:**
```bash
node list-printers.js
# atau
node example.js --list
```

2. **Konfigurasi dengan nama printer:**
```javascript
const printer = new ThermalLabelPrinter({
  printerName: 'Nama Printer Anda', // Nama dari list di atas
  printMethod: 'windows',
  dpi: 203
});
```

### Opsi 2: Print via Network (TCP/IP)

```javascript
const printer = new ThermalLabelPrinter({
  printerIP: '192.168.1.100', // IP address printer
  printerPort: 9100,
  printMethod: 'network',
  dpi: 203
});
```

**Pastikan:**
- Printer terhubung ke jaringan yang sama
- Port 9100 terbuka
- IP address printer sudah diketahui

### Opsi 3: Print via COM Port (USB)

```javascript
const printer = new ThermalLabelPrinter({
  comPort: 'COM3', // COM port printer (cek di Device Manager)
  printMethod: 'com',
  dpi: 203
});
```

**Cara cek COM port:**
- Buka Device Manager (Win + X)
- Cari di "Ports (COM & LPT)"
- Lihat port USB Serial (misalnya COM3)

### Auto-detect Method

Gunakan `printMethod: 'auto'` untuk auto-detect metode yang tersedia:

```javascript
const printer = new ThermalLabelPrinter({
  printerName: 'Nama Printer', // Akan dicoba pertama
  printerIP: '192.168.1.100',  // Akan dicoba kedua
  comPort: 'COM3',              // Akan dicoba ketiga
  printMethod: 'auto',
  dpi: 203
});
```

## Penggunaan

### Contoh 1: Print Label Sederhana

```javascript
const ThermalLabelPrinter = require('./index.js');

const printer = new ThermalLabelPrinter({
  printerIP: '192.168.1.100',
  printerPort: 9100,
  dpi: 203
});

// Print label dengan text
printer.printLabel({
  text: 'PRODUK ABC',
  fontSize: 35,
  x: 10,
  y: 10
}).catch(console.error);
```

### Contoh 2: Print Label dengan Barcode

```javascript
printer.printLabel({
  text: 'SKU: ABC123',
  barcode: '1234567890123',
  fontSize: 25,
  x: 10,
  y: 10
}).catch(console.error);
```

### Contoh 3: Print Label dengan QR Code

```javascript
printer.printLabel({
  text: 'Scan untuk info',
  qrCode: 'https://example.com/product/123',
  fontSize: 25,
  x: 10,
  y: 10
}).catch(console.error);
```

### Contoh 4: Print Label Lengkap (Text + Barcode + QR)

```javascript
printer.printLabel({
  text: 'PRODUK XYZ',
  barcode: '9876543210987',
  qrCode: 'https://example.com/product/xyz',
  fontSize: 30,
  x: 10,
  y: 10
}).catch(console.error);
```

### Contoh 5: Print dengan Template Custom

```javascript
printer.printCustomLabel({
  elements: [
    {
      type: 'text',
      content: 'TOKO ABC',
      x: 10,
      y: 5,
      fontSize: 28
    },
    {
      type: 'barcode',
      content: '1234567890',
      x: 10,
      y: 35,
      height: 25
    },
    {
      type: 'qrcode',
      content: 'https://tokabc.com/product/123',
      x: 60,
      y: 35,
      size: 6
    }
  ]
}).catch(console.error);
```

## Menjalankan Contoh

### List Printer Windows

Lihat semua printer yang tersedia di Windows:

```bash
node list-printers.js
# atau
node example.js --list
```

### Preview ZPL (tanpa print)

Generate ZPL command dan simpan ke file untuk preview:

```bash
node example.js --preview
# atau
node example.js -p
```

File `preview-label.zpl` akan dibuat, yang bisa dibuka dengan ZPL viewer atau dikirim manual ke printer.

### Print ke Printer

1. Edit file `example.js`, set konfigurasi printer sesuai kebutuhan
2. Uncomment bagian `contohPenggunaan()` di bagian bawah file
3. Jalankan:

```bash
node example.js
```

## Parameter Label

### Print Label Sederhana

| Parameter | Type | Deskripsi | Default |
|-----------|------|-----------|---------|
| `text` | String | Teks yang akan dicetak | - |
| `barcode` | String | Barcode (Code 128) | - |
| `qrCode` | String | QR Code content | - |
| `fontSize` | Number | Ukuran font (dalam points) | 30 |
| `x` | Number | Posisi X dalam mm | 10 |
| `y` | Number | Posisi Y dalam mm | 10 |

### Template Custom Elements

| Type | Parameter | Deskripsi |
|------|-----------|-----------|
| `text` | `content`, `x`, `y`, `fontSize` | Elemen text |
| `barcode` | `content`, `x`, `y`, `height` | Barcode Code 128 |
| `qrcode` | `content`, `x`, `y`, `size` | QR Code |
| `box` | `x`, `y`, `width`, `height`, `thickness` | Kotak/border |

## Ukuran Label

Default: **100mm x 72mm**

- Width: 100mm
- Height: 72mm
- DPI: 203 atau 300 (sesuai printer)

Ukuran dapat diubah di constructor:

```javascript
const printer = new ThermalLabelPrinter({
  labelWidth: 100,
  labelHeight: 72,
  dpi: 203
});
```

## ZPL Commands

Program ini menggunakan ZPL (Zebra Programming Language) commands:

- `^XA` - Start of label
- `^XZ` - End of label
- `^LL` - Label length
- `^PW` - Print width
- `^FO` - Field origin (position)
- `^FD` - Field data (content)
- `^FS` - Field separator
- `^BC` - Barcode Code 128
- `^BQ` - QR Code

## Troubleshooting

### Printer tidak ditemukan (Windows)

1. **List printer yang tersedia:**
   ```bash
   node list-printers.js
   ```

2. **Pastikan nama printer benar:**
   - Nama harus sama persis dengan yang muncul di list
   - Case sensitive (huruf besar/kecil harus sama)

3. **Cek printer sudah terinstall:**
   - Buka Settings > Devices > Printers & scanners
   - Pastikan printer muncul di list

### Printer tidak terhubung (Network)

1. Cek IP address printer sudah benar
2. Ping IP printer dari command prompt:
   ```bash
   ping 192.168.1.100
   ```
3. Cek port 9100 terbuka:
   ```bash
   telnet 192.168.1.100 9100
   ```

### Error "COM port tidak ditemukan"

1. Cek COM port di Device Manager
2. Pastikan printer terhubung via USB
3. Coba port COM lain jika ada
4. Pastikan tidak ada aplikasi lain yang menggunakan port tersebut

### Label tidak muncul

1. Pastikan ukuran label (100x72mm) sesuai dengan kertas di printer
2. Cek DPI setting (203 atau 300) sesuai printer
3. Cek ZPL command dengan preview mode

### Format label tidak sesuai

1. Sesuaikan posisi X dan Y dalam mm
2. Ukuran font mungkin perlu disesuaikan
3. Gunakan preview mode untuk test sebelum print

## Dependencies

- `net` - Node.js built-in module untuk TCP/IP communication
- `serialport` (optional) - Untuk print via COM port (USB)
  - Hanya perlu diinstall jika menggunakan print via COM port
  - Install: `npm install serialport`

## License

MIT

## Kontribusi

Silakan buat issue atau pull request untuk improvement.

