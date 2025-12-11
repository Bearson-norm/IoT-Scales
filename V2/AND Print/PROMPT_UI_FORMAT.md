# 📝 Prompt: Format Data Parsing untuk Implementasi UI

## Struktur Data Object

Saat program membaca data timbangan, hasil parsing menghasilkan object JavaScript dengan struktur berikut:

```javascript
{
  status: "ST",                          // String: Kode status timbangan
  weight: {
    value: 200.2,                        // Number: Nilai berat (desimal)
    unit: "g",                           // String: Satuan ("g", "kg", "lb", "oz")
    raw: "+000200.2  g"                 // String: Format asli dari timbangan
  },
  time: null,                            // String|null: Waktu "HH:MM:SS" (jika ada)
  date: null,                            // String|null: Tanggal "DD/MM/YYYY" (jika ada)
  additionalValue: null,                 // String|null: Nilai tambahan (jika ada)
  timestamp: "2025-12-03T04:25:43.530Z", // String: ISO 8601 timestamp
  raw: "ST,+000200.2  g",               // String: Data mentah dari timbangan
  error: undefined                       // String|undefined: Error message (jika parsing gagal)
}
```

## Format Display untuk UI

### 1. Display Berat
```javascript
// Format sederhana: "200.2 g"
`${data.weight.value} ${data.weight.unit}`

// Format dengan 2 desimal: "200.20 g"
`${data.weight.value.toFixed(2)} ${data.weight.unit}`

// Format dengan tanda positif: "+200.2 g"
`${data.weight.value >= 0 ? '+' : ''}${data.weight.value} ${data.weight.unit}`
```

### 2. Display Status
```javascript
// Mapping status ke label
const statusLabels = {
  'ST': 'Stable',
  'US': 'Unstable',
  'OL': 'Overload',
  'UL': 'Underload'
};
const label = statusLabels[data.status] || data.status;

// Status dengan warna (untuk badge/indicator)
const statusColors = {
  'ST': 'green',   // Stable = hijau
  'US': 'yellow',  // Unstable = kuning
  'OL': 'red',     // Overload = merah
  'UL': 'orange'   // Underload = orange
};
```

### 3. Display Tanggal & Waktu
```javascript
// Dari timestamp (selalu tersedia)
new Date(data.timestamp).toLocaleString('id-ID')
// Output: "03/12/2025 11:25:43"

// Dari date + time (jika tersedia)
data.date && data.time ? `${data.date} ${data.time}` : null
```

### 4. Validasi Data
```javascript
// Cek apakah data valid (tidak ada error dan berat valid)
const isValid = !data.error && 
                data.weight && 
                typeof data.weight.value === 'number' &&
                !isNaN(data.weight.value);
```

## Contoh Komponen UI

### Minimal Display
```
┌────────────────────┐
│ [ST] Stable        │  ← Status badge
│                    │
│    200.20 g        │  ← Berat (display besar)
│                    │
│ 03/12/2025 11:25:43│  ← Timestamp
└────────────────────┘
```

### Data yang Ditampilkan
- **Status**: Kode status (ST, US, OL, UL) dengan warna/icon
- **Berat**: Nilai numerik dengan satuan (format: `value.toFixed(2) + unit`)
- **Timestamp**: Waktu pembacaan (dari field `timestamp`)

## Field yang Bisa Digunakan

| Field | Type | Penggunaan |
|-------|------|------------|
| `status` | string | Badge/indicator status timbangan |
| `weight.value` | number | Display nilai berat (bisa di-format) |
| `weight.unit` | string | Satuan berat untuk display |
| `weight.raw` | string | Format asli (untuk debug/logging) |
| `timestamp` | string | Waktu pembacaan (ISO 8601) |
| `time` | string\|null | Waktu dari timbangan (jika tersedia) |
| `date` | string\|null | Tanggal dari timbangan (jika tersedia) |
| `raw` | string | Data mentah (untuk debugging) |
| `error` | string\|undefined | Error message (jika parsing gagal) |

## Catatan Penting

1. **Field Optional**: `time`, `date`, `additionalValue` bisa `null` - selalu cek sebelum digunakan
2. **Error Handling**: Selalu cek `data.error` sebelum render UI
3. **Number Format**: Gunakan `toFixed(2)` untuk konsistensi display angka desimal
4. **Real-time**: Update UI setiap kali menerima data baru dari timbangan
5. **Status**: Mapping status code bisa berbeda per model timbangan - sesuaikan dengan manual

## Integrasi dengan scaleReader.js

Untuk mendapatkan data ini di UI, tambahkan callback di `scaleReader.js` setelah parsing:

```javascript
parser.on('data', (data) => {
  const parsedData = parseScaleData(data);
  
  // Kirim ke UI (pilih metode sesuai kebutuhan):
  // - Event emitter
  // - WebSocket
  // - HTTP API endpoint
  // - File-based communication
  // - State management (React/Vue)
  
  if (!parsedData.error) {
    updateUI(parsedData);
  }
});
```

---

**File referensi lengkap**: Lihat `UI_FORMAT_GUIDE.md` untuk contoh implementasi detail dan helper functions.

