# Perbaikan Penurunan Berat Drastis (720g → 9.9g atau 0)

## Masalah yang Ditemukan

User melaporkan bahwa angka di frontend berubah drastis dari 720g menjadi 9.9g atau bahkan 0. Ini menunjukkan ada masalah dengan:
1. Validasi yang terlalu agresif yang memblokir nilai valid
2. Parsing error di backend yang menyebabkan nilai salah
3. Multiple handlers yang mungkin update secara bersamaan

### Analisis Masalah

Masalah ini disebabkan oleh **validasi yang terlalu agresif** di frontend:

1. **Threshold Terlalu Ketat**:
   - Threshold 5% terlalu ketat untuk blocking
   - 720g → 9.9g: ratio = 9.9/720 = 0.01375 (< 0.05), jadi akan di-block
   - Tapi jika backend benar-benar mengirim 9.9g (misalnya karena parsing error), validasi ini benar
   - Tapi jika backend mengirim 720g tapi frontend menerima 9.9g, itu berarti ada masalah di backend parsing

2. **Truncation Detection Terlalu Agresif**:
   - Threshold 5-20% untuk truncation detection terlalu luas
   - Bisa memblokir nilai valid yang sebenarnya dari backend

3. **Small Value Check Terlalu Ketat**:
   - Threshold < 10g terlalu ketat
   - Bisa memblokir nilai valid yang kecil

## Perbaikan yang Diterapkan

### 1. **Lower Threshold untuk Blocking**

**Sebelumnya:**
```javascript
// If new weight is less than 5% of previous, it's definitely wrong
if (ratio < 0.05) {
  console.warn('⚠️ Suspicious weight drop detected');
  return;
}
```

**Setelah Perbaikan:**
```javascript
// If new weight is less than 2% of previous, it's definitely wrong (parsing error)
// Lower threshold from 5% to 2% to allow more legitimate weight changes
if (ratio < 0.02) {
  console.error('❌ CRITICAL: Suspicious weight drop detected (likely parsing error):', {
    previousWeight: currentWeight,
    newWeight: weightGrams,
    ratio: ratio.toFixed(4),
    rawMessage: message.raw || message
  });
  return;
}
```

**Manfaat:**
- Threshold lebih rendah (2% dari 5%) untuk blocking
- Hanya block jika benar-benar suspicious (ratio < 0.02)
- Logging yang lebih detail untuk debugging

### 2. **More Lenient Truncation Detection**

**Sebelumnya:**
```javascript
// If new weight is less than 20% of previous, it's likely a parsing error
// But also check if it looks like a truncated value (e.g., 442 -> 42.2, ratio ~0.1)
if (ratio < 0.2 && ratio > 0.05) {
  // This might be a truncated value
  return;
}
```

**Setelah Perbaikan:**
```javascript
// If new weight is between 2% and 10% of previous, it might be truncated
// But be more lenient - only block if it's clearly a truncation pattern
if (ratio < 0.10 && ratio >= 0.02) {
  // Check if it looks like a truncation pattern (e.g., 720 -> 9.9, ratio ~0.014)
  // But also check if the new weight is suspiciously small (e.g., < 20g when previous was > 100g)
  if (weightGrams < 20 && currentWeight > 100) {
    console.warn('⚠️ Possible truncated weight detected');
    return;
  }
  // Otherwise, allow the update (might be legitimate weight change)
}
```

**Manfaat:**
- Threshold lebih sempit (2-10% dari 5-20%)
- Hanya block jika weightGrams < 20g DAN currentWeight > 100g
- Lebih lenient untuk nilai yang mungkin valid

### 3. **Lower Threshold untuk Small Value Check**

**Sebelumnya:**
```javascript
// Check for suspiciously small values when we expect larger ones
if (weightGrams > 0 && weightGrams < 10 && currentWeight > 100) {
  // Block update
}
```

**Setelah Perbaikan:**
```javascript
// Check for suspiciously small values when we expect larger ones
// CRITICAL: Only block if weight is very small (< 5g) when previous was large (> 100g)
// This prevents blocking legitimate small weights
if (weightGrams > 0 && weightGrams < 5 && currentWeight > 100) {
  // Only block if drop is > 90% (very suspicious)
  if (Math.abs(weightGrams - currentWeight) > currentWeight * 0.9) {
    return;
  }
}
```

