# Quick Start Guide - Windows

## Langkah Cepat untuk Print via Windows Printer

### 1. Install Dependencies

```bash
npm install
```

### 2. Cari Nama Printer Anda

Jalankan script untuk melihat semua printer yang tersedia:

```bash
node list-printers.js
```

Output contoh:
```
🔍 Mencari printer Windows yang tersedia...

✅ Ditemukan 2 printer:

   1. Microsoft Print to PDF
   2. Thermal Printer ZPL
```

### 3. Edit Konfigurasi

Edit file `example.js`, ubah bagian konfigurasi:

```javascript
const printer = new ThermalLabelPrinter({
  printerName: 'Thermal Printer ZPL', // Ganti dengan nama printer Anda
  printMethod: 'windows',
  dpi: 203
});
```

### 4. Test Print

Edit file `example.js`, uncomment baris `contohPenggunaan()` di bagian bawah, lalu:

```bash
node example.js
```

### 5. Preview ZPL (Tanpa Print)

Jika ingin preview ZPL tanpa print:

```bash
node example.js --preview
```

File `preview-label.zpl` akan dibuat.

---

## Troubleshooting

### Error: "Nama printer Windows tidak dikonfigurasi"

**Solusi:** Pastikan `printerName` sudah di-set di config dan nama printer benar.

### Error: "Printer tidak ditemukan"

**Solusi:** 
1. Jalankan `node list-printers.js` untuk melihat nama printer yang benar
2. Pastikan nama printer sama persis (huruf besar/kecil harus sama)
3. Cek printer sudah terinstall di Windows Settings > Devices > Printers

### Print tidak muncul

**Solusi:**
1. Cek printer sudah ON dan terhubung
2. Cek kertas label sudah terpasang
3. Cek ukuran label di printer sesuai (100x72mm)
4. Coba print test page dari Windows Settings

---

## Alternatif: Print via COM Port (USB)

Jika printer terhubung via USB:

1. Cek COM port di Device Manager:
   - Win + X > Device Manager
   - Cari di "Ports (COM & LPT)"
   - Lihat port USB Serial (misalnya COM3)

2. Install serialport (optional):
   ```bash
   npm install serialport
   ```

3. Edit config:
   ```javascript
   const printer = new ThermalLabelPrinter({
     comPort: 'COM3', // Ganti dengan COM port printer Anda
     printMethod: 'com',
     dpi: 203
   });
   ```

---

## Contoh Penggunaan

```javascript
const ThermalLabelPrinter = require('./index.js');

const printer = new ThermalLabelPrinter({
  printerName: 'Nama Printer Anda',
  printMethod: 'windows',
  dpi: 203
});

// Print label sederhana
printer.printLabel({
  text: 'PRODUK ABC',
  fontSize: 35,
  x: 10,
  y: 10
}).catch(console.error);

// Print dengan barcode
printer.printLabel({
  text: 'SKU: ABC123',
  barcode: '1234567890123',
  fontSize: 25,
  x: 10,
  y: 10
}).catch(console.error);
```


