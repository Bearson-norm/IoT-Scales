# Formatting Data Parsing untuk UI

## Struktur Data yang Dihasilkan

Setelah parsing, program menghasilkan object dengan struktur berikut:

### Format Sederhana (yang Anda gunakan)
```javascript
{
  raw: "ST,+000200.2  g",
  status: "ST",
  weight: {
    value: 200.2,        // Angka desimal (number)
    unit: "g",           // Satuan: "g", "kg", "lb", "oz"
    raw: "+000200.2  g"  // String asli dari timbangan
  },
  time: null,            // null jika tidak ada
  date: null,            // null jika tidak ada
  additionalValue: null, // null jika tidak ada
  timestamp: "2025-12-03T04:25:43.530Z" // ISO 8601 format
}
```

### Format Lengkap (jika timbangan mengirim waktu/tanggal)
```javascript
{
  raw: "ST,-000000.8  g,11:06:00,03/12/2025,36",
  status: "ST",
  weight: {
    value: -0.8,
    unit: "g",
    raw: "-000000.8  g"
  },
  time: "11:06:00",      // Format: HH:MM:SS
  date: "03/12/2025",    // Format: DD/MM/YYYY
  additionalValue: "36",
  timestamp: "2025-12-03T04:25:43.530Z"
}
```

## Contoh Formatting untuk UI

### 1. Format Berat untuk Display
```javascript
// Format: "200.2 g" atau "-0.8 g"
const formatWeight = (parsedData) => {
  return `${parsedData.weight.value} ${parsedData.weight.unit}`;
};

// Format dengan padding angka (contoh: "200.20 g")
const formatWeightFixed = (parsedData, decimals = 2) => {
  return `${parsedData.weight.value.toFixed(decimals)} ${parsedData.weight.unit}`;
};

// Format dengan tanda + untuk nilai positif
const formatWeightSigned = (parsedData) => {
  const sign = parsedData.weight.value >= 0 ? '+' : '';
  return `${sign}${parsedData.weight.value} ${parsedData.weight.unit}`;
};
```

### 2. Format Tanggal dan Waktu
```javascript
// Format tanggal Indonesia (jika date tersedia)
const formatDateID = (parsedData) => {
  if (!parsedData.date) return null;
  const [day, month, year] = parsedData.date.split('/');
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${day} ${months[parseInt(month) - 1]} ${year}`;
};

// Format waktu (jika time tersedia)
const formatTime = (parsedData) => {
  return parsedData.time || null;
};

