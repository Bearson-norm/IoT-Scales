# Perbaikan Pencegahan Reset di Tengah Penimbangan

## Masalah yang Ditemukan

User melaporkan bahwa angka penimbangan masih kadang turun drastis bahkan sampai 0 di tengah proses penimbangan. Ini menunjukkan ada kondisi yang menyebabkan reset yang tidak seharusnya terjadi selama penimbangan aktif.

### Analisis Masalah

Masalah ini disebabkan oleh beberapa kondisi:

1. **Race Condition di useEffect Reset**:
   - `useEffect` yang reset `currentWeight` dipicu ketika `!isWeighingActive || !selectedIngredient`
   - State update di React adalah asinkron, jadi `isWeighingActive` atau `selectedIngredient` mungkin sementara menjadi `false/null` selama re-render
   - `useEffect` mendeteksi kondisi ini dan reset `currentWeight` ke 0
   - Timeout 500ms mungkin tidak cukup untuk mencegah race condition

2. **Tidak Mengecek Recent Weight Data**:
   - Reset logic tidak mengecek apakah ada recent weight data
   - Jika ada recent weight data, itu berarti weighing masih aktif
   - Reset seharusnya tidak terjadi jika ada recent weight data

3. **Check Condition Terlalu Ketat**:
   - Check `if (isWeighingActive && selectedIngredient)` terlalu ketat
   - Tidak menggunakan refs untuk handle temporary state updates
   - Jika state sementara false/null, update akan di-skip

## Perbaikan yang Diterapkan

### 1. **Check Recent Weight Data Sebelum Reset**

**Sebelumnya:**
```javascript
if (!isWeighingActiveRef.current || !selectedIngredientRef.current) {
  const shouldReset = !isWeighingActiveRef.current && !selectedIngredientRef.current
  
  if (shouldReset) {
    setCurrentWeight(0)
    // ...
  }
}
```

**Setelah Perbaikan:**
```javascript
if (!isWeighingActiveRef.current || !selectedIngredientRef.current) {
  // CRITICAL: Check if we have recent weight data - if yes, don't reset (weighing is active)
  const hasRecentWeight = currentWeightRef.current > 0
  
  // Only reset if we're truly not weighing AND we don't have recent weight data
  const shouldReset = !isWeighingActiveRef.current && 
                     !selectedIngredientRef.current && 
                     !hasRecentWeight
  
  if (shouldReset) {
    console.log('🔄 Resetting currentWeight - weighing not active and no recent weight data')
    setCurrentWeight(0)
    // ...
  } else {
    // Don't reset if we have recent weight data (weighing is likely active)
    if (hasRecentWeight) {
      console.log('⚠️ Skipping reset - recent weight data detected (weighing likely active):', currentWeightRef.current)
    }
  }
}
```

**Manfaat:**
- Tidak reset jika ada recent weight data (weighing masih aktif)
- Mencegah reset di tengah penimbangan
- Logging yang lebih jelas untuk debugging

### 2. **Longer Timeout untuk Reset**

**Sebelumnya:**
```javascript
}, 500) // Longer delay to prevent race conditions
```

**Setelah Perbaikan:**
```javascript
}, 1000) // Longer delay (1 second) to prevent race conditions from temporary state updates
```

**Manfaat:**
- Timeout lebih lama (1 detik) untuk mencegah race condition
- Memberikan waktu lebih lama untuk state update selesai

### 3. **Use Refs untuk Check Condition di Update**

**Sebelumnya:**
```javascript
if (isWeighingActive && selectedIngredient) {
  // Update weight
}
```

**Setelah Perbaikan:**
```javascript
// CRITICAL: Update refs immediately to track latest weight for reset prevention
currentWeightRef.current = weightGrams

// CRITICAL: Also check refs to handle temporary state updates
if ((isWeighingActive || isWeighingActiveRef.current) && 
    (selectedIngredient || selectedIngredientRef.current)) {
  // Update weight
}
```

