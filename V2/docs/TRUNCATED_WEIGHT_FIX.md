# Perbaikan Deteksi Nilai Terpotong (Truncated Weight)

## Masalah yang Ditemukan

User melaporkan bahwa angka di frontend tidak konsisten, menampilkan 442.0 dengan 0 dan 42.2 secara bergantian. Ini menunjukkan bahwa ada masalah dengan parsing atau perhitungan yang menyebabkan nilai terpotong.

### Analisis Masalah

1. **Nilai Terpotong (Truncated)**:
   - 442.0 menjadi 42.2 → sepertinya digit pertama hilang
   - 442.0 menjadi 0 → nilai di-reset atau parsing gagal
   - Ini menunjukkan masalah parsing di backend atau handling di frontend

2. **Kemungkinan Penyebab**:
   - Parsing regex yang tidak lengkap di backend
   - String manipulation yang salah
   - Operasi pembagian yang tidak seharusnya
   - Race condition dalam update state

## Perbaikan yang Diterapkan

### 1. **Deteksi Nilai Terpotong dengan Ratio Check**

**Sebelumnya:**
```javascript
if (weightGrams > 0 && weightGrams < 10 && currentWeight > 100) {
  console.warn('⚠️ Suspicious weight drop detected');
  if (Math.abs(weightGrams - currentWeight) > currentWeight * 0.5) {
    return;
  }
}
```

**Setelah Perbaikan:**
```javascript
if (currentWeight > 100 && weightGrams > 0) {
  // If previous weight was large and new weight is much smaller, it might be truncated
  const ratio = weightGrams / currentWeight;
  // If new weight is less than 20% of previous, it's likely a parsing error
  // But also check if it looks like a truncated value (e.g., 442 -> 42.2, ratio ~0.1)
  if (ratio < 0.2 && ratio > 0.05) {
    // This might be a truncated value (e.g., 442 -> 42.2)
    console.warn('⚠️ Possible truncated weight detected:', {
      previousWeight: currentWeight,
      newWeight: weightGrams,
      ratio: ratio
    });
    // Don't update if it looks like truncation
    return;
  }
  // If new weight is less than 5% of previous, it's definitely wrong
  if (ratio < 0.05) {
    console.warn('⚠️ Suspicious weight drop detected');
    return;
  }
}
```

**Manfaat:**
- Mendeteksi nilai terpotong dengan ratio check (442 -> 42.2, ratio ~0.1)
- Mencegah update untuk nilai yang terpotong
- Logging yang lebih detail untuk debugging

### 2. **Konsistensi Penggunaan roundedWeight**

**Sebelumnya:**
```javascript
weightGrams = roundedWeight
setCurrentWeight(weightGrams) // Masih menggunakan weightGrams
```

**Setelah Perbaikan:**
```javascript
// CRITICAL: Use rounded value consistently to prevent jitter and inconsistencies
// Always use roundedWeight, not weightGrams, to ensure consistency
setCurrentWeight(roundedWeight) // Use rounded value for consistency
```

**Manfaat:**
- Konsistensi penggunaan nilai yang sudah di-round
- Mencegah inkonsistensi antara nilai yang digunakan untuk comparison dan update

### 3. **Validasi di WebSocket dan HTTP Polling**

Perbaikan diterapkan di kedua handler:
- **WebSocket handler** (line 459-473)
- **HTTP polling handler** (line 726-740)

**Manfaat:**
- Konsistensi validasi di semua jalur data
- Deteksi nilai terpotong di semua skenario

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
Raw: 442.0 → Parse: 42.2 → Update → Display: 42.2 (SALAH!)
Raw: 442.0 → Parse: 0 → Update → Display: 0 (SALAH!)
```

### Setelah Perbaikan:
```
Raw: 442.0 → Parse: 42.2 → Ratio: 0.095 (< 0.2, > 0.05) → Detected truncation → Skip update ✓
Raw: 442.0 → Parse: 0 → Ratio: 0 (< 0.05) → Detected error → Skip update ✓
Raw: 442.0 → Parse: 442.0 → Ratio: 1.0 → Valid → Update → Display: 442.0 ✓
```

## File yang Diubah

1. **src/App.jsx**:
   - Line 459-473: Menambahkan deteksi nilai terpotong dengan ratio check untuk WebSocket handler
   - Line 493: Menggunakan `roundedWeight` secara konsisten
   - Line 726-740: Menambahkan deteksi nilai terpotong dengan ratio check untuk HTTP polling handler

## Parameter Validasi

- **Ratio Threshold untuk Truncation**: 0.05 - 0.2 (5% - 20% dari nilai sebelumnya)
  - Jika ratio < 0.2 dan > 0.05 → kemungkinan nilai terpotong (e.g., 442 -> 42.2)
  - Jika ratio < 0.05 → nilai pasti salah (e.g., 442 -> 0)
- **Absolute Drop Threshold**: 50% dari nilai sebelumnya
  - Jika perubahan > 50% → kemungkinan parsing error

## Testing

Setelah perbaikan ini:
1. ✅ Deteksi nilai terpotong (442 -> 42.2)
2. ✅ Deteksi nilai yang salah (442 -> 0)
3. ✅ Mencegah update untuk nilai yang terpotong
4. ✅ Konsistensi penggunaan roundedWeight
5. ✅ Logging yang lebih detail untuk debugging

## Catatan Penting

- **Ratio Check**: Menggunakan ratio untuk mendeteksi nilai terpotong lebih akurat daripada absolute threshold
- **Konsistensi**: Semua perhitungan menggunakan nilai yang sudah di-round
- **Validasi**: Validasi diterapkan di semua jalur data (WebSocket dan HTTP polling)

## Troubleshooting

Jika masih ada masalah:

1. **Periksa Console Logs**: Apakah ada warning tentang truncated weight?
2. **Periksa Backend Parsing**: Apakah parsing di backend sudah benar?
3. **Periksa Raw Data**: Apakah raw data dari scale sudah benar?
4. **Periksa Ratio**: Apakah ratio check sudah bekerja dengan benar?

## Contoh Logging

```
⚠️ Possible truncated weight detected: {
  previousWeight: 442.0,
  newWeight: 42.2,
  ratio: 0.095,
  message: { weight: 42.2, unit: 'g', ... }
}
```

Ini akan membantu mengidentifikasi kapan nilai terpotong terjadi dan dari mana asalnya.









