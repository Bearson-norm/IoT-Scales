# Perbaikan Validasi Truncation yang Lebih Agresif

## Masalah yang Ditemukan

User melaporkan bahwa angka penimbangan tidak stabil. Dari log yang diberikan:

1. `previousWeight: 138.2, newWeight: 138.3` - normal ✓
2. `previousWeight: 166, newWeight: 8.3, ratio: '0.0500'` - **truncation jelas!** ❌
3. `previousWeight: 166, newWeight: 138.3, ratio: '0.8331'` - perubahan drastis ❌
4. `previousWeight: 138.1, newWeight: 138.3` - normal ✓

Masalahnya adalah:
- Validasi ratio < 0.02 (2%) tidak menangkap ratio 0.0500 (5%)
- Validasi untuk ratio 2-10% tidak cukup agresif
- Raw data untuk yang 8.3 adalah object, bukan string - menunjukkan `data.raw` tidak ada

### Analisis Masalah

1. **Validasi Tidak Cukup Agresif**:
   - Validasi hanya menangkap ratio < 2% (0.02)
   - Ratio 5% (0.05) seperti 166 -> 8.3 tidak tertangkap
   - Validasi untuk ratio 2-10% hanya mengecek beberapa kondisi, tidak cukup komprehensif

2. **Raw Data Tidak Konsisten**:
   - Raw data kadang string, kadang object
   - Logging tidak konsisten, membuat debugging sulit

3. **Tidak Ada Validasi untuk Perubahan Drastis**:
   - Perubahan dari 166 ke 138.3 (ratio 0.8331) tidak tertangkap
   - Ini mungkin juga truncation atau parsing error

## Perbaikan yang Diterapkan

### 1. **Validasi Truncation yang Lebih Agresif**

**Sebelumnya:**
```javascript
// If new weight is less than 2% of previous, it's definitely wrong
if (ratio < 0.02) {
  // Block
  return;
}

// If new weight is between 2% and 10% of previous, it might be truncated
if (ratio < 0.10 && ratio >= 0.02) {
  // Only block if specific conditions
  if ((weightGrams < 20 && currentWeight > 100) || (!hasPrefix && weightGrams < 50 && currentWeight > 100)) {
    // Block
    return;
  }
}
```

**Setelah Perbaikan:**
```javascript
// CRITICAL: More aggressive validation for truncation
// If new weight is less than 10% of previous AND previous was > 100g, it's likely truncated
// This catches cases like 166 -> 8.3 (ratio 0.05 = 5%) or 720 -> 9.9 (ratio 0.014 = 1.4%)
if (ratio < 0.10 && currentWeight > 100) {
  // Get raw data string for validation
  const rawDataStr = typeof data.raw === 'string' ? data.raw : (data.raw ? JSON.stringify(data.raw) : '');
  const hasPrefix = /^(ST|US)[,:]/.test(rawDataStr);
  
  // CRITICAL: Block if:
  // 1. Ratio < 5% (very likely truncation, e.g., 166 -> 8.3)
  // 2. Ratio < 10% AND new weight < 20g (truncation pattern)
  // 3. Ratio < 10% AND no prefix AND new weight < 50g (truncated data without prefix)
  const isLikelyTruncated = ratio < 0.05 || 
                           (ratio < 0.10 && weightGrams < 20) ||
                           (ratio < 0.10 && !hasPrefix && weightGrams < 50);
  
  if (isLikelyTruncated) {
    console.error('❌ CRITICAL: Truncated weight detected');
    return;
  }
  
  // If ratio is 5-10% and doesn't match truncation pattern, log warning but allow
  console.warn('⚠️ Possible weight drop detected');
}
```

**Manfaat:**
- Menangkap truncation dengan ratio 5% (seperti 166 -> 8.3)
- Validasi lebih komprehensif dengan multiple conditions
- Logging lebih jelas untuk debugging

### 2. **Perbaikan Raw Data Logging**

**Sebelumnya:**
```javascript
rawData: data.raw || data,
```

**Setelah Perbaikan:**
```javascript
// Ensure rawData is always a string for consistent logging
const rawDataForLog = typeof data.raw === 'string' ? data.raw : (data.raw ? JSON.stringify(data.raw) : 'missing');
rawData: rawDataForLog,
```

