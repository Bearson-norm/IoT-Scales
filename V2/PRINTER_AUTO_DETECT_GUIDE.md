# Panduan Auto-Detect Printer dan Fallback

## Masalah
Sistem dikonfigurasi untuk menggunakan **Xprinter XP-420B** sebagai printer default, tetapi jika Anda hanya memiliki printer **Epson** (atau printer lain), sistem akan gagal mencetak label penimbangan.

## Solusi yang Telah Diterapkan

### 1. **Auto-Detect Printer Saat Startup**
Server sekarang secara otomatis mendeteksi printer yang tersedia di komputer Anda saat startup dengan prioritas sebagai berikut:

1. **Xprinter XP-420B** (printer thermal yang direkomendasikan)
2. **Printer thermal lainnya** (Zebra, TSC, Godex, dll)
3. **Printer Epson** (Epson L3210, L3250, EcoTank, dll)
4. **Printer apapun yang tersedia**

### 2. **Fallback Otomatis**
Jika printer yang dikonfigurasi tidak ditemukan, sistem akan otomatis menggunakan printer yang terdeteksi.

## Cara Kerja

### Saat Server Startup
```
🔍 Auto-detecting thermal printers...
✅ Auto-detected printer: EPSON L3210 Series (Port: USB001)
💾 Updated printer config with detected printer: EPSON L3210 Series
   📋 3 total printers available
```

### Saat Mencetak Label
```
🖨️  Sending receipt to XP420 printer...
   Port: Xprinter XP-420B
   ⚠️  Configured printer "Xprinter XP-420B" not found, using detected printer instead
   📌 Fallback to: "EPSON L3210 Series"
   Target printer: "EPSON L3210 Series"
   Printer port: "USB001"
✅ Method 1 SUCCESS: Receipt sent via Windows Print API (RawPrinter)
```

## File Konfigurasi Printer

Sistem menyimpan konfigurasi printer di file: `printer_config.json`

### Contoh Konfigurasi
```json
{
  "enabled": true,
  "type": "usb",
  "port": "EPSON L3210 Series",
  "model": "XP420",
  "paperWidth": 100,
  "paperHeight": 72,
  "format": "ZPL",
  "autoDetect": true,
  "detectedPort": "USB001",
  "detectedName": "EPSON L3210 Series",
  "fallbackPrinters": [
    {
      "name": "EPSON L3210 Series",
      "port": "USB001",
      "driver": "EPSON L3210 Series"
    },
    {
      "name": "Microsoft Print to PDF",
      "port": "PORTPROMPT:",
      "driver": "Microsoft Print To PDF"
    }
  ]
}
```

## Konfigurasi Manual

### Opsi 1: Menggunakan Auto-Detect (Rekomendasi)
File konfigurasi akan otomatis dibuat/diupdate saat startup. Tidak perlu konfigurasi manual.

### Opsi 2: Konfigurasi Manual via `printer_config.json`
Jika Anda ingin mengatur printer tertentu secara manual:

1. Buat file `printer_config.json` di root folder project
2. Isi dengan konfigurasi berikut:

```json
{
  "enabled": true,
  "type": "usb",
  "port": "EPSON L3210 Series",
  "model": "XP420",
  "paperWidth": 100,
  "paperHeight": 72,
  "format": "ZPL",
  "autoDetect": true
}
```

3. Ganti `"port"` dengan nama printer Anda (sesuai nama di Windows)

### Opsi 3: Menggunakan Environment Variable
Set environment variable `PRINTER_PORT`:

**Windows PowerShell:**
```powershell
$env:PRINTER_PORT = "EPSON L3210 Series"
node server.js
```

**Windows Command Prompt:**
```cmd
set PRINTER_PORT=EPSON L3210 Series
node server.js
```

## Cara Melihat Daftar Printer di Windows

### Metode 1: Via PowerShell
```powershell
Get-Printer | Select-Object Name, PortName, DriverName | Format-Table
```

