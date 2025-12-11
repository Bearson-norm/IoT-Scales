# Technical Prompt: Implementasi Print ZPL Thermal Printer

## Architecture Overview

```
┌─────────────────┐
│  User Input     │ (JavaScript Object: text, barcode, QR, position)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  generateZPL()  │ (Convert object → ZPL command string)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   printZPL()    │ (Router: choose print method)
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Windows │ │Network │ │COM     │ │Auto    │
│RAW API │ │TCP/IP  │ │Serial  │ │Detect  │
└────┬───┘ └───┬────┘ └───┬────┘ └───┬────┘
     │         │          │          │
     └─────────┴──────────┴──────────┘
                    │
                    ▼
            ┌───────────────┐
            │  Printer      │
            │  (ZPL Parser) │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  Label Printed│
            └───────────────┘
```

## Core Components

### 1. ZPL Generator (`generateZPL()`)

**Input**: JavaScript object
```javascript
{
  text: 'PRODUK ABC',
  barcode: '123456789',
  qrCode: 'https://example.com',
  fontSize: 30,
  x: 10,  // mm
  y: 10   // mm
}
```

**Process**:
1. Convert mm coordinates to dots: `dots = mm × (DPI / 25.4)`
2. Build ZPL string with commands:
   - `^XA` - Start label
   - `^LL` - Label length (height in dots)
   - `^PW` - Print width (width in dots)
   - `^FO` - Field origin (position in dots)
   - `^FD` - Field data (content)
   - `^FS` - Field separator
   - `^BC` - Barcode command
   - `^BQ` - QR code command
   - `^XZ` - End label

**Output**: ZPL command string
```
^XA^LL575^PW799^PO0^FO79,79^A0N,239,239^FDPRODUK ABC^FS^FO79,158^BCN,159,Y,N,N^FD123456789^FS^FO79,237^BQN,2,5^FDQA,https://example.com^FS^XZ
```

### 2. Print Method: Windows RAW API

**Technology Stack**:
- Node.js `child_process.exec()`
- PowerShell script (embedded)
- C# class (via `Add-Type`)
- Win32 API (DLL imports)

**Key Win32 APIs**:
```csharp
[DllImport("winspool.drv")]
OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd)

[DllImport("winspool.drv")]
StartDocPrinter(IntPtr hPrinter, int level, DOCINFOA di)

[DllImport("winspool.drv")]
WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten)

[DllImport("winspool.drv")]
EndDocPrinter(IntPtr hPrinter)
```

**Critical Configuration**:
```csharp
DOCINFOA di = new DOCINFOA();
di.pDocName = "ZPL Label";
di.pDataType = "RAW";  // ← MUST BE RAW!
```

**Flow**:
1. Save ZPL to temp file
2. Generate PowerShell script with embedded C# class
3. Execute PowerShell script
4. PowerShell loads Win32 DLLs via P/Invoke
5. Open printer, start document with RAW data type
6. Write ZPL string bytes to printer
7. End document, close printer
8. Clean up temp files

### 3. Print Method: Network TCP/IP

**Technology**: Node.js `net.Socket`

**Protocol**: Raw TCP socket on port 9100 (standard ZPL port)

**Flow**:
```javascript
const socket = new net.Socket();
socket.connect(9100, printerIP);
socket.write(zpl, 'utf8', () => {
  socket.end();
});
```

**Key Points**:
- No protocol overhead (just raw TCP)
- UTF-8 encoding
- Port 9100 is standard for ZPL network printing
- One-way communication (send only)

### 4. Print Method: COM Port Serial

**Technology**: `serialport` package (optional dependency)

**Configuration**:
```javascript
const port = new SerialPort({
  path: 'COM3',
  baudRate: 9600,  // Standard for thermal printers
  autoOpen: false
});
```

**Flow**:
1. Open serial port
2. Write ZPL string as UTF-8
3. Wait for data to be sent
4. Close port

## Data Flow Detail

### Coordinate Conversion

**Input**: User provides coordinates in millimeters
```javascript
x: 10,  // 10mm from left
y: 10   // 10mm from top
```

**Calculation**:
```javascript
const dotsPerMM = DPI / 25.4;  // 203 / 25.4 = 7.992 dots/mm
const xInDots = Math.round(x * dotsPerMM);  // 10 * 7.992 = 80 dots
const yInDots = Math.round(y * dotsPerMM);  // 10 * 7.992 = 80 dots
```

