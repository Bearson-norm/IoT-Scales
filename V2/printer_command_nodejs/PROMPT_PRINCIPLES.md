# Prompt: Prinsip Kerja Program Thermal Label Printer dengan ZPL

## Deskripsi Program
Program Node.js untuk mencetak label thermal menggunakan ZPL (Zebra Programming Language) commands pada printer dengan ukuran label 100mm x 72mm.

## Prinsip-Prinsip Utama yang Membuat Program Bisa Print

### 1. **ZPL (Zebra Programming Language) - Bahasa Komando Printer**
Prinsip paling fundamental: Printer thermal (ZPL-compatible) memahami bahasa komando khusus yang disebut ZPL. Program ini tidak mengirim gambar atau file, melainkan **string text berisi instruksi ZPL** yang langsung dieksekusi oleh printer.

**Struktur ZPL Command:**
```
^XA                    // Start of label
^LL285                 // Label Length (height dalam dots)
^PW394                 // Print Width (width dalam dots)
^FO10,10               // Field Origin (posisi X, Y)
^A0N,30,30             // Font specification
^FDHello World^FS      // Field Data (text content) + Field Separator
^XZ                    // End of label
```

**Konsep Penting:**
- Printer thermal ZPL adalah "interpreter" yang membaca string ZPL dan langsung mencetak
- Tidak perlu driver khusus untuk formatting, semua diatur via ZPL commands
- ZPL adalah bahasa yang sangat spesifik dan terstruktur

### 2. **Konversi Unit: Millimeter ke Dots (Pixels)**
Printer thermal menggunakan sistem koordinat berbasis **dots** (pixels), bukan millimeter. Program harus mengkonversi:

**Formula Konversi:**
```
dotsPerMM = DPI / 25.4
widthInDots = labelWidth (mm) × dotsPerMM
heightInDots = labelHeight (mm) × dotsPerMM
```

**Contoh (203 DPI, 100mm x 72mm):**
- Dots per mm = 203 / 25.4 = 7.992 dots/mm
- Width = 100mm × 7.992 = 799 dots
- Height = 72mm × 7.992 = 575 dots

**Mengapa Penting:**
- Semua posisi (X, Y) dalam ZPL harus dalam dots
- Ukuran font, barcode, QR code juga dalam dots
- Tanpa konversi ini, label akan terpotong atau tidak sesuai ukuran

### 3. **Tiga Metode Pengiriman ZPL ke Printer**

#### **Metode 1: Windows Printer Queue (RAW Printing)**
**Prinsip:**
- Menggunakan Windows Print Spooler API (Win32 API)
- Mengirim data ZPL sebagai **RAW data** (bukan formatted document)
- Data dikirim langsung ke printer tanpa formatting oleh driver Windows

**Cara Kerja:**
1. Program membuat temporary file berisi ZPL string
2. Menggunakan PowerShell script dengan C# embedded
3. PowerShell memanggil Win32 API: `OpenPrinter()` → `StartDocPrinter()` → `WritePrinter()` → `EndDocPrinter()`
4. Data dikirim dengan `pDataType = "RAW"` (krusial!)
5. Printer menerima data RAW dan langsung mengeksekusi ZPL

**Kode Kunci:**
```javascript
// Win32 API call via PowerShell
[DllImport("winspool.drv", EntryPoint="WritePrinter")]
public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

// DOCINFOA dengan pDataType = "RAW"
di.pDataType = "RAW";
```

**Mengapa RAW penting:**
- Jika tidak RAW, Windows akan mencoba format data sebagai text/image
- Printer ZPL butuh data mentah (raw) untuk menginterpretasi ZPL commands
- RAW mode = data dikirim persis seperti yang dikirim, tanpa modifikasi

#### **Metode 2: Network TCP/IP (Port 9100)**
**Prinsip:**
- Printer terhubung ke jaringan dengan IP address
- Printer membuka port TCP/IP 9100 (standard untuk ZPL network printing)
- Program mengirim ZPL string sebagai TCP socket data

**Cara Kerja:**
1. Program membuat TCP socket connection ke `printerIP:9100`
2. Mengirim ZPL string sebagai UTF-8 text melalui socket
3. Printer menerima data dan langsung mengeksekusi ZPL
4. Socket ditutup setelah data terkirim

**Kode Kunci:**
```javascript
const socket = new net.Socket();
socket.connect(9100, printerIP);
socket.write(zpl, 'utf8', () => {
  socket.end(); // Close connection
});
```

**Keuntungan:**
- Tidak perlu driver Windows
- Bisa digunakan dari Linux/Mac
- Langsung ke printer tanpa melalui print spooler

#### **Metode 3: COM Port (USB Serial)**
**Prinsip:**
- Printer terhubung via USB dan terdeteksi sebagai Serial Port (COM)
- Komunikasi menggunakan Serial Port protocol (RS-232/USB Serial)
- ZPL string dikirim sebagai serial data

**Cara Kerja:**
1. Program membuka Serial Port (contoh: COM3)
2. Mengatur baud rate (biasanya 9600 untuk thermal printer)
3. Mengirim ZPL string sebagai serial data
4. Printer menerima dan mengeksekusi ZPL

**Kode Kunci:**
```javascript
const port = new SerialPort({
  path: 'COM3',
  baudRate: 9600
});
port.write(zpl, 'utf8');
```

### 4. **Flow Proses Print (End-to-End)**

```
[User Input] 
    ↓
[generateZPL()] → Convert data (text, barcode, QR) ke ZPL string
    ↓
[printZPL()] → Pilih metode print (Windows/Network/COM)
    ↓
[printViaWindows/Network/COM] → Kirim ZPL string ke printer
    ↓
[Printer Hardware] → Parser ZPL → Eksekusi → Print label
```

