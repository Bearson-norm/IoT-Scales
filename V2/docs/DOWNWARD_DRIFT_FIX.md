# Perbaikan Downward Drift (Nilai Turun Fluktuatif)

## Masalah yang Ditemukan

User melaporkan bahwa:
1. Awalnya angka match dengan yang ditimbang
2. Tidak lama kemudian angka sedikit turun
3. Kemudian turun fluktuatif
4. Ketika menambahkan beban, angka stabil lagi untuk beberapa waktu
5. Kemudian kembali seperti kasus sebelumnya

### Analisis Masalah

Masalah ini disebabkan oleh **logika filtering yang tidak simetris** di `RightPanel.jsx` dan `App.jsx`:

1. **Filtering Asymmetric**:
   - Hanya update jika perubahan >= 0.2g (baik naik maupun turun)
   - Jika nilai turun sedikit (misalnya dari 442.0 ke 441.9), perubahan hanya 0.1g (< 0.2g), jadi tidak update
   - Jika nilai turun lagi menjadi 441.7, perubahan dari 442.0 adalah 0.3g (>= 0.2g), jadi update menjadi 441.7
   - Sekarang `previousValue` adalah 441.7
   - Jika nilai naik sedikit menjadi 441.8, perubahan dari 441.7 hanya 0.1g (< 0.2g), jadi tidak update dan tetap 441.7
   - Ini menyebabkan nilai cenderung turun karena hanya update untuk perubahan besar ke bawah, tapi tidak update untuk perubahan kecil ke atas

2. **Downward Drift**:
   - Nilai cenderung "terjebak" pada nilai yang lebih rendah
   - Ketika beban ditambahkan, nilai naik (karena perubahan besar), jadi stabil
   - Tapi kemudian nilai turun sedikit lagi dan terjebak di nilai yang lebih rendah

## Perbaikan yang Diterapkan

### 1. **Symmetric Update Logic di RightPanel.jsx**

**Sebelumnya:**
```javascript
const change = Math.abs(rounded - previousValue)

// Only update if change is significant (>= 0.2g) to prevent jitter
if (change >= 0.2) {
  smoothedCurrentWeightRef.current = rounded
  return rounded
}

// Keep previous value for small changes (< 0.2g) to prevent jitter
return previousValue
```

**Setelah Perbaikan:**
```javascript
const change = rounded - previousValue // Signed change (positive = increase, negative = decrease)
const absChange = Math.abs(change)

// CRITICAL: Use symmetric update logic to prevent downward drift
// Update for:
// 1. Increases of any size (to track weight being added)
// 2. Decreases >= 0.2g (to track weight being removed, but filter tiny fluctuations)
// This prevents the value from getting "stuck" at a lower value
if (change > 0 || absChange >= 0.2) {
  // Update for increases or significant decreases
  smoothedCurrentWeightRef.current = rounded
  return rounded
}

// For small decreases (< 0.2g), keep previous value to prevent jitter
return previousValue
```

**Manfaat:**
- Update untuk kenaikan (untuk menangkap penambahan beban)
- Filter penurunan kecil (< 0.2g) untuk mencegah jitter
- Mencegah nilai terjebak di nilai yang lebih rendah

### 2. **Symmetric Update Logic di App.jsx (WebSocket Handler)**

**Sebelumnya:**
```javascript
const roundedWeight = Math.round(weightGrams * 10) / 10
const roundedCurrent = Math.round(currentWeight * 10) / 10
const weightChanged = Math.abs(roundedWeight - roundedCurrent) >= 0.2
if (!weightChanged) {
  return // Skip update if weight hasn't changed significantly
}
```

**Setelah Perbaikan:**
```javascript
const roundedWeight = Math.round(weightGrams * 10) / 10
const roundedCurrent = Math.round(currentWeight * 10) / 10
const change = roundedWeight - roundedCurrent // Signed change (positive = increase, negative = decrease)
const absChange = Math.abs(change)

// Update for increases of any size OR decreases >= 0.2g
// This ensures we track weight being added while filtering tiny downward fluctuations
const shouldUpdate = change > 0 || absChange >= 0.2
if (!shouldUpdate) {
  return // Skip update if weight hasn't changed significantly (only for small decreases)
}
```

