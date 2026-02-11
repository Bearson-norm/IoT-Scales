# Perbaikan Jitter dengan Rounding dan Threshold

## Masalah yang Ditemukan

User melaporkan jittering angka penimbangan di frontend, padahal raw data dari mesin timbangan stabil (diverifikasi di RSCOM dan RealTerm). Ini menunjukkan masalah ada di handling dan formula perhitungan di frontend.

### Analisis Masalah

1. **Floating Point Precision Issues**:
   - Nilai seperti 170.05, 170.03, 170.07 dari scale akan menyebabkan update terus menerus
   - `toFixed(1)` akan menampilkan 170.0, 170.0, 170.1 yang berbeda
   - Ini menyebabkan visual jitter meskipun nilai sebenarnya stabil

2. **Threshold Terlalu Kecil**:
   - Threshold 0.05g terlalu kecil untuk mencegah jitter
   - Perubahan kecil (0.05-0.1g) masih memicu update dan re-render

3. **Filtering yang Tidak Efektif**:
   - Filtering dengan threshold 0.1g masih memungkinkan jitter
   - Perlu threshold yang lebih besar dan rounding yang konsisten

## Perbaikan yang Diterapkan

### 1. **Rounding ke 0.1g Precision**

**Sebelumnya:**
```javascript
const currentReading = useMemo(() => {
  if (isWeighingActive && rawCurrentWeight > 0) {
    const previousValue = smoothedCurrentWeightRef.current || rawCurrentWeight
    const change = Math.abs(rawCurrentWeight - previousValue)
    
    if (change < 0.1) {
      return previousValue
    }
    
    smoothedCurrentWeightRef.current = rawCurrentWeight
    return rawCurrentWeight
  }
}, [rawCurrentWeight, isWeighingActive])
```

**Setelah Perbaikan:**
```javascript
const currentReading = useMemo(() => {
  if (isWeighingActive && rawCurrentWeight > 0) {
    // Round to 0.1g precision to prevent jitter from floating point precision issues
    // This ensures that values like 170.05 and 170.03 both display as 170.0
    const rounded = Math.round(rawCurrentWeight * 10) / 10
    const previousValue = smoothedCurrentWeightRef.current || rounded
    const change = Math.abs(rounded - previousValue)
    
    // Only update if change is significant (>= 0.2g) to prevent jitter
    if (change >= 0.2) {
      smoothedCurrentWeightRef.current = rounded
      return rounded
    }
    
    // Keep previous value for small changes (< 0.2g) to prevent jitter
    return previousValue
  }
}, [rawCurrentWeight, isWeighingActive])
```

**Manfaat:**
- Nilai seperti 170.05, 170.03, 170.07 semua menjadi 170.0 atau 170.1
- Tidak ada jitter dari floating point precision
- Display stabil dan konsisten

### 2. **Threshold Update 0.2g**

**Sebelumnya:**
```javascript
const weightChanged = Math.abs(weightGrams - currentWeight) >= 0.05
```

**Setelah Perbaikan:**
```javascript
// Round to 0.1g precision and only update if change is significant (>= 0.2g)
const roundedWeight = Math.round(weightGrams * 10) / 10
const roundedCurrent = Math.round(currentWeight * 10) / 10
const weightChanged = Math.abs(roundedWeight - roundedCurrent) >= 0.2
```

**Manfaat:**
- Hanya update jika perubahan >= 0.2g
- Mencegah update untuk perubahan kecil yang tidak signifikan
- Mengurangi re-render yang tidak perlu

### 3. **Konsistensi Rounding di Semua Tempat**

**Sebelumnya:**
```javascript
setCurrentWeight(weightGrams)
// ... calculations using weightGrams
currentWeight: weightGrams
```

**Setelah Perbaikan:**
```javascript
const roundedWeight = Math.round(weightGrams * 10) / 10
setCurrentWeight(roundedWeight)
// ... calculations using roundedWeight
currentWeight: roundedWeight
```

**Manfaat:**
- Semua perhitungan menggunakan nilai yang sudah di-round
- Konsistensi di seluruh aplikasi
- Tidak ada perbedaan antara display dan calculation

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
Raw: 170.05 → Display: 170.1 → Update
Raw: 170.03 → Display: 170.0 → Update (jitter!)
Raw: 170.07 → Display: 170.1 → Update (jitter!)
```

### Setelah Perbaikan:
```
Raw: 170.05 → Round: 170.0 → Change: 0.0g (< 0.2g) → Keep previous → No update ✓
Raw: 170.03 → Round: 170.0 → Change: 0.0g (< 0.2g) → Keep previous → No update ✓
Raw: 170.25 → Round: 170.2 → Change: 0.2g (>= 0.2g) → Update → Display: 170.2 ✓
```

## File yang Diubah

1. **src/components/RightPanel.jsx**:
   - Line 20-40: Menambahkan rounding ke 0.1g dan threshold 0.2g

2. **src/App.jsx**:
   - Line 478-488: Menambahkan rounding dan threshold 0.2g untuk WebSocket handler
   - Line 509, 520, 549: Menggunakan roundedWeight untuk semua perhitungan
   - Line 714-727: Menambahkan rounding dan threshold 0.2g untuk HTTP polling handler
   - Line 740, 751, 755: Menggunakan roundedWeight untuk semua perhitungan

## Parameter

- **Rounding Precision**: 0.1g (Math.round(value * 10) / 10)
- **Update Threshold**: 0.2g (hanya update jika perubahan >= 0.2g)
- **Filtering Threshold**: 0.2g (hanya update display jika perubahan >= 0.2g)

## Testing

Setelah perbaikan ini:
1. ✅ Tidak ada jitter dari floating point precision
2. ✅ Display stabil untuk nilai yang sama (170.05, 170.03 → 170.0)
3. ✅ Hanya update untuk perubahan signifikan (>= 0.2g)
4. ✅ Konsistensi antara display dan calculation

## Catatan Penting

- **Rounding**: Semua nilai di-round ke 0.1g untuk konsistensi
- **Threshold**: 0.2g mencegah update untuk perubahan kecil
- **Konsistensi**: Semua perhitungan menggunakan nilai yang sudah di-round
- **Stabilitas**: Display akan stabil seperti di RSCOM/RealTerm

## Troubleshooting

Jika masih ada jitter:

1. **Periksa Raw Data**: Apakah data benar-benar stabil di backend?
2. **Periksa Rounding**: Apakah semua nilai sudah di-round dengan benar?
3. **Periksa Threshold**: Apakah threshold 0.2g sudah diterapkan?
4. **Periksa Console**: Apakah ada warning tentang suspicious weight drop?