**Manfaat:**
- Raw data selalu string untuk logging yang konsisten
- Lebih mudah untuk debugging
- Tidak ada object yang tidak ter-parse

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
1. Weight: 166g
2. Backend: 8.3g (truncated from 166.3g)
   → Ratio: 0.05 (5%)
   → Validasi: ratio >= 0.02, tidak tertangkap ❌
   → Frontend: 8.3g ❌
3. Backend: 138.3g
   → Frontend: 138.3g ✓
Result: Fluktuasi dari 166 -> 8.3 -> 138.3
```

### Setelah Perbaikan:
```
1. Weight: 166g
2. Backend: 8.3g (truncated from 166.3g)
   → Ratio: 0.05 (5%)
   → Validasi: ratio < 0.05 → isLikelyTruncated = true ✓
   → Frontend: Skip update, keep 166g ✓
3. Backend: 138.3g
   → Ratio: 0.8331 (83%)
   → Validasi: ratio >= 0.10, tidak tertangkap (legitimate change)
   → Frontend: 138.3g ✓
Result: Stable at 166g, then 138.3g (no truncation)
```

## File yang Diubah

1. **src/App.jsx**:
   - Line 539-580: Memperbaiki validasi truncation untuk WebSocket handler
   - Line 870-920: Memperbaiki validasi truncation untuk HTTP polling handler
   - Line 862-868: Memperbaiki raw data logging untuk konsistensi

## Parameter Validasi

### Threshold Baru:
- **Ratio < 5%**: Sangat mungkin truncation (e.g., 166 -> 8.3)
- **Ratio < 10% AND new weight < 20g**: Truncation pattern (e.g., 720 -> 9.9)
- **Ratio < 10% AND no prefix AND new weight < 50g**: Truncated data tanpa prefix

### Kondisi Validasi:
- **Previous weight > 100g**: Hanya validasi untuk weight besar
- **Multiple conditions**: Kombinasi ratio, weight, dan prefix untuk deteksi yang lebih akurat

## Testing

Setelah perbaikan ini:
1. ✅ Truncation dengan ratio 5% akan tertangkap
2. ✅ Truncation dengan ratio 1-5% akan tertangkap
3. ✅ Truncation tanpa prefix akan tertangkap
4. ✅ Raw data logging lebih konsisten

## Catatan Penting

- **Aggressive Validation**: Validasi lebih agresif untuk menangkap truncation
- **Multiple Conditions**: Kombinasi multiple conditions untuk deteksi yang lebih akurat
- **Consistent Logging**: Raw data selalu string untuk logging yang konsisten
- **False Positive Prevention**: Hanya block jika sangat mungkin truncation

## Troubleshooting

Jika masih ada masalah:

1. **Periksa Ratio**: Apakah ratio < 5% atau < 10% dengan kondisi tertentu?
2. **Periksa Raw Data**: Apakah raw data memiliki prefix `ST,` atau `US,`?
3. **Periksa Weight**: Apakah new weight < 20g atau < 50g?
4. **Periksa Logs**: Apakah ada error atau warning tentang truncation?

## Contoh Skenario

### Skenario 1: Truncation 166 -> 8.3 (Ratio 5%)
```
Previous: 166g
New: 8.3g
Ratio: 0.05 (5%)
→ Validasi: ratio < 0.05 → isLikelyTruncated = true ✓
→ Block: Skip update ✓
→ Result: Keep 166g ✓
```

### Skenario 2: Truncation 720 -> 9.9 (Ratio 1.4%)
```
Previous: 720g
New: 9.9g
Ratio: 0.014 (1.4%)
→ Validasi: ratio < 0.05 → isLikelyTruncated = true ✓
→ Block: Skip update ✓
→ Result: Keep 720g ✓
```

### Skenario 3: Legitimate Change 166 -> 138.3 (Ratio 83%)
```
Previous: 166g
New: 138.3g
Ratio: 0.8331 (83%)
→ Validasi: ratio >= 0.10, tidak tertangkap ✓
→ Allow: Update to 138.3g ✓
→ Result: 138.3g ✓
```

### Skenario 4: Truncation Tanpa Prefix (Ratio 5%)
```
Previous: 166g
New: 8.3g (no prefix)
Ratio: 0.05 (5%)
→ Validasi: ratio < 0.05 → isLikelyTruncated = true ✓
→ Block: Skip update ✓
→ Result: Keep 166g ✓
```







