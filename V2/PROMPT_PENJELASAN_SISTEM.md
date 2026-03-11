# Prompt Penjelasan Sistem IoT Scales

File ini berisi prompt-prompt untuk menjelaskan desain UI, cara kerja penerimaan data dari penimbangan, dan cara kerja instruksi printing pada sistem IoT Scales.

---

## 1. PROMPT: DESAIN UI (User Interface)

### Prompt untuk Menjelaskan Desain UI Sistem IoT Scales

"Jelaskan desain UI (User Interface) dari sistem IoT Scales dengan detail berikut:

**Struktur Layout:**
- Sistem menggunakan layout 3-panel utama: Header, Main Content (Left Panel + Right Panel), dan Footer
- Header: Menampilkan logo, informasi user yang login, dan tombol logout
- Left Panel: Panel navigasi dan daftar bahan mentah (ingredients) yang perlu ditimbang
- Right Panel: Panel utama untuk menampilkan informasi penimbangan, progress bar, dan kontrol penimbangan
- Footer: Menampilkan waktu saat ini

**Right Panel - Komponen Utama:**
1. **Digital Weight Display** (Pojok kanan atas):
   - Menampilkan berat real-time dari timbangan dalam format `XXX.X g`
   - Indikator WebSocket (hijau = terhubung, merah = tidak terhubung) dengan animasi pulse
   - Font size: 42px, posisi absolute di pojok kanan atas

2. **Info Badges** (Work Order, Formula Name, Order Qty):
   - Tiga badge informasi horizontal dengan label dan value
   - Background putih dengan border, padding 8px 10px
   - Font size label: 11px, value: 14px

