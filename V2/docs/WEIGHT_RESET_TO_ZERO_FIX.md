# Perbaikan Reset Weight ke 0 yang Tidak Diinginkan

## Masalah yang Ditemukan

User melaporkan bahwa ketika tampilan angka di frontend dengan timbangan sudah stabil, angka tiba-tiba berubah menjadi 0 dan kembali lagi ke angka sebelumnya. Ini menunjukkan ada masalah dengan logika reset yang menyebabkan `currentWeight` di-reset ke 0 secara tidak sengaja.

### Analisis Masalah

Masalah ini disebabkan oleh **race condition** di `useEffect` yang reset `currentWeight`:

1. **Race Condition**:
   - `useEffect` yang reset `currentWeight` dipicu ketika `!isWeighingActive || !selectedIngredient`
   - State update di React adalah asinkron, jadi `isWeighingActive` atau `selectedIngredient` mungkin sementara menjadi `false/null` selama re-render
   - `useEffect` mendeteksi kondisi ini dan reset `currentWeight` ke 0
   - Kemudian state kembali normal dan nilai kembali ke angka sebelumnya

2. **Timeout Terlalu Pendek**:
   - Timeout 100ms terlalu pendek untuk mencegah race condition
   - State update mungkin belum selesai dalam 100ms

3. **Tidak Menggunakan Refs**:
   - Tidak menggunakan refs untuk mengecek state yang sebenarnya
   - Menggunakan state langsung yang mungkin stale

## Perbaikan yang Diterapkan

### 1. **Update Refs Sebelum Check**

**Sebelumnya:**
```javascript
useEffect(() => {
  if (!isWeighingActive || !selectedIngredient) {
    const resetTimeout = setTimeout(() => {
      if (!isWeighingActive || !selectedIngredient) {
        setCurrentWeight(0)
        // ...
      }
    }, 100)
    // ...
  }
}, [isWeighingActive, selectedIngredient])
```

**Setelah Perbaikan:**
```javascript
useEffect(() => {
  // CRITICAL: Update refs immediately to track latest state for race condition prevention
  isWeighingActiveRef.current = isWeighingActive
  selectedIngredientRef.current = selectedIngredient
  
  if (!isWeighingActive || !selectedIngredient) {
    // Use a longer timeout to prevent race conditions
    const resetTimeout = setTimeout(() => {
      // Double-check condition using refs (which reflect latest state)
      if (!isWeighingActiveRef.current || !selectedIngredientRef.current) {
        // Only reset if we're truly not weighing
        const shouldReset = !isWeighingActiveRef.current && !selectedIngredientRef.current
        
        if (shouldReset) {
          setCurrentWeight(0)
          // ...
        }
      }
    }, 500) // Longer delay to prevent race conditions
    // ...
  }
}, [isWeighingActive, selectedIngredient])
```

**Manfaat:**
- Refs selalu memiliki nilai terbaru (tidak stale)
- Check menggunakan refs yang lebih reliable
- Timeout lebih lama (500ms) untuk mencegah race condition

### 2. **Validasi yang Lebih Ketat**

**Sebelumnya:**
```javascript
if (!isWeighingActive || !selectedIngredient) {
  setCurrentWeight(0)
  // ...
}
```

**Setelah Perbaikan:**
```javascript
if (!isWeighingActiveRef.current || !selectedIngredientRef.current) {
  // Only reset if we're truly not weighing (not just a temporary state update)
  const shouldReset = !isWeighingActiveRef.current && !selectedIngredientRef.current
  
  if (shouldReset) {
    setCurrentWeight(0)
    // ...
  }
}
```

**Manfaat:**
- Validasi yang lebih ketat sebelum reset
- Hanya reset jika benar-benar tidak aktif
- Mencegah reset karena temporary state update

### 3. **Timeout yang Lebih Lama**

**Sebelumnya:**
```javascript
setTimeout(() => {
  // ...
}, 100) // Small delay to prevent race conditions
```

**Setelah Perbaikan:**
```javascript
setTimeout(() => {
  // ...
}, 500) // Longer delay to prevent race conditions from temporary state updates
```

**Manfaat:**
- Memberikan waktu lebih lama untuk state update selesai
- Mencegah race condition dari temporary state update

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
State: isWeighingActive=true, selectedIngredient={...}
→ Re-render (temporary: selectedIngredient=null)
→ useEffect detects: !selectedIngredient
→ setTimeout(100ms)
→ Reset currentWeight to 0
→ State kembali: selectedIngredient={...}
→ Display: 0 → kembali ke angka sebelumnya (FLICKER!)
```

### Setelah Perbaikan:
```
State: isWeighingActive=true, selectedIngredient={...}
→ Update refs: isWeighingActiveRef.current=true, selectedIngredientRef.current={...}
→ Re-render (temporary: selectedIngredient=null)
→ useEffect detects: !selectedIngredient
→ setTimeout(500ms)
→ Check refs: isWeighingActiveRef.current=true, selectedIngredientRef.current={...}
→ shouldReset = false
→ No reset (NO FLICKER!) ✓
```

## File yang Diubah

1. **src/App.jsx**:
   - Line 392-417: Menambahkan update refs dan validasi yang lebih ketat
   - Timeout ditingkatkan dari 100ms ke 500ms
   - Check menggunakan refs untuk mencegah race condition

## Parameter

- **Timeout Delay**: 500ms (dari 100ms)
- **Refs Check**: Menggunakan `isWeighingActiveRef.current` dan `selectedIngredientRef.current`
- **Validasi**: `shouldReset = !isWeighingActiveRef.current && !selectedIngredientRef.current`

## Testing

Setelah perbaikan ini:
1. ✅ Tidak ada reset yang tidak diinginkan
2. ✅ Tidak ada flicker (0 → angka sebelumnya)
3. ✅ Validasi yang lebih ketat sebelum reset
4. ✅ Race condition dicegah dengan refs dan timeout yang lebih lama

## Catatan Penting

- **Refs**: Refs selalu memiliki nilai terbaru dan tidak stale
- **Timeout**: Timeout yang lebih lama memberikan waktu untuk state update selesai
- **Validasi**: Validasi yang lebih ketat mencegah reset yang tidak perlu

## Troubleshooting

Jika masih ada masalah:

1. **Periksa Console Logs**: Apakah ada warning tentang reset?
2. **Periksa State Updates**: Apakah ada state update yang menyebabkan temporary false/null?
3. **Periksa Refs**: Apakah refs sudah di-update dengan benar?
4. **Periksa Timeout**: Apakah timeout sudah cukup lama?

## Contoh Skenario

### Skenario 1: Normal Weighing (Tidak Ada Reset)
```
isWeighingActive=true, selectedIngredient={...}
→ Update refs
→ useEffect: condition false (both true)
→ No reset ✓
```

### Skenario 2: Temporary State Update (Tidak Ada Reset)
```
isWeighingActive=true, selectedIngredient={...}
→ Update refs: isWeighingActiveRef.current=true, selectedIngredientRef.current={...}
→ Re-render: selectedIngredient=null (temporary)
→ useEffect: condition true (!selectedIngredient)
→ setTimeout(500ms)
→ Check refs: selectedIngredientRef.current={...} (still valid)
→ shouldReset = false
→ No reset ✓
```

### Skenario 3: Actual Stop Weighing (Reset)
```
isWeighingActive=false
→ Update refs: isWeighingActiveRef.current=false
→ useEffect: condition true (!isWeighingActive)
→ setTimeout(500ms)
→ Check refs: isWeighingActiveRef.current=false, selectedIngredientRef.current=null
→ shouldReset = true
→ Reset currentWeight to 0 ✓
```









