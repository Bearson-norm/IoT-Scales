# Quick Prompt: Prinsip Program Thermal Label Printer ZPL

## Inti Program
Program ini **generate dan kirim ZPL command strings** ke printer thermal. Printer membaca ZPL commands dan langsung mencetak label.

## Prinsip Utama

### 1. ZPL = Bahasa Command Printer
- Printer thermal ZPL adalah **interpreter** yang membaca string commands
- Bukan gambar/file, tapi **text string berisi instruksi ZPL**
- Format: `^XA` (start) → commands → `^XZ` (end)

### 2. Konversi: mm → dots (pixels)
```
dotsPerMM = DPI / 25.4
widthInDots = labelWidth (mm) × dotsPerMM
```
Printer menggunakan koordinat dots, bukan millimeter.

### 3. Tiga Metode Kirim ZPL

**A. Windows Printer Queue (RAW)**
- Win32 API: `OpenPrinter()` → `WritePrinter()` dengan `pDataType = "RAW"`
- Data RAW = tidak diformat, langsung ke printer
- Via PowerShell script dengan C# embedded

**B. Network TCP/IP (Port 9100)**
- TCP socket connection ke `printerIP:9100`
- Kirim ZPL string sebagai UTF-8 text
- Langsung ke printer tanpa driver

**C. COM Port Serial (USB)**
- Serial Port (contoh: COM3)
- Baud rate 9600
- Kirim ZPL sebagai serial data

### 4. Flow Proses
```
Data Object → generateZPL() → ZPL String → printZPL() → 
Kirim via Windows/Network/COM → Printer Parser → Print Label
```

## Yang Penting

✅ **ZPL Commands**: String text berisi instruksi
✅ **RAW Data**: Data dikirim mentah, tidak diformat
✅ **Direct Communication**: Langsung ke printer
✅ **Coordinate Conversion**: mm → dots berdasarkan DPI

❌ **Tidak digunakan**: Image files, PDF, formatted text, GDI printing

## Prompt untuk AI

"Buat program Node.js untuk print label thermal ZPL yang:
1. Generate ZPL command strings dari data (text, barcode, QR)
2. Konversi mm → dots berdasarkan DPI
3. Support 3 metode: Windows RAW, Network TCP/IP 9100, COM Serial
4. Label 100x72mm, DPI 203
5. Support: text, barcode Code 128, QR code, box

**Prinsip**: ZPL adalah bahasa command, kirim sebagai RAW data, posisi dalam dots."