// Format timestamp untuk display
const formatTimestamp = (parsedData) => {
  const date = new Date(parsedData.timestamp);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
```

### 3. Status Badge/Indicator
```javascript
// Status code mapping (sesuaikan dengan manual timbangan)
const getStatusLabel = (status) => {
  const statusMap = {
    'ST': 'Stable',
    'US': 'Unstable',
    'OL': 'Overload',
    'UL': 'Underload',
    // Tambahkan status lainnya sesuai manual timbangan
  };
  return statusMap[status] || status;
};

// Status dengan warna untuk UI
const getStatusColor = (status) => {
  const colorMap = {
    'ST': 'green',    // Stable = hijau
    'US': 'yellow',   // Unstable = kuning
    'OL': 'red',      // Overload = merah
    'UL': 'orange',   // Underload = orange
  };
  return colorMap[status] || 'gray';
};
```

### 4. Validasi Data
```javascript
// Cek apakah data valid
const isValidData = (parsedData) => {
  return !parsedData.error && 
         parsedData.weight !== null && 
         parsedData.weight.value !== null;
};

// Cek apakah berat dalam range normal (contoh: -1000g sampai 1000g)
const isWeightInRange = (parsedData, min = -1000, max = 1000) => {
  if (!isValidData(parsedData)) return false;
  return parsedData.weight.value >= min && parsedData.weight.value <= max;
};
```

## Contoh Implementasi UI (React/HTML)

### React Component Contoh
```jsx
function ScaleDisplay({ parsedData }) {
  if (!parsedData || parsedData.error) {
    return <div className="error">Error: {parsedData?.error}</div>;
  }

  return (
    <div className="scale-display">
      {/* Status Badge */}
      <div className={`status-badge status-${getStatusColor(parsedData.status)}`}>
        {getStatusLabel(parsedData.status)}
      </div>

      {/* Berat Display - Besar */}
      <div className="weight-display">
        <span className="weight-value">
          {parsedData.weight.value.toFixed(2)}
        </span>
        <span className="weight-unit">{parsedData.weight.unit}</span>
      </div>

      {/* Tanggal & Waktu */}
      {parsedData.date && (
        <div className="date-time">
          <span>{formatDateID(parsedData)}</span>
          {parsedData.time && <span> | {parsedData.time}</span>}
        </div>
      )}

      {/* Timestamp */}
      <div className="timestamp">
        Dibaca: {formatTimestamp(parsedData)}
      </div>
    </div>
  );
}
```

### HTML/CSS Contoh
```html
<div class="scale-card">
  <div class="status-badge status-stable">STABLE</div>
  <div class="weight-display">
    <span class="weight-value">200.20</span>
    <span class="weight-unit">g</span>
  </div>
  <div class="timestamp">2025-12-03 11:25:43</div>
</div>
```

```css
.scale-card {
  padding: 20px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.weight-display {
  font-size: 48px;
  font-weight: bold;
  margin: 20px 0;
}

.weight-value {
  color: #333;
}

.weight-unit {
  color: #666;
  font-size: 0.6em;
  margin-left: 8px;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status-stable { background: #4caf50; color: white; }
.status-unstable { background: #ff9800; color: white; }
.status-overload { background: #f44336; color: white; }
```

## Struktur Data JSON untuk API

```json
{
  "status": "ST",
  "weight": {
    "value": 200.2,
    "unit": "g",
    "raw": "+000200.2  g"
  },
  "time": null,
  "date": null,
  "additionalValue": null,
  "timestamp": "2025-12-03T04:25:43.530Z",
  "raw": "ST,+000200.2  g"
}
```

## Helper Functions Lengkap

```javascript
// File: uiHelpers.js

export const formatWeight = (parsedData, options = {}) => {
  const { decimals = 2, showSign = false, unit = null } = options;
  const value = parsedData.weight.value.toFixed(decimals);
  const sign = showSign && parsedData.weight.value >= 0 ? '+' : '';
  const displayUnit = unit || parsedData.weight.unit;
  return `${sign}${value} ${displayUnit}`;
};

export const formatDateTime = (parsedData, locale = 'id-ID') => {
  if (parsedData.date && parsedData.time) {
    return `${parsedData.date} ${parsedData.time}`;
  }
  if (parsedData.timestamp) {
    return new Date(parsedData.timestamp).toLocaleString(locale);
  }
  return null;
};

export const getStatusInfo = (status) => {
  const statusMap = {
    'ST': { label: 'Stable', color: 'green', icon: '✓' },
    'US': { label: 'Unstable', color: 'yellow', icon: '⚠' },
    'OL': { label: 'Overload', color: 'red', icon: '✗' },
    'UL': { label: 'Underload', color: 'orange', icon: '↓' },
  };
  return statusMap[status] || { label: status, color: 'gray', icon: '?' };
};

export const isValidScaleData = (data) => {
  return data && 
         !data.error && 
         data.weight && 
         typeof data.weight.value === 'number' &&
         !isNaN(data.weight.value);
};
```

## Ringkasan Field untuk UI

| Field | Type | Keterangan | Contoh |
|-------|------|------------|--------|
| `status` | string | Status kode timbangan | "ST" |
| `weight.value` | number | Nilai berat (desimal) | 200.2 |
| `weight.unit` | string | Satuan berat | "g", "kg" |
| `weight.raw` | string | String berat asli | "+000200.2  g" |
| `time` | string \| null | Waktu (jika ada) | "11:06:00" |
| `date` | string \| null | Tanggal (jika ada) | "03/12/2025" |
| `additionalValue` | string \| null | Nilai tambahan | "36" |
| `timestamp` | string | ISO 8601 timestamp | "2025-12-03T04:25:43.530Z" |
| `raw` | string | Data mentah dari timbangan | "ST,+000200.2  g" |
| `error` | string \| undefined | Pesan error (jika ada) | "Format tidak valid" |

## Tips Implementasi UI

1. **Real-time Update**: Update UI setiap kali menerima data baru
2. **Format Number**: Gunakan `toFixed()` untuk konsistensi angka desimal
3. **Error Handling**: Selalu cek `error` field sebelum render
4. **Timestamp**: Gunakan `timestamp` untuk sorting/filtering data historis
5. **Status Indicator**: Gunakan warna/icon berbeda untuk setiap status
6. **Responsive**: Pastikan tampilan responsive untuk mobile