**Detail Setiap Tahap:**

1. **Input Data** (JavaScript Object):
   ```javascript
   {
     text: 'PRODUK ABC',
     barcode: '123456789',
     qrCode: 'https://example.com',
     fontSize: 30,
     x: 10,
     y: 10
   }
   ```

2. **Generate ZPL** (String Concatenation):
   ```javascript
   let zpl = '^XA';                    // Start
   zpl += `^LL${heightInDots}`;        // Label size
   zpl += `^PW${widthInDots}`;
   zpl += `^FO${x},${y}`;              // Position
   zpl += `^FD${text}^FS`;             // Content
   zpl += '^XZ';                       // End
   ```

3. **Send to Printer** (via chosen method):
   - Windows: Win32 API WritePrinter with RAW mode
   - Network: TCP socket write
   - COM: Serial port write

4. **Printer Processing**:
   - Printer menerima string ZPL
   - Parser ZPL membaca setiap command
   - Render label sesuai instruksi
   - Print ke kertas thermal

### 5. **Komponen ZPL Commands yang Digunakan**

| Command | Fungsi | Contoh |
|---------|--------|--------|
| `^XA` | Start of label format | `^XA` |
| `^XZ` | End of label format | `^XZ` |
| `^LL` | Label Length (height) | `^LL575` (dalam dots) |
| `^PW` | Print Width | `^PW799` (dalam dots) |
| `^FO` | Field Origin (X, Y position) | `^FO10,10` |
| `^FD` | Field Data (content) | `^FDHello World` |
| `^FS` | Field Separator (end field) | `^FS` |
| `^A0` | Font specification | `^A0N,30,30` |
| `^BC` | Barcode Code 128 | `^BCN,20,Y,N,N` |
| `^BQ` | QR Code | `^BQN,2,5` |
| `^GB` | Graphic Box | `^GB100,50,2` |

### 6. **Mengapa Program Ini Bisa Print**

**Faktor-Faktor Kunci:**

1. **ZPL Compatibility**: Printer harus support ZPL commands (Zebra, compatible printers)
2. **RAW Data Mode**: Data harus dikirim sebagai RAW (tidak diformat)
3. **Konversi Dots**: Semua koordinat harus dikonversi ke dots berdasarkan DPI
4. **Direct Communication**: Langsung ke printer tanpa formatting layer
5. **Correct Protocol**: Menggunakan protokol yang benar (TCP 9100, Serial, atau Win32 RAW)

**Yang TIDAK Digunakan:**
- ❌ Image files (PNG, JPG) - tidak digunakan
- ❌ PDF files - tidak digunakan
- ❌ Formatted text - tidak digunakan
- ❌ Windows GDI printing - tidak digunakan
- ❌ Printer driver formatting - tidak digunakan

**Yang DIGUNAKAN:**
- ✅ ZPL command strings
- ✅ RAW data transmission
- ✅ Direct hardware communication
- ✅ Coordinate-based positioning (dots)

### 7. **Error Handling & Troubleshooting**

**Common Issues:**

1. **Printer tidak print**: 
   - Cek apakah data dikirim sebagai RAW (bukan formatted)
   - Cek apakah printer support ZPL
   - Cek koneksi (network/COM/Windows queue)

2. **Label tidak sesuai ukuran**:
   - Cek konversi mm ke dots (DPI setting)
   - Cek ukuran label di printer setting

3. **Posisi tidak tepat**:
   - Cek koordinat X, Y sudah dikonversi ke dots
   - Cek offset printer (calibration)

## Kesimpulan

**Prinsip Utama yang Membuat Program Bisa Print:**

1. ✅ **ZPL Commands**: Printer memahami bahasa ZPL, bukan gambar/file
2. ✅ **RAW Data Transmission**: Data dikirim mentah tanpa formatting
3. ✅ **Direct Communication**: Langsung ke printer via network/serial/Windows API
4. ✅ **Coordinate Conversion**: Konversi mm → dots berdasarkan DPI
5. ✅ **Command String**: Semua adalah text string, bukan binary/image data

**Inti Program:**
Program ini adalah **ZPL command generator dan transmitter**. Bukan image renderer atau document formatter. Printer thermal ZPL adalah interpreter yang membaca string commands dan langsung mencetak.

---

## Prompt untuk AI Assistant

"Buat program Node.js untuk print label thermal menggunakan ZPL (Zebra Programming Language). Program harus:

1. Generate ZPL command strings dari data JavaScript (text, barcode, QR code)
2. Konversi koordinat millimeter ke dots berdasarkan DPI printer
3. Support 3 metode print:
   - Windows Printer Queue dengan RAW mode (Win32 API via PowerShell)
   - Network TCP/IP pada port 9100
   - COM Port Serial (USB)
4. Ukuran label default: 100mm x 72mm
5. Support element: text, barcode Code 128, QR code, box/border
6. Error handling untuk setiap metode print
7. Function untuk generate ZPL preview tanpa print

**Prinsip penting:**
- ZPL adalah bahasa command, bukan format gambar
- Data harus dikirim sebagai RAW (tidak diformat)
- Semua posisi dalam dots (pixels), bukan mm
- Printer thermal ZPL adalah interpreter yang membaca string commands"

---

## Contoh Penggunaan Prompt

Jika ingin membuat program serupa atau memodifikasi, gunakan prompt di atas dan jelaskan:
- Ukuran label yang diinginkan
- DPI printer
- Metode print yang diinginkan
- Elemen label yang dibutuhkan
- Fitur tambahan yang diperlukan

