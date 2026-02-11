# Perbaikan Reset ke 0 Ketika Mesin Menunjukkan 0

## Masalah yang Ditemukan

User melaporkan masalah:
1. **Penimbangan pertama**: Bisa menambah beban sebelum mulai, dan bisa mulai penimbangan saat angka di mesin dan frontend 0. Ini berhasil.
2. **Penimbangan kedua**: Memberikan beban sebelum memulai penimbangan, tapi ketika mencoba membuat 0 di mesin, frontend masih menyimpan beban sebelumnya dan freeze (tidak bisa memulai penimbangan).

Masalahnya adalah:
- Ketika user memberikan beban sebelum memulai penimbangan (misalnya 442g), `currentWeightRef.current` menjadi 442
- Ketika user mencoba membuat mesin menjadi 0, logika reset mengecek `hasRecentWeight = currentWeightRef.current > 0` dan mencegah reset
- Frontend tetap menunjukkan 442g meskipun mesin sudah 0, sehingga user tidak bisa memulai penimbangan baru

### Analisis Masalah

1. **Logika Reset Terlalu Protektif**:
   - Logika reset mengecek `currentWeightRef.current > 0` untuk mencegah reset selama penimbangan aktif
   - Tapi ini juga mencegah reset ketika mesin sudah menunjukkan 0
   - User tidak bisa memulai penimbangan baru karena frontend masih menyimpan beban sebelumnya

2. **Tidak Mengecek Status Mesin**:
   - Logika reset tidak mengecek apakah mesin menunjukkan 0
   - Hanya mengecek apakah ada recent weight data, bukan apakah mesin sebenarnya menunjukkan 0

3. **Tidak Reset Ketika Weight dari Backend adalah 0**:
   - Ketika weight dari backend adalah 0, frontend tidak langsung reset
   - Hanya menunggu timeout, yang mungkin tidak terjadi jika ada recent weight data

## Perbaikan yang Diterapkan

### 1. **Reset Berdasarkan Status Mesin (zeroCheckWeight)**

**Sebelumnya:**
```javascript
const hasRecentWeight = currentWeightRef.current > 0
const shouldReset = !isWeighingActiveRef.current && 
                   !selectedIngredientRef.current && 
                   !hasRecentWeight
```

**Setelah Perbaikan:**
```javascript
// CRITICAL: Check if scale reading is 0 or near 0 (within 0.5g tolerance)
// If scale shows 0, we should reset even if currentWeightRef > 0 (user removed weight)
const scaleIsZero = Math.abs(zeroCheckWeight) < 0.5

const hasRecentWeight = currentWeightRef.current > 0

// Only reset if we're truly not weighing AND (we don't have recent weight data OR scale is 0)
// This prevents reset during active weighing BUT allows reset when scale is 0
const shouldReset = !isWeighingActiveRef.current && 
                   !selectedIngredientRef.current && 
                   (!hasRecentWeight || scaleIsZero)
```

**Manfaat:**
- Mengecek apakah mesin menunjukkan 0 menggunakan `zeroCheckWeight`
- Reset dilakukan jika mesin menunjukkan 0, bahkan jika ada recent weight data
- Memungkinkan user memulai penimbangan baru setelah menghapus beban

### 2. **Reset Langsung Ketika Weight dari Backend adalah 0**

**Sebelumnya:**
```javascript
let weightGrams = message.weight
// Process weight...
```

**Setelah Perbaikan:**
```javascript
let weightGrams = message.weight

// CRITICAL: If weight is 0 or near 0 and not actively weighing, reset currentWeight
// This ensures that when user removes weight from scale, frontend resets even if previous weight was stored
if (Math.abs(weightGrams) < 0.5 && (!isWeighingActive || !selectedIngredient)) {
  if (currentWeightRef.current > 0) {
    console.log('🔄 Scale reading is 0, resetting currentWeight from', currentWeightRef.current, 'to 0')
    setCurrentWeight(0)
    currentWeightRef.current = 0
    // Also reset in recipe state
    setRecipe(prev => prev.map(ing => ({
      ...ing,
      currentWeight: 0
    })))
  }
  return // Skip further processing when scale is 0 and not weighing
}
```

**Manfaat:**
- Reset langsung ketika weight dari backend adalah 0 atau sangat kecil (< 0.5g)
- Tidak perlu menunggu timeout
- Memastikan frontend selalu sinkron dengan mesin ketika mesin menunjukkan 0

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
1. User memberikan beban 442g sebelum memulai penimbangan
   → currentWeightRef.current = 442
   → Frontend: 442g