**ZPL Command**:
```
^FO80,80  // Field Origin at 80,80 dots
```

### Font Size Conversion

**Input**: Font size in points
```javascript
fontSize: 30  // 30 points
```

**ZPL Format**: `^A0N,height,width` (both in dots)
```javascript
const fontSizeInDots = Math.round(fontSize * dotsPerMM / 10);
// 30 * 7.992 / 10 = 24 dots
```

**ZPL Command**:
```
^A0N,24,24  // Font height 24, width 24 dots
```

### Barcode Generation

**ZPL Command Format**: `^BCN,height,Y,N,N`
- `^BC` = Barcode Code 128
- `N` = Normal orientation
- `height` = Barcode height in dots
- `Y` = Print human readable text below
- `N,N` = Other options (default)

```javascript
const barcodeHeight = Math.round(20 * dotsPerMM / 10);  // 20mm = 16 dots
// ZPL: ^BCN,16,Y,N,N
```

### QR Code Generation

**ZPL Command Format**: `^BQN,model,size`
- `^BQ` = QR Code
- `N` = Normal orientation
- `model` = 2 (Model 2, standard)
- `size` = 1-10 (module size)

**Content Format**: `^FDQA,{content}`
- `QA` = Error correction level Q (25%)
- `A` = Auto mode

```javascript
// ZPL: ^BQN,2,5^FDQA,https://example.com^FS
```

## Error Handling Strategy

### Windows RAW Method
- Check printer exists: `OpenPrinter()` error handling
- Check write success: `WritePrinter()` return value
- Clean up on error: Always close printer handle

### Network Method
- Connection timeout: 5 seconds
- Socket error handling
- Connection refused detection

### COM Method
- Port not found error
- Port already in use
- Serial communication errors

## Dependencies

### Required
- `net` (Node.js built-in) - TCP/IP communication
- `fs` (Node.js built-in) - File operations
- `path` (Node.js built-in) - Path handling
- `child_process` (Node.js built-in) - Execute PowerShell
- `os` (Node.js built-in) - Platform detection

### Optional
- `serialport` - Only if using COM port method

## Security Considerations

1. **PowerShell Script Execution**
   - Uses `-ExecutionPolicy Bypass` (required for script execution)
   - Scripts are temporary and auto-deleted
   - No user input in script generation (prevented injection)

2. **File Operations**
   - Temp files in system temp directory
   - Auto-cleanup after execution
   - File names use timestamp (prevent collision)

3. **Network Communication**
   - No authentication (standard for port 9100)
   - Timeout protection (5 seconds)
   - Error handling for connection failures

## Performance Considerations

1. **ZPL Generation**: O(1) - Simple string concatenation
2. **Windows Method**: ~500ms - PowerShell startup + API calls
3. **Network Method**: ~100ms - Direct TCP connection
4. **COM Method**: ~200ms - Serial port communication

## Testing Strategy

1. **ZPL Generation**: Unit test ZPL string output
2. **Coordinate Conversion**: Test mm → dots calculations
3. **Print Methods**: Integration test with actual printer
4. **Error Cases**: Test with invalid printer names, network failures

## Extension Points

1. **Custom ZPL Commands**: Add new ZPL commands in `generateZPL()`
2. **New Print Methods**: Add methods in `printZPL()` router
3. **Template System**: Extend `generateCustomZPL()` for templates
4. **Image Support**: Add `^GF` command for image data (base64)

---

## Prompt for Implementation

"Implement Node.js class `ThermalLabelPrinter` with:

1. **ZPL Generator**:
   - Convert JS object → ZPL string
   - Convert mm → dots (DPI-based)
   - Support: text, barcode Code 128, QR code, box

2. **Windows RAW Print**:
   - Use PowerShell + C# + Win32 API
   - `OpenPrinter()` → `WritePrinter()` with RAW data type
   - Temp file + script generation + cleanup

3. **Network Print**:
   - TCP socket to port 9100
   - UTF-8 encoding
   - Timeout handling

4. **COM Print**:
   - SerialPort package
   - Baud rate 9600
   - Error handling

5. **Router**:
   - Auto-detect or manual method selection
   - Fallback chain: Windows → Network → COM

6. **Error Handling**:
   - Try-catch for all methods
   - Cleanup on errors
   - Descriptive error messages"