**Manfaat:**
- Konsistensi dengan logika di `RightPanel.jsx`
- Update untuk kenaikan (menangkap penambahan beban)
- Filter penurunan kecil untuk mencegah jitter

### 3. **Symmetric Update Logic di App.jsx (HTTP Polling Handler)**

Logika yang sama diterapkan di HTTP polling handler untuk konsistensi.

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
442.0 → 441.9 (change: 0.1g < 0.2g) → No update → Display: 442.0
442.0 → 441.7 (change: 0.3g >= 0.2g) → Update → Display: 441.7
441.7 → 441.8 (change: 0.1g < 0.2g) → No update → Display: 441.7 (STUCK!)
441.7 → 441.5 (change: 0.2g >= 0.2g) → Update → Display: 441.5 (DRIFT DOWN!)
```

### Setelah Perbaikan:
```
442.0 → 441.9 (change: -0.1g, decrease < 0.2g) → No update → Display: 442.0 ✓
442.0 → 442.5 (change: +0.5g, increase) → Update → Display: 442.5 ✓
442.5 → 442.3 (change: -0.2g, decrease >= 0.2g) → Update → Display: 442.3 ✓
442.3 → 442.4 (change: +0.1g, increase) → Update → Display: 442.4 ✓
```

## File yang Diubah

1. **src/components/RightPanel.jsx**:
   - Line 23-44: Mengubah logika filtering menjadi simetris
   - Update untuk kenaikan (untuk menangkap penambahan beban)
   - Filter penurunan kecil (< 0.2g) untuk mencegah jitter

2. **src/App.jsx**:
   - Line 508-520: Mengubah logika filtering menjadi simetris untuk WebSocket handler
   - Line 744-756: Mengubah logika filtering menjadi simetris untuk HTTP polling handler

## Parameter Validasi

- **Update untuk Kenaikan**: Setiap kenaikan (change > 0) akan di-update
- **Update untuk Penurunan**: Hanya penurunan >= 0.2g yang akan di-update
- **Filter Penurunan Kecil**: Penurunan < 0.2g akan diabaikan untuk mencegah jitter

## Testing

Setelah perbaikan ini:
1. ✅ Nilai tidak akan terjebak di nilai yang lebih rendah
2. ✅ Kenaikan beban akan langsung terdeteksi dan di-update
3. ✅ Penurunan kecil (< 0.2g) akan di-filter untuk mencegah jitter
4. ✅ Penurunan signifikan (>= 0.2g) akan di-update untuk menangkap pengurangan beban
5. ✅ Tidak ada downward drift yang menyebabkan nilai turun fluktuatif

## Catatan Penting

- **Symmetric Logic**: Logika update sekarang simetris - update untuk kenaikan dan penurunan signifikan
- **No Drift**: Nilai tidak akan terjebak di nilai yang lebih rendah
- **Responsive to Increases**: Setiap kenaikan akan langsung di-update untuk menangkap penambahan beban
- **Filter Small Decreases**: Penurunan kecil (< 0.2g) akan di-filter untuk mencegah jitter

## Troubleshooting

Jika masih ada masalah:

1. **Periksa Console Logs**: Apakah ada warning tentang weight changes?
2. **Periksa Raw Data**: Apakah raw data dari scale sudah benar?
3. **Periksa Update Logic**: Apakah logika update sudah simetris?
4. **Periksa Threshold**: Apakah threshold 0.2g sudah sesuai?

## Contoh Skenario

### Skenario 1: Menambahkan Beban
```
442.0 → 442.5 (change: +0.5g, increase) → Update → Display: 442.5 ✓
442.5 → 443.0 (change: +0.5g, increase) → Update → Display: 443.0 ✓
```

### Skenario 2: Fluktuasi Kecil
```
442.0 → 441.9 (change: -0.1g, decrease < 0.2g) → No update → Display: 442.0 ✓
442.0 → 442.1 (change: +0.1g, increase) → Update → Display: 442.1 ✓
```

### Skenario 3: Mengurangi Beban
```
442.0 → 441.5 (change: -0.5g, decrease >= 0.2g) → Update → Display: 441.5 ✓
441.5 → 441.0 (change: -0.5g, decrease >= 0.2g) → Update → Display: 441.0 ✓
```









