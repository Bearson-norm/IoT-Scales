# Cara Program Menangani Data dari Timbangan

Dokumen ini menjelaskan secara detail bagaimana program menangani data dari timbangan, mulai dari pembacaan serial port hingga pengiriman ke frontend.

## Daftar Isi

1. [Overview](#overview)
2. [Arsitektur Data Flow](#arsitektur-data-flow)
3. [Mode Pembacaan Data](#mode-pembacaan-data)
4. [Proses Handling Data](#proses-handling-data)
5. [Buffer Management](#buffer-management)
6. [Error Handling](#error-handling)
7. [Pengiriman ke Frontend](#pengiriman-ke-frontend)
8. [Optimasi dan Best Practices](#optimasi-dan-best-practices)

---

## Overview

Program menangani data dari timbangan melalui dua mekanisme utama:

1. **WebSocket (Continuous Reading)** - Mode real-time untuk streaming data
2. **HTTP REST API (On-Demand Reading)** - Mode request-response untuk pembacaan sekali

Kedua mode menggunakan mekanisme yang sama untuk:
- Membaca data dari serial port
- Mengelola buffer untuk data yang tidak lengkap
- Memproses dan parsing data
- Validasi dan error handling

---

## Arsitektur Data Flow

### Diagram Alur Data

```
┌─────────────────┐
│  Timbangan      │
│  (Hardware)     │
└────────┬────────┘
         │ Serial Data (RS232)
         │ Format: "ST,+000140.7  g\r\n"
         ↓
┌─────────────────┐
│  Serial Port    │
│  (COM Port)     │
└────────┬────────┘
         │ Raw Bytes (Buffer)
         ↓
┌─────────────────┐
│  Server.js      │
│  - Buffer       │
│  - Line Parsing │
│  - Validation   │
└────────┬────────┘
         │ Parsed Data
         │ { weight: 140.7, unit: 'g', ... }
         ↓
    ┌────┴────┐
    │         │
    ↓         ↓
┌────────┐ ┌──────────────┐
│WebSocket│ │ HTTP Response│
│Stream  │ │ (REST API)   │
└───┬────┘ └──────┬───────┘
    │             │
    ↓             ↓
┌─────────────────┐
│  Frontend        │
│  (App.jsx)       │
└─────────────────┘
```

---

## Mode Pembacaan Data

### 1. WebSocket Mode (Continuous Reading)

**Digunakan untuk:** Real-time streaming data ke frontend

**Kapan Aktif:**
- Ketika ada client WebSocket yang terhubung
- Mode ini membaca data secara kontinyu dan mengirim ke semua client

**Implementasi:**

```javascript
// server.js - startContinuousReading()
function startContinuousReading() {
  // 1. Setup data handler
  const dataHandler = (chunk) => {
    // Accumulate data in buffer
    continuousReadingBuffer = Buffer.concat([continuousReadingBuffer, chunk]);
    
    // Process complete lines
    const str = continuousReadingBuffer.toString('ascii');
    let newlineIdx = str.indexOf('\n');
    
    while (newlineIdx >= 0) {
      // Extract line
      const line = str.substring(lineStart, lineEnd);
      
      // Parse and broadcast
      const parsed = parseWeightSmart(trimmed);
      if (parsed) {
        broadcastScaleData(parsed); // ← Kirim ke semua WebSocket clients
      }
    }
  };
  
  // 2. Attach handler to port
  activePort.on('data', dataHandler);
  
  // 3. Poll scale every 50ms
  continuousReadingInterval = setInterval(() => {
    activePort.write('P\r'); // Request data from scale
  }, 50);
}
```

**Karakteristik:**
- ✅ Real-time (update setiap 50ms)
- ✅ Efficient (port tetap terbuka, tidak perlu buka/tutup)
- ✅ Multi-client support (broadcast ke semua client)
- ⚠️ Resource intensive (port selalu terbuka)

### 2. HTTP REST API Mode (On-Demand Reading)

**Digunakan untuk:** Pembacaan sekali saat dibutuhkan

**Endpoint:** `GET /api/scale/read`

**Implementasi:**

```javascript
// server.js - app.get('/api/scale/read')
app.get('/api/scale/read', async (req, res) => {
  // 1. Reuse existing port if available
  let port = activePort;
  if (port && port.isOpen) {
    // Reuse port, just send poll command
    port.write('P\r');
  } else {
    // Open new port
    port = new SerialPort({ ... });
    port.open();
  }
  
  // 2. Setup data handler with timeout
  const dataHandler = (chunk) => {
    // Accumulate and process
    rawBuffer = Buffer.concat([rawBuffer, chunk]);
    
    // Process complete lines
    const parsed = parseWeightSmart(trimmed);
    if (parsed) {
      finalize(true, parsed); // ← Send HTTP response
    }
  };
  
  // 3. Set timeout
  setTimeout(() => {
    finalize(false, { error: 'Timeout' });
  }, scaleConfig.timeoutMs);
});
```

**Karakteristik:**
- ✅ On-demand (hanya saat diperlukan)
- ✅ Resource efficient (port bisa ditutup setelah selesai)
- ✅ Simple request-response pattern
- ⚠️ Latency lebih tinggi (perlu buka port jika belum terbuka)

---

## Proses Handling Data

### Langkah 1: Penerimaan Data dari Serial Port

**Event Handler:**
```javascript
port.on('data', (chunk) => {
  // chunk adalah Buffer yang berisi raw bytes dari timbangan
  // Contoh: Buffer.from("ST,+000140.7  g\r\n", 'ascii')
  
  // Accumulate ke buffer
  rawBuffer = Buffer.concat([rawBuffer, chunk]);
});
```

**Karakteristik Data:**
- Data datang dalam **chunks** (potongan-potongan)
- Tidak selalu lengkap dalam satu chunk
- Perlu di-accumulate di buffer sampai lengkap

**Contoh:**
```
Chunk 1: "ST,+0001"
Chunk 2: "40.7  g\r\n"
→ Buffer lengkap: "ST,+000140.7  g\r\n"
```

### Langkah 2: Buffer Management

**Tujuan:** Menyimpan data yang belum lengkap sampai mendapat newline (`\n`)

**Implementasi:**

```javascript
// Convert buffer ke string
const str = rawBuffer.toString('ascii');

// Cari newline
let newlineIdx = str.indexOf('\n');
let lineStart = 0;

// Process semua line yang lengkap
while (newlineIdx >= 0) {
  // Extract line (handle \r\n atau \n)
  const lineEnd = str[newlineIdx - 1] === '\r' 
    ? newlineIdx - 1 
    : newlineIdx;
  const line = str.substring(lineStart, lineEnd);
  
  // Process line...
  
  // Move ke next line
  lineStart = newlineIdx + 1;
  newlineIdx = str.indexOf('\n', lineStart);
}

// Simpan sisa data yang belum lengkap
if (lineStart > 0) {
  rawBuffer = Buffer.from(str.substring(lineStart), 'ascii');
}
```

**Mengapa Perlu Buffer?**
- Data bisa datang terpotong: `"ST,+0001"` lalu `"40.7  g\r\n"`
- Perlu menunggu sampai mendapat newline untuk memastikan data lengkap
- Mencegah parsing data yang tidak lengkap

### Langkah 3: Line Processing

**Validasi Panjang Data:**
```javascript
const minLengthForCompleteData = 15; // Minimum untuk format AND

if (trimmed.length >= minLengthForCompleteData) {
  // Data cukup panjang, bisa di-parse
  const parsed = parseWeightSmart(trimmed);
} else {
  // Data terlalu pendek, tunggu lebih banyak data
  // Jangan parse dulu
}
```

**Mengapa Validasi Panjang?**
- Format AND minimal: `"ST,+000138.3  g"` = 15 karakter
- Data pendek seperti `"8.3  g"` kemungkinan terpotong
- Mencegah parsing data yang tidak lengkap

**Fast Trim:**
```javascript
// Optimasi: hanya trim jika perlu
const trimmed = line.charCodeAt(0) <= 32 || 
                line.charCodeAt(line.length - 1) <= 32
  ? line.trim() 
  : line;
```

**Mengapa Fast Trim?**
- Menghindari overhead `trim()` jika tidak perlu
- Cek karakter pertama/terakhir dulu
- Hanya trim jika ada whitespace di ujung

### Langkah 4: Parsing Data

**Fungsi:** `parseWeightSmart(raw)`

**Proses:**
1. Cek model timbangan dari konfigurasi
2. Panggil parser yang sesuai (AND atau Vibra)
3. Return hasil dalam gram

**Detail parsing:** Lihat dokumentasi `CARA_KERJA_PARSING_TIMBANGAN.md`

**Contoh:**
```javascript
const parsed = parseWeightSmart("ST,+000140.7  g");
// Result: { weight: 140.7, unit: 'g', stable: true, raw: "..." }
```

### Langkah 5: Validasi Hasil Parsing

**Validasi yang Dilakukan:**
- ✅ Parsing berhasil (tidak null)
- ✅ Weight dalam range yang masuk akal (0 - 10000g)
- ✅ Data tidak terpotong (length cukup)
- ✅ Format sesuai (ada prefix ST/US untuk AND)

**Jika Validasi Gagal:**
- Return `null` (tidak kirim ke frontend)
- Frontend akan menggunakan nilai sebelumnya
- Log warning untuk debugging

---

## Buffer Management

### Buffer untuk Continuous Reading

```javascript
let continuousReadingBuffer = Buffer.alloc(0);

// Accumulate data
continuousReadingBuffer = Buffer.concat([continuousReadingBuffer, chunk]);

// Process dan simpan sisa
if (lineStart > 0) {
  continuousReadingBuffer = Buffer.from(str.substring(lineStart), 'ascii');
}

// Limit buffer size (prevent memory leak)
if (continuousReadingBuffer.length > 200) {
  continuousReadingBuffer = Buffer.alloc(0);
}
```

**Mengapa Limit Buffer?**
- Mencegah memory leak jika data tidak pernah lengkap
- Reset buffer jika terlalu besar (kemungkinan error)
- Batas 200 bytes cukup untuk beberapa line data

### Buffer untuk HTTP Request

```javascript
let rawBuffer = Buffer.alloc(0);

// Accumulate
rawBuffer = Buffer.concat([rawBuffer, chunk]);

// Process dan simpan sisa
if (lineStart > 0) {
  rawBuffer = Buffer.from(str.substring(lineStart), 'ascii');
}

// Reset jika terlalu besar
if (rawBuffer.length > 200) {
  finalize(false, { error: 'Invalid data format' });
}
```

**Perbedaan dengan Continuous Reading:**
- Buffer di-reset setelah request selesai
- Timeout untuk mencegah hanging request
- Error handling lebih strict (return error response)

---

## Error Handling

### 1. Port Error

**Kasus:**
- Port tidak bisa dibuka
- Port sudah digunakan aplikasi lain
- Port tidak ada

**Handling:**
```javascript
port.on('error', (err) => {
  if (err.message.includes('cannot open')) {
    finalize(false, { 
      error: `Port ${scaleConfig.port} is busy or not available` 
    });
  } else {
    finalize(false, { error: err.message });
  }
});
```

### 2. Timeout

**Kasus:**
- Timbangan tidak merespons
- Data tidak datang dalam waktu yang ditentukan

**Handling:**
```javascript
const timeoutId = setTimeout(() => {
  if (!resolved) {
    finalize(false, { 
      error: `Timeout: No data received after ${scaleConfig.timeoutMs}ms` 
    });
  }
}, scaleConfig.timeoutMs);
```

**Default Timeout:** Biasanya 2000ms (2 detik)

### 3. Data Tidak Valid

**Kasus:**
- Data terpotong
- Format tidak sesuai
- Parsing gagal

**Handling:**
```javascript
// Validasi panjang
if (trimmed.length < minLengthForCompleteData) {
  // Tunggu lebih banyak data
  return;
}

// Parsing
const parsed = parseWeightSmart(trimmed);
if (!parsed) {
  // Parsing gagal, skip data ini
  return;
}
```

### 4. Buffer Overflow

**Kasus:**
- Buffer terlalu besar (data tidak pernah lengkap)
- Kemungkinan error komunikasi

**Handling:**
```javascript
if (rawBuffer.length > 200) {
  // Reset buffer atau return error
  rawBuffer = Buffer.alloc(0);
  // atau
  finalize(false, { error: 'Invalid data format' });
}
```

### 5. WebSocket Error

**Kasus:**
- Client disconnect
- Network error
- Send error

**Handling:**
```javascript
scaleClients.forEach((client) => {
  if (client.readyState === WebSocket.OPEN) {
    try {
      client.send(message);
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
      scaleClients.delete(client); // Remove failed client
    }
  }
});
```

---

## Pengiriman ke Frontend

### 1. WebSocket Broadcast

**Fungsi:** `broadcastScaleData(data)`

**Implementasi:**
```javascript
function broadcastScaleData(data) {
  if (scaleClients.size === 0) return;
  
  // Throttle (optional, currently disabled)
  const now = Date.now();
  if (now - lastBroadcastTime < MIN_BROADCAST_INTERVAL) return;
  lastBroadcastTime = now;
  
  // Format message
  const message = JSON.stringify({
    type: 'scale_data',
    success: true,
    timestamp: new Date().toISOString(),
    weight: data.weight,      // Selalu dalam gram
    unit: data.unit,           // Selalu 'g'
    originalUnit: data.originalUnit,
    stable: data.stable,
    raw: data.raw
  });
  
  // Send ke semua client
  scaleClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
```

**Format Message:**
```json
{
  "type": "scale_data",
  "success": true,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "weight": 140.7,
  "unit": "g",
  "originalUnit": "G",
  "stable": true,
  "raw": "ST,+000140.7  g"
}
```

### 2. HTTP Response

**Format Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "weight": 140.7,
  "unit": "g",
  "originalUnit": "G",
  "stable": true,
  "raw": "ST,+000140.7  g"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Timeout: No data received after 2000ms",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 3. Frontend Reception (App.jsx)

**WebSocket Handler:**
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'scale_data' && message.success) {
    // Weight sudah dalam gram
    const weightGrams = message.weight;
    
    // Update state
    setScaleDisplayWeight(Math.round(weightGrams * 10) / 10);
    
    // Update currentWeight jika weighing aktif
    if (isWeighingActive) {
      setCurrentWeight(weightGrams);
    }
  }
};
```

**HTTP Polling Handler:**
```javascript
const pollScale = async () => {
  const response = await fetch('/api/scale/read');
  const data = await response.json();
  
  if (data.success) {
    const weightGrams = data.weight; // Sudah dalam gram
    setCurrentWeight(weightGrams);
  }
};
```

---

## Optimasi dan Best Practices

### 1. Port Reuse

**Masalah:** Membuka/tutup port berulang kali lambat

**Solusi:** Reuse port yang sudah terbuka
```javascript
// Cek apakah port sudah terbuka
if (activePort && activePort.isOpen) {
  // Reuse port, hanya kirim poll command
  activePort.write('P\r');
} else {
  // Buka port baru
  port = new SerialPort({ ... });
}
```

**Keuntungan:**
- ✅ Lebih cepat (tidak perlu buka port)
- ✅ Lebih stabil (port tidak sering buka/tutup)
- ✅ Lebih efisien (resource)

### 2. Buffer Optimization

**Masalah:** String concatenation lambat

**Solusi:** Gunakan Buffer
```javascript
// ❌ Lambat
let buffer = '';
buffer += chunk.toString();

// ✅ Cepat
let buffer = Buffer.alloc(0);
buffer = Buffer.concat([buffer, chunk]);
```

**Keuntungan:**
- ✅ Lebih cepat untuk data binary
- ✅ Lebih efisien memory
- ✅ Lebih aman (tidak ada encoding issues)

### 3. Fast Trim

**Masalah:** `trim()` selalu membuat string baru

**Solusi:** Cek dulu sebelum trim
```javascript
// ❌ Selalu trim
const trimmed = line.trim();

// ✅ Hanya trim jika perlu
const trimmed = line.charCodeAt(0) <= 32 || 
                line.charCodeAt(line.length - 1) <= 32
  ? line.trim() 
  : line;
```

**Keuntungan:**
- ✅ Lebih cepat untuk data yang sudah bersih
- ✅ Mengurangi overhead

### 4. Throttling (Optional)

**Masalah:** Terlalu banyak broadcast bisa overwhelm client

**Solusi:** Throttle broadcasts
```javascript
const MIN_BROADCAST_INTERVAL = 0; // Currently disabled

if (now - lastBroadcastTime < MIN_BROADCAST_INTERVAL) {
  return; // Skip broadcast
}
```

**Note:** Saat ini throttling disabled (0ms) untuk real-time maksimal

### 5. Timeout Management

**Masalah:** Request bisa hang jika tidak ada timeout

**Solusi:** Set timeout dengan cleanup
```javascript
const timeoutId = setTimeout(() => {
  if (!resolved) {
    finalize(false, { error: 'Timeout' });
  }
}, scaleConfig.timeoutMs);

// Cleanup di finalize
const cleanup = () => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
};
```

**Keuntungan:**
- ✅ Mencegah hanging request
- ✅ Memberikan feedback ke user
- ✅ Cleanup resource dengan benar

### 6. Error Recovery

**Masalah:** Error bisa membuat sistem tidak responsif

**Solusi:** Graceful error handling
```javascript
try {
  // Operation
} catch (error) {
  // Log error
  console.error('Error:', error);
  
  // Cleanup
  cleanup();
  
  // Return error response
  finalize(false, { error: error.message });
}
```

**Keuntungan:**
- ✅ Sistem tetap stabil
- ✅ User mendapat feedback
- ✅ Resource di-cleanup dengan benar

---

## Contoh Alur Lengkap

### Scenario: WebSocket Continuous Reading

```
1. Frontend connect WebSocket
   → wss.on('connection')
   → scaleClients.add(ws)
   → startContinuousReading()

2. Start continuous reading
   → ensurePortOpen()
   → activePort.on('data', dataHandler)
   → setInterval(() => port.write('P\r'), 50)

3. Scale mengirim data
   → "ST,+000140.7  g\r\n"
   → dataHandler(chunk)
   → Buffer: "ST,+000140.7  g\r\n"

4. Process line
   → Extract line: "ST,+000140.7  g"
   → parseWeightSmart() → { weight: 140.7, unit: 'g', ... }
   → broadcastScaleData()

5. Broadcast ke semua client
   → JSON.stringify({ type: 'scale_data', weight: 140.7, ... })
   → client.send(message)

6. Frontend receive
   → ws.onmessage
   → setScaleDisplayWeight(140.7)
   → Update UI
```

### Scenario: HTTP On-Demand Reading

```
1. Frontend request
   → GET /api/scale/read
   → app.get('/api/scale/read')

2. Check port
   → activePort && activePort.isOpen?
   → Yes: reuse, No: open new

3. Setup handler
   → port.on('data', dataHandler)
   → port.write('P\r')

4. Scale mengirim data
   → "ST,+000140.7  g\r\n"
   → dataHandler(chunk)
   → Buffer: "ST,+000140.7  g\r\n"

5. Process line
   → Extract line: "ST,+000140.7  g"
   → parseWeightSmart() → { weight: 140.7, ... }
   → finalize(true, parsed)

6. Send HTTP response
   → res.json({ success: true, weight: 140.7, ... })
   → cleanup()

7. Frontend receive
   → response.json()
   → setCurrentWeight(140.7)
   → Update UI
```

---

## Troubleshooting

### Issue: Data tidak datang

**Kemungkinan Penyebab:**
1. Port tidak terbuka
2. Port salah
3. Timbangan tidak terhubung
4. Konfigurasi serial salah (baud rate, dll)

**Solusi:**
- Check port di Device Manager
- Check konfigurasi di `scale-config.json`
- Test dengan aplikasi serial monitor
- Check koneksi kabel

### Issue: Data terpotong

**Kemungkinan Penyebab:**
1. Buffer terlalu kecil
2. Timeout terlalu pendek
3. Data datang terlalu cepat

**Solusi:**
- Increase buffer size limit
- Increase timeout
- Check line delimiter (`\r\n` vs `\n`)

### Issue: Parsing gagal

**Kemungkinan Penyebab:**
1. Format data tidak sesuai
2. Encoding error
3. Data corrupt

**Solusi:**
- Enable `DEBUG_SCALE=true` untuk melihat raw data
- Check format data dari timbangan
- Verify encoding (ASCII vs UTF-8)

### Issue: WebSocket tidak connect

**Kemungkinan Penyebab:**
1. Port WebSocket salah
2. Firewall block
3. Server tidak running

**Solusi:**
- Check WebSocket URL di frontend
- Check firewall settings
- Verify server running di port 3001

---

## Kesimpulan

Program menangani data dari timbangan melalui:

1. **Dua Mode:** WebSocket (continuous) dan HTTP (on-demand)
2. **Buffer Management:** Menyimpan data tidak lengkap sampai lengkap
3. **Line Processing:** Extract dan validasi line sebelum parsing
4. **Error Handling:** Graceful handling untuk berbagai error case
5. **Optimasi:** Port reuse, buffer optimization, fast trim

Dengan mekanisme ini, program dapat:
- ✅ Membaca data dengan akurat
- ✅ Menangani data yang tidak lengkap
- ✅ Mengirim data real-time ke frontend
- ✅ Tetap stabil meskipun ada error

---

## Referensi

- **File Implementasi:**
  - `server.js` - `startContinuousReading()`, `app.get('/api/scale/read')`
  - `src/App.jsx` - WebSocket handler, HTTP polling
- **Dokumentasi Terkait:**
  - `CARA_KERJA_PARSING_TIMBANGAN.md` - Detail parsing
  - `WEIGHT_DISPLAY_FLOW.md` - Flow tampilan di UI
  - `SCALE_PARSING_FIX.md` - Perbaikan parsing