3. **Ingredient Details Section**:
   - **Nama Bahan**: Font size 22px, bold
   - **Progress Bar dengan Tolerance Markers**:
     * Background abu-abu (#e5e7eb), height 16px, border radius 8px
     * Progress fill berubah warna berdasarkan status:
       - Hijau (#22c55e): dalam toleransi
       - Kuning (#eab308): di bawah minimum
       - Merah (#ef4444): di atas maksimum
     * Marker garis vertikal:
       - Biru (#3b82f6): Min dan Max tolerance
       - Ungu (#6366f1): Target weight
       - Hitam (#1f2937): Current reading position
   - **Tolerance Range Labels**: Menampilkan Min, Target, dan Max dengan total weight
   - **Weight Display**: 
     * Current weight: 26px font
     * Target weight: 16px font
     * Progress percentage: 10px font, abu-abu
   - **Parameter Weight Section** (MAX, Plan Qty, MIN, Remaining):
     * Background abu-abu muda (#f8f9fa)
     * Border dan padding untuk setiap row
     * Font size 14px
   - **Instruction Section**: Menampilkan instruksi khusus untuk bahan
   - **Exp Date Section**: Menampilkan tanggal kadaluarsa

4. **Action Buttons**:
   - **Start Button**: Muncul saat belum mulai penimbangan
     * Icon Play, warna biru (#3b82f6)
     * Disabled jika timbangan tidak nol atau sedang weighing
   - **Save Button**: Muncul saat penimbangan aktif
     * Icon Save, warna biru
     * Membuka modal konfirmasi print

**Color Scheme:**
- Background utama: Gradient hijau (#4a7c59 ke #2d5016)
- Panel: Putih dengan border
- Primary button: Biru (#3b82f6)
- Success: Hijau (#22c55e)
- Warning: Kuning (#eab308)
- Error: Merah (#ef4444)

**State Management:**
- Menggunakan React hooks (useState, useEffect, useMemo, useRef)
- State utama: currentWeight, scaleDisplayWeight, isWeighingActive, selectedIngredient
- Smoothing weight untuk mencegah jitter display
- Progress bar max di-lock per ingredient untuk mencegah marker shifting

**Responsive Behavior:**
- Progress bar mengupdate real-time saat berat berubah
- Color coding otomatis berdasarkan status (dalam toleransi/over/under)
- Modal konfirmasi print muncul saat klik Save

**File Lokasi:**
- Komponen utama: `src/components/RightPanel.jsx`
- Styling: `src/index.css`
- State management: `src/App.jsx`"

---

## 2. PROMPT: CARA KERJA PENERIMAAN DATA DARI PENIMBANGAN

### Prompt untuk Menjelaskan Alur Penerimaan Data Penimbangan

"Jelaskan cara kerja penerimaan data dari penimbangan (weighing scales) pada sistem IoT Scales dengan detail berikut:

**Arsitektur Komunikasi:**
Sistem menggunakan komunikasi real-time antara hardware timbangan dan aplikasi web melalui WebSocket connection.

**Alur Data (End-to-End):**

1. **Hardware Layer - Timbangan:**
   - Timbangan mengirim data berat melalui Serial Port (COM Port)
   - Format data: String ASCII dengan berat dalam format tertentu
   - Data dikirim secara kontinyu (continuous reading mode)

2. **Server Layer - Backend (server.js):**
   - **Serial Port Reading**:
     * Menggunakan library `serialport` untuk membaca data dari COM Port
     * Buffer management untuk menangani data yang terpotong
     * Parsing data menggunakan fungsi `parseWeightSmart()` untuk ekstrak nilai berat
   
   - **WebSocket Server**:
     * Server membuka WebSocket connection di `ws://localhost:3001`
     * Fungsi `startContinuousReading()` membaca data dari serial port secara kontinyu
     * Setiap data yang diterima di-broadcast ke semua client yang terhubung via `broadcastScaleData()`
     * Format pesan WebSocket:
       ```json
       {
         "type": "scale_data",
         "success": true,
         "weight": 170.5,
         "unit": "g",
         "timestamp": "2024-01-01T12:00:00Z"
       }
       ```

3. **Client Layer - Frontend (App.jsx):**
   - **WebSocket Connection**:
     * Client membuat WebSocket connection ke `ws://localhost:3001`
     * Event handler `onmessage` menerima data real-time
     * State `scaleDisplayWeight` di-update setiap kali data diterima
     * State `scaleConnected` menunjukkan status koneksi (hijau/merah indicator)
   
   - **Data Processing**:
     * Data berat diterima dalam gram
     * Rounding ke 0.1g precision untuk mencegah jitter display
     * Smoothing algorithm untuk filter fluktuasi kecil (< 0.05g)
     * Update logic: selalu update untuk peningkatan, filter untuk penurunan kecil

4. **Display Layer - RightPanel.jsx:**
   - **Digital Weight Display**:
     * Menampilkan `scaleDisplayWeight` (real-time dari timbangan)
     * Format: `XXX.X g` dengan font size 42px
     * Selalu visible, bahkan saat tidak ada ingredient yang dipilih
   
   - **Current Weight Display**:
     * Saat weighing aktif: menampilkan `currentReading` (accumulated weight)
     * Saat tidak weighing: menampilkan `scaleDisplayWeight` (real-time)
     * Logika: `totalAccumulated = savedWeight + currentReading`

**Fallback Mechanism:**
- Jika WebSocket terputus, sistem menggunakan HTTP polling ke `/api/scale/read`
- Polling interval: setiap 500ms
- Automatic reconnection untuk WebSocket

**Data Flow Diagram:**
```
[Timbangan Hardware]
    ↓ (Serial Data via COM Port)
[Server: serialport reader]
    ↓ (parseWeightSmart)
[Server: WebSocket broadcast]
    ↓ (ws://localhost:3001)
[Client: WebSocket onmessage]
    ↓ (setScaleDisplayWeight)
[RightPanel: Display]
```

**Key Features:**
- Real-time update tanpa delay
- Smoothing untuk mencegah jitter
- Connection status indicator
- Automatic reconnection
- Fallback ke HTTP polling jika WebSocket gagal

**File Lokasi:**
- Server: `server.js` (fungsi `startContinuousReading`, `broadcastScaleData`)
- Client: `src/App.jsx` (WebSocket connection, state management)
- Display: `src/components/RightPanel.jsx` (UI rendering)
- Documentation: `docs/WEIGHT_DISPLAY_FLOW.md`"

---

## 3. PROMPT: CARA KERJA INSTRUKSI PRINTING

### Prompt untuk Menjelaskan Sistem Printing

"Jelaskan cara kerja instruksi printing (sistem cetak label) pada sistem IoT Scales dengan detail berikut:

**Prinsip Dasar:**
Sistem menggunakan ZPL (Zebra Programming Language) untuk mencetak label thermal. Printer thermal ZPL adalah interpreter yang membaca string commands, bukan gambar atau file.

**Alur Proses Printing (End-to-End):**

1. **Trigger Printing:**
   - User klik tombol "Save" di RightPanel
   - Modal konfirmasi print muncul (`PrintConfirmationModal`)
   - User pilih: "Save & Print" atau "Save Only"
   - Jika "Save & Print", fungsi `handleSaveProgress(false)` dipanggil

2. **Data Preparation (App.jsx - handlePrintCurrentReceipt):**
   - Mengumpulkan data untuk print:
     ```javascript
     {
       skuName: workOrder.formulaName,
       ingredientName: selectedIngredient.name,
       currentWeight: totalWeight (saved + current),
       sessionNumber: nextSessionNumber,
       operatorName: currentUser.name,
       workOrder: workOrder.workOrder,
       targetWeight: selectedIngredient.targetWeight,
       // ... data lainnya
     }
     ```
   - Menggunakan active label template dari `printerConfig`

3. **ZPL Generation:**
   - Fungsi `generateZPL()` mengkonversi data JavaScript ke ZPL command string
   - **Konversi Unit**: Millimeter → Dots (pixels)
     * Formula: `dotsPerMM = DPI / 25.4`
     * Contoh (203 DPI, 100mm x 72mm):
       - Dots per mm = 203 / 25.4 = 7.992 dots/mm
       - Width = 100mm × 7.992 = 799 dots
       - Height = 72mm × 7.992 = 575 dots
   
   - **Struktur ZPL Command**:
     ```
     ^XA                    // Start of label
     ^LL575                 // Label Length (height dalam dots)
     ^PW799                 // Print Width (width dalam dots)
     ^FO10,10               // Field Origin (posisi X, Y)
     ^A0N,30,30             // Font specification
     ^FDHello World^FS      // Field Data + Field Separator
     ^BCN,20,Y,N,N          // Barcode Code 128
     ^BQN,2,5               // QR Code
     ^XZ                    // End of label
     ```

4. **Print Method Selection:**
   Sistem mendukung 3 metode pengiriman ZPL:

   **A. Windows RAW Printing (Default):**
   - Menggunakan Windows Print Spooler API (Win32 API)
   - Data dikirim sebagai **RAW data** (tidak diformat)
   - Via PowerShell script dengan C# embedded
   - Win32 API: `OpenPrinter()` → `WritePrinter()` dengan `pDataType = "RAW"`
   - Langsung ke printer tanpa formatting oleh driver Windows

   **B. Network TCP/IP (Port 9100):**
   - TCP socket connection ke `printerIP:9100`
   - ZPL string dikirim sebagai UTF-8 text
   - Langsung ke printer tanpa driver
   - Support dari Linux/Mac

   **C. COM Port Serial (USB):**
   - Serial Port (contoh: COM3)
   - Baud rate 9600
   - ZPL dikirim sebagai serial data

5. **API Endpoint (server.js - /api/print/send-to-xp420):**
   - Endpoint: `POST /api/print/send-to-xp420`
   - Request body:
     ```json
     {
       "receipt": "ZPL string...",
       "printMethod": "windows-raw" | "network-tcp" | "serial-com",
       "printerPort": "Xprinter XP-420B",
       "printerIP": "192.168.1.100",
       "comPort": "COM3",
       "async": true
     }
     ```
   - **Async Mode**: Return immediately, process print in background (faster response)
   - **Sync Mode**: Wait for print completion before response

6. **Print Execution:**
   - Fungsi `sendToPrinterXP420_USB()` untuk Windows RAW
   - Fungsi `printZPL_Network()` untuk Network TCP/IP
   - Fungsi `printZPL_Serial()` untuk COM Serial
   - Setiap metode mengirim ZPL string ke printer sesuai protokol

7. **Printer Processing:**
   - Printer menerima ZPL string
   - Parser ZPL membaca setiap command
   - Render label sesuai instruksi
   - Print ke kertas thermal

**Label Template System:**
- Template disimpan di `printerConfig.labelTemplates`
- Setiap template memiliki:
  - ID, name, width, height, DPI
  - Layout configuration (posisi text, barcode, QR code)
- Active template dipilih via `printerConfig.activeLabelTemplateId`
- Template dapat di-customize di Settings page

**ZPL Commands yang Digunakan:**
| Command | Fungsi | Contoh |
|---------|--------|--------|
| `^XA` | Start of label | `^XA` |
| `^XZ` | End of label | `^XZ` |
| `^LL` | Label Length (height) | `^LL575` |
| `^PW` | Print Width | `^PW799` |
| `^FO` | Field Origin (X, Y) | `^FO10,10` |
| `^FD` | Field Data (content) | `^FDProduct Name` |
| `^FS` | Field Separator | `^FS` |
| `^A0` | Font specification | `^A0N,30,30` |
| `^BC` | Barcode Code 128 | `^BCN,20,Y,N,N` |
| `^BQ` | QR Code | `^BQN,2,5` |
| `^GB` | Graphic Box | `^GB100,50,2` |

**Error Handling:**
- Try-catch untuk setiap metode print
- Logging error ke console dan file
- Fallback mechanism jika satu metode gagal
- User notification via alert modal

**Key Points:**
- ✅ ZPL adalah bahasa command, bukan format gambar
- ✅ Data dikirim sebagai RAW (tidak diformat)
- ✅ Semua posisi dalam dots (pixels), bukan mm
- ✅ Printer thermal ZPL adalah interpreter yang membaca string commands
- ✅ Direct communication ke printer tanpa formatting layer

**File Lokasi:**
- Print handler: `src/App.jsx` (handlePrintCurrentReceipt)
- ZPL generation: `src/utils/labelTemplates.js` atau server-side
- Print API: `server.js` (endpoint `/api/print/send-to-xp420`)
- Print functions: `server.js` (sendToPrinterXP420_USB, printZPL_Network, printZPL_Serial)
- Documentation: `printer_command_nodejs/PROMPT_PRINCIPLES.md`"

---

## PENGGUNAAN PROMPT

Gunakan prompt-prompt di atas untuk:
1. **Dokumentasi**: Menjelaskan sistem kepada developer baru
2. **AI Assistant**: Meminta AI untuk menjelaskan atau memodifikasi sistem
3. **Troubleshooting**: Memahami alur kerja saat debugging
4. **Training**: Melatih user atau developer tentang cara kerja sistem

**Cara Menggunakan:**
- Copy prompt yang relevan
- Paste ke AI assistant (ChatGPT, Claude, dll)
- Atau gunakan sebagai referensi saat menjelaskan sistem

---

## CATATAN TAMBAHAN

**Teknologi yang Digunakan:**
- Frontend: React.js dengan hooks
- Backend: Node.js dengan Express
- WebSocket: ws library untuk real-time communication
- Serial Port: serialport library untuk komunikasi hardware
- Printing: ZPL commands dengan Win32 API / TCP / Serial

**File-file Penting:**
- `src/App.jsx`: Main application logic
- `src/components/RightPanel.jsx`: UI panel utama
- `server.js`: Backend server dengan WebSocket dan print API
- `docs/WEIGHT_DISPLAY_FLOW.md`: Dokumentasi alur data berat
- `printer_command_nodejs/PROMPT_PRINCIPLES.md`: Dokumentasi prinsip printing

---

*File ini dibuat untuk memudahkan penjelasan sistem IoT Scales kepada developer, user, atau AI assistant.*