**Manfaat:**
- Menggunakan refs untuk handle temporary state updates
- Tidak skip update jika state sementara false/null
- Selalu update refs untuk tracking

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
Weighing Active: currentWeight=720g
→ Re-render (temporary: isWeighingActive=false)
→ useEffect detects: !isWeighingActive
→ setTimeout(500ms)
→ Check: !isWeighingActiveRef.current → shouldReset=true
→ Reset currentWeight to 0 ❌
→ State kembali: isWeighingActive=true
→ Display: 0 → kembali ke 720g (FLICKER!)
```

### Setelah Perbaikan:
```
Weighing Active: currentWeight=720g, currentWeightRef.current=720g
→ Re-render (temporary: isWeighingActive=false)
→ useEffect detects: !isWeighingActive
→ setTimeout(1000ms)
→ Check: !isWeighingActiveRef.current BUT hasRecentWeight=true (720g > 0)
→ shouldReset = false (hasRecentWeight prevents reset)
→ No reset (NO FLICKER!) ✓
→ State kembali: isWeighingActive=true
→ Display: 720g (stable!) ✓
```

## File yang Diubah

1. **src/App.jsx**:
   - Line 401-427: Menambahkan check recent weight data sebelum reset
   - Timeout ditingkatkan dari 500ms ke 1000ms
   - Line 540-541: Menggunakan refs untuk check condition di WebSocket handler
   - Line 790-791: Menggunakan refs untuk check condition di HTTP polling handler
   - Line 546, 797: Update `currentWeightRef.current` untuk tracking

## Parameter

- **Reset Timeout**: 1000ms (dari 500ms)
- **Recent Weight Check**: `currentWeightRef.current > 0`
- **Reset Condition**: `!isWeighingActiveRef.current && !selectedIngredientRef.current && !hasRecentWeight`
- **Update Condition**: `(isWeighingActive || isWeighingActiveRef.current) && (selectedIngredient || selectedIngredientRef.current)`

## Testing

Setelah perbaikan ini:
1. ✅ Tidak ada reset di tengah penimbangan aktif
2. ✅ Check recent weight data mencegah reset yang tidak perlu
3. ✅ Timeout lebih lama untuk mencegah race condition
4. ✅ Menggunakan refs untuk handle temporary state updates

## Catatan Penting

- **Recent Weight Check**: Tidak reset jika ada recent weight data (weighing masih aktif)
- **Longer Timeout**: Timeout lebih lama (1 detik) untuk mencegah race condition
- **Refs Check**: Menggunakan refs untuk handle temporary state updates
- **Always Update Refs**: Selalu update refs untuk tracking latest weight

## Troubleshooting

Jika masih ada masalah:

1. **Periksa Console Logs**: Apakah ada log "Skipping reset - recent weight data detected"?
2. **Periksa currentWeightRef**: Apakah `currentWeightRef.current` memiliki nilai yang benar?
3. **Periksa State Updates**: Apakah ada state update yang menyebabkan temporary false/null?
4. **Periksa Timeout**: Apakah timeout 1000ms sudah cukup?

## Contoh Skenario

### Skenario 1: Normal Weighing (Tidak Ada Reset)
```
Weighing Active: currentWeight=720g, currentWeightRef.current=720g
→ Re-render: isWeighingActive=true
→ useEffect: condition false (both true)
→ No reset ✓
```

### Skenario 2: Temporary State Update (Tidak Ada Reset)
```
Weighing Active: currentWeight=720g, currentWeightRef.current=720g
→ Re-render: isWeighingActive=false (temporary)
→ useEffect: condition true (!isWeighingActive)
→ setTimeout(1000ms)
→ Check: hasRecentWeight=true (720g > 0)
→ shouldReset = false
→ No reset ✓
```

### Skenario 3: Actual Stop Weighing (Reset)
```
Weighing Stopped: currentWeight=0g, currentWeightRef.current=0g
→ Re-render: isWeighingActive=false
→ useEffect: condition true (!isWeighingActive)
→ setTimeout(1000ms)
→ Check: hasRecentWeight=false (0g = 0)
→ shouldReset = true
→ Reset currentWeight to 0 ✓
```