### Metode 2: Via Control Panel
1. Buka **Control Panel** → **Devices and Printers**
2. Lihat nama printer yang tersedia
3. Klik kanan printer → **Printer properties** untuk melihat port

### Metode 3: Via Settings
1. Buka **Windows Settings** (Win + I)
2. Pilih **Bluetooth & devices** → **Printers & scanners**
3. Lihat daftar printer yang tersedia

## Troubleshooting

### Printer Tidak Terdeteksi
1. Pastikan printer sudah terinstall di Windows
2. Pastikan printer dalam kondisi **online** (tidak paused/offline)
3. Restart server untuk menjalankan auto-detect lagi
4. Cek log file untuk melihat detail error

### Label Tidak Tercetak dengan Benar di Epson
Printer Epson (seperti L3210) adalah printer inkjet, bukan thermal printer. Label ZPL mungkin tidak tercetak dengan format yang benar. Solusi:

1. **Format akan otomatis disesuaikan** untuk printer non-thermal
2. Label akan dicetak sebagai teks biasa
3. Untuk hasil terbaik, gunakan printer thermal label yang support ZPL (seperti Xprinter XP-420B)

### Menggunakan Printer Thermal Khusus
Jika Anda membeli printer thermal (XP-420B, Zebra, TSC, dll):
1. Install driver printer
2. Restart server
3. Sistem akan otomatis mendeteksi dan menggunakan printer thermal

## Konfigurasi Lanjutan

### Disable Auto-Detect
Jika Anda ingin menonaktifkan auto-detect dan selalu menggunakan printer yang dikonfigurasi manual:

Edit `printer_config.json`:
```json
{
  "enabled": true,
  "type": "usb",
  "port": "Nama Printer Anda",
  "model": "XP420",
  "paperWidth": 100,
  "paperHeight": 72,
  "format": "ZPL",
  "autoDetect": false
}
```

### Multiple Printer Setup
Jika Anda memiliki beberapa printer dan ingin menggunakan printer tertentu untuk label:

1. Pastikan `autoDetect: true`
2. Sistem akan menggunakan prioritas:
   - Thermal printer (XP-420B, Zebra, dll) → prioritas tertinggi
   - Epson → fallback
   - Printer lainnya → last resort

## Testing

### Test Printing
Gunakan endpoint API untuk test print:
```
POST http://localhost:3001/api/print/send-to-xp420
Content-Type: application/json

{
  "receiptData": "^XA^FO50,50^A0N,50,50^FDTest Print^FS^XZ",
  "port": "EPSON L3210 Series"
}
```

### Check Detected Printers
Endpoint untuk melihat printer yang terdeteksi:
```
GET http://localhost:3001/api/detect-print-method
```

Response:
```json
{
  "success": true,
  "windowsPrinters": [
    {
      "name": "EPSON L3210 Series",
      "driver": "EPSON L3210 Series",
      "port": "USB001",
      "status": "Normal",
      "isThermal": true
    }
  ],
  "recommended": {
    "method": "windows-raw",
    "printerName": "EPSON L3210 Series",
    "labelWidth": 72,
    "labelHeight": 100,
    "labelDPI": 203
  }
}
```

## Catatan Penting

1. **Auto-detect berjalan saat startup** - Jika Anda mengganti/menambah printer, restart server
2. **Fallback otomatis** - Sistem akan selalu mencoba menggunakan printer yang tersedia
3. **Konfigurasi disimpan** - File `printer_config.json` akan otomatis dibuat dan diupdate
4. **Kompatibilitas ZPL** - Printer thermal support ZPL akan menghasilkan label terbaik
5. **Epson sebagai fallback** - Printer Epson bisa digunakan tapi hasilnya bisa berbeda dari thermal printer

## Support

Jika masih ada masalah:
1. Cek log file server untuk detail error
2. Pastikan printer sudah terinstall dengan benar di Windows
3. Test print dari aplikasi lain untuk memastikan printer berfungsi
4. Coba manual configuration jika auto-detect tidak berhasil