2. User membuat mesin menjadi 0
   → Mesin: 0g
   → Frontend: Masih 442g (freeze)
   → Logika reset: hasRecentWeight = true → tidak reset
   → User tidak bisa memulai penimbangan baru ❌
```

### Setelah Perbaikan:
```
1. User memberikan beban 442g sebelum memulai penimbangan
   → currentWeightRef.current = 442
   → Frontend: 442g

2. User membuat mesin menjadi 0
   → Mesin: 0g
   → Backend: weight = 0
   → Frontend: Reset langsung ke 0g ✓
   → Logika reset: scaleIsZero = true → reset meskipun hasRecentWeight = true
   → User bisa memulai penimbangan baru ✓
```

## File yang Diubah

1. **src/App.jsx**:
   - Line 406-441: Memodifikasi logika reset untuk mengecek `zeroCheckWeight`
   - Line 497-504: Menambahkan reset langsung ketika weight dari backend adalah 0 (WebSocket)
   - Line 812-819: Menambahkan reset langsung ketika weight dari backend adalah 0 (HTTP polling)
   - Reset dilakukan jika mesin menunjukkan 0, bahkan jika ada recent weight data

## Parameter Validasi

- **Scale Zero Threshold**: `Math.abs(weightGrams) < 0.5` - Weight dianggap 0 jika dalam 0.5g
- **Zero Check Weight**: `Math.abs(zeroCheckWeight) < 0.5` - Mengecek apakah mesin menunjukkan 0
- **Reset Condition**: Reset jika tidak aktif menimbang DAN (tidak ada recent weight ATAU mesin menunjukkan 0)

## Testing

Setelah perbaikan ini:
1. ✅ Frontend akan reset ke 0 ketika mesin menunjukkan 0
2. ✅ User bisa memulai penimbangan baru setelah menghapus beban
3. ✅ Tidak ada freeze pada tampilan frontend
4. ✅ Reset dilakukan langsung tanpa menunggu timeout

## Catatan Penting

- **Scale Zero Detection**: Menggunakan threshold 0.5g untuk mendeteksi apakah mesin menunjukkan 0
- **Immediate Reset**: Reset dilakukan langsung ketika weight dari backend adalah 0, tidak perlu menunggu timeout
- **State Consistency**: Memastikan `currentWeight`, `currentWeightRef`, dan `recipe` state semua di-reset ke 0
- **User Experience**: User bisa memulai penimbangan baru setelah menghapus beban dari mesin

## Troubleshooting

Jika masih ada masalah:

1. **Periksa zeroCheckWeight**: Apakah `zeroCheckWeight` benar-benar 0 ketika mesin menunjukkan 0?
2. **Periksa Backend Weight**: Apakah backend mengirim weight = 0 ketika mesin menunjukkan 0?
3. **Periksa Reset Logic**: Apakah logika reset dijalankan dengan benar?
4. **Periksa State**: Apakah `currentWeight` dan `currentWeightRef` benar-benar di-reset ke 0?

## Contoh Skenario

### Skenario 1: Penimbangan Normal (Tidak Berubah)
```
1. User memulai penimbangan
   → isWeighingActive = true
   → selectedIngredient = {...}
   → Reset logic: Tidak dijalankan (karena aktif menimbang) ✓

2. User menambah beban
   → Mesin: 442g
   → Frontend: 442g ✓
```

### Skenario 2: Reset Setelah Menghapus Beban (Diperbaiki)
```
1. User memberikan beban 442g sebelum memulai penimbangan
   → isWeighingActive = false
   → selectedIngredient = null
   → currentWeightRef.current = 442
   → Frontend: 442g

2. User membuat mesin menjadi 0
   → Mesin: 0g
   → Backend: weight = 0
   → Frontend: Reset langsung ke 0g ✓
   → currentWeightRef.current = 0 ✓
   → User bisa memulai penimbangan baru ✓
```

### Skenario 3: Reset dengan Timeout (Fallback)
```
1. User memberikan beban 442g sebelum memulai penimbangan
   → isWeighingActive = false
   → selectedIngredient = null
   → currentWeightRef.current = 442
   → zeroCheckWeight = 0 (mesin menunjukkan 0)
   → Frontend: 442g

2. Timeout 1 detik
   → Logika reset: scaleIsZero = true → reset ✓
   → Frontend: 0g ✓
   → User bisa memulai penimbangan baru ✓
```