**Manfaat:**
- Threshold lebih rendah (< 5g dari < 10g)
- Hanya block jika drop > 90% (sangat suspicious)
- Mencegah blocking nilai kecil yang valid

### 4. **Enhanced Logging untuk Debugging**

**Sebelumnya:**
```javascript
console.warn('⚠️ Suspicious weight drop detected');
```

**Setelah Perbaikan:**
```javascript
console.log('🔍 Weight validation check:', {
  previousWeight: currentWeight,
  newWeight: weightGrams,
  ratio: ratio.toFixed(4),
  rawMessage: message.raw || message,
  unit: message.unit || 'g'
});
```

**Manfaat:**
- Logging yang lebih detail untuk debugging
- Menampilkan raw message untuk melihat data asli
- Membantu mengidentifikasi masalah parsing

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
Backend: 720g → Frontend: 720g
Backend: 9.9g (parsing error) → Frontend: 720g (blocked, ratio: 0.01375 < 0.05) ✓
Backend: 720g → Frontend: 720g
Backend: 0g (parsing error) → Frontend: 720g (blocked, ratio: 0 < 0.05) ✓
```

### Setelah Perbaikan:
```
Backend: 720g → Frontend: 720g
Backend: 9.9g (parsing error) → Frontend: 720g (blocked, ratio: 0.01375 < 0.02) ✓
Backend: 720g → Frontend: 720g
Backend: 0g (parsing error) → Frontend: 720g (blocked, ratio: 0 < 0.02) ✓
Backend: 50g (legitimate) → Frontend: 50g (allowed, ratio: 0.069 > 0.02) ✓
```

## File yang Diubah

1. **src/App.jsx**:
   - Line 469-514: Mengubah validasi untuk WebSocket handler
     - Threshold blocking: 5% → 2%
     - Threshold truncation: 5-20% → 2-10% dengan kondisi tambahan
     - Threshold small value: < 10g → < 5g dengan drop > 90%
   - Line 743-788: Mengubah validasi untuk HTTP polling handler (sama)

## Parameter

- **Threshold untuk Blocking**: 2% (dari 5%)
- **Threshold untuk Truncation Detection**: 2-10% dengan kondisi weightGrams < 20g
- **Threshold untuk Small Value Check**: < 5g dengan drop > 90%
- **Enhanced Logging**: Menampilkan raw message dan ratio untuk debugging

## Testing

Setelah perbaikan ini:
1. ✅ Validasi lebih lenient untuk nilai yang mungkin valid
2. ✅ Hanya block jika benar-benar suspicious (ratio < 2%)
3. ✅ Logging yang lebih detail untuk debugging
4. ✅ Mencegah blocking nilai valid yang sebenarnya dari backend

## Catatan Penting

- **Lower Threshold**: Threshold lebih rendah untuk blocking (2% dari 5%)
- **More Lenient**: Validasi lebih lenient untuk nilai yang mungkin valid
- **Enhanced Logging**: Logging yang lebih detail untuk debugging parsing errors
- **Backend Parsing**: Jika masalah masih terjadi, periksa parsing di backend (server.js)

## Troubleshooting

Jika masih ada masalah:

1. **Periksa Console Logs**: Apakah ada error tentang parsing?
2. **Periksa Raw Message**: Apakah raw message menunjukkan nilai yang benar?
3. **Periksa Backend Parsing**: Apakah parsing di backend sudah benar?
4. **Periksa Ratio**: Apakah ratio menunjukkan nilai yang reasonable?

## Contoh Skenario

### Skenario 1: Parsing Error (720 → 9.9)
```
Backend: 720g → Frontend: 720g ✓
Backend: 9.9g (parsing error) → Ratio: 0.01375 < 0.02 → Blocked ✓
Backend: 720g → Frontend: 720g ✓
```

### Skenario 2: Legitimate Weight Change (720 → 50)
```
Backend: 720g → Frontend: 720g ✓
Backend: 50g (legitimate) → Ratio: 0.069 > 0.02 → Allowed ✓
Frontend: 50g ✓
```

### Skenario 3: Very Small Weight (720 → 15)
```
Backend: 720g → Frontend: 720g ✓
Backend: 15g → Ratio: 0.021 > 0.02, but weightGrams < 20g → Check truncation
→ weightGrams (15) < 20g AND currentWeight (720) > 100g → Blocked ✓
```









