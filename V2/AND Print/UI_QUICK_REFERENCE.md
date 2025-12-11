# Quick Reference: Data Format untuk UI

## 📦 Struktur Data Parsing

```javascript
{
  status: "ST",                    // Status kode
  weight: {
    value: 200.2,                  // Number (desimal)
    unit: "g",                     // "g", "kg", "lb", "oz"
    raw: "+000200.2  g"           // String asli
  },
  time: null,                      // "HH:MM:SS" atau null
  date: null,                      // "DD/MM/YYYY" atau null
  additionalValue: null,           // String atau null
  timestamp: "2025-12-03T04:25:43.530Z",  // ISO 8601
  raw: "ST,+000200.2  g",         // Data mentah
  error: undefined                 // String error (jika ada)
}
```

## 🎨 Formatting Helper Functions

### Format Berat
```javascript
// "200.2 g"
`${data.weight.value} ${data.weight.unit}`

// "200.20 g" (2 desimal)
`${data.weight.value.toFixed(2)} ${data.weight.unit}`

// "+200.2 g" (dengan tanda +)
`${data.weight.value >= 0 ? '+' : ''}${data.weight.value} ${data.weight.unit}`
```

### Format Status
```javascript
const statusMap = {
  'ST': { label: 'Stable', color: 'green' },
  'US': { label: 'Unstable', color: 'yellow' },
  'OL': { label: 'Overload', color: 'red' }
};
```

### Format DateTime
```javascript
// Dari timestamp
new Date(data.timestamp).toLocaleString('id-ID')

// Dari date + time (jika ada)
data.date && data.time ? `${data.date} ${data.time}` : null
```

## ✅ Validasi

```javascript
// Cek data valid
const isValid = !data.error && data.weight?.value !== null;

// Cek berat dalam range
const inRange = data.weight.value >= -1000 && data.weight.value <= 1000;
```

## 🔄 Contoh Event Handler untuk UI

```javascript
// Di scaleReader.js, tambahkan callback
parser.on('data', (data) => {
  const parsedData = parseScaleData(data);
  
  // Emit ke UI (sesuai framework yang digunakan)
  // React: setState() atau event emitter
  // Vue: this.$emit()
  // Vanilla: custom event
  if (!parsedData.error) {
    updateUI(parsedData);
  }
});

function updateUI(data) {
  // Update weight display
  document.getElementById('weight').textContent = 
    `${data.weight.value.toFixed(2)} ${data.weight.unit}`;
  
  // Update status
  document.getElementById('status').textContent = 
    statusMap[data.status]?.label || data.status;
  
  // Update timestamp
  document.getElementById('timestamp').textContent = 
    new Date(data.timestamp).toLocaleString('id-ID');
}
```

## 📋 Field yang Tersedia untuk UI

| Property | Type | Display Contoh |
|----------|------|----------------|
| `status` | string | "ST" → "Stable" |
| `weight.value` | number | 200.2 |
| `weight.unit` | string | "g" |
| `time` | string\|null | "11:06:00" |
| `date` | string\|null | "03/12/2025" |
| `timestamp` | string | "03/12/2025 11:25:43" |
| `raw` | string | Debug info |

## 🎯 Minimal UI Display

```
┌─────────────────────────┐
│  [ST] Stable            │  ← Status badge
│                         │
│     200.20 g            │  ← Weight (besar)
│                         │
│  03/12/2025 11:25:43    │  ← Timestamp
└─────────────────────────┘
```

## 💡 Tips

1. **Format Angka**: Gunakan `toFixed(2)` untuk konsistensi
2. **Error Handling**: Selalu cek `data.error` sebelum render
3. **Null Check**: `time`, `date`, `additionalValue` bisa null
4. **Real-time**: Update UI setiap kali ada data baru
5. **Status Color**: Gunakan warna berbeda per status

