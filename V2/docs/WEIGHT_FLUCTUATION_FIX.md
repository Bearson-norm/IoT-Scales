# Perbaikan Masalah Fluktuasi Weight (Berubah Antara Nilai Aktual dan 0)

## Masalah yang Ditemukan

User melaporkan bahwa angka pembacaan timbangan berubah fluktuatif antara angka aktual penimbangan dan 0 secara terus menerus.

### Analisis Masalah

Masalah ini disebabkan oleh beberapa faktor:

1. **Race Condition di useEffect**: 
   - useEffect yang mereset `currentWeight` ke 0 berjalan setiap kali `isWeighingActive` atau `selectedIngredient` berubah
   - Jika ada state update yang menyebabkan salah satu menjadi false/null sementara, weight akan direset
   - Kemudian weight di-update lagi dari WebSocket/polling, menyebabkan fluktuasi

2. **Reset untuk Ingredient Lain**:
   - Logika yang mereset `currentWeight` untuk ingredient lain yang tidak match
   - Ini bisa menyebabkan reset yang tidak perlu jika matching tidak konsisten

3. **Tidak Ada Check Sebelum Update**:
   - Weight di-update tanpa check apakah masih dalam weighing mode
   - Jika update datang setelah weighing berhenti, akan menyebabkan fluktuasi

## Perbaikan yang Diterapkan

### 1. **Menambahkan Timeout untuk Mencegah Race Condition**

**Sebelumnya:**
```javascript
if (!isWeighingActive || !selectedIngredient) {
  setCurrentWeight(0)
  // Reset immediately
  return
}
```

**Setelah Perbaikan:**
```javascript
if (!isWeighingActive || !selectedIngredient) {
  // Use a small timeout to prevent race conditions - only reset if condition persists
  const resetTimeout = setTimeout(() => {
    // Double-check condition after timeout to prevent race conditions
    if (!isWeighingActive || !selectedIngredient) {
      setCurrentWeight(0)
      // Reset only if condition still persists
    }
  }, 100) // Small delay to prevent race conditions
  
  return () => {
    clearTimeout(resetTimeout)
  }
}
```

**Manfaat:**
- Mencegah reset yang terlalu cepat
- Memberi waktu untuk state update selesai
- Hanya reset jika kondisi benar-benar tidak aktif

### 2. **Menghapus Reset untuk Ingredient Lain**

**Sebelumnya:**
```javascript
return ing.currentWeight !== 0 
  ? { ...ing, currentWeight: 0 } 
  : ing
```

**Setelah Perbaikan:**
```javascript
// CRITICAL: Don't reset currentWeight for other ingredients immediately
// Only reset if we're sure they're not being weighed
// This prevents fluktuasi where weight jumps between actual value and 0
// Keep their currentWeight as is to prevent unnecessary resets
return ing
```

**Manfaat:**
- Tidak mereset weight untuk ingredient lain yang tidak sedang ditimbang
- Mencegah fluktuasi yang tidak perlu
- Lebih stabil untuk multi-ingredient scenarios

### 3. **Menambahkan Check Sebelum Update Weight**

**Sebelumnya:**
```javascript
if (message.type === 'scale_data' && message.success && message.weight !== undefined) {
  const weightGrams = message.weight
  setCurrentWeight(weightGrams) // Update immediately
  ...
}
```

**Setelah Perbaikan:**
```javascript
if (message.type === 'scale_data' && message.success && message.weight !== undefined) {
  const weightGrams = message.weight
  
  // CRITICAL: Only update if we're still in weighing mode to prevent fluktuasi
  // Check conditions before updating to prevent race conditions
  if (isWeighingActive && selectedIngredient) {
    setCurrentWeight(weightGrams) // Update only if still in weighing mode
    ...
  } else {
    // If not in weighing mode, don't update to prevent fluktuasi
    // This prevents race conditions where weight updates arrive after weighing stops
  }
}
```

**Manfaat:**
- Hanya update weight jika masih dalam weighing mode
- Mencegah update setelah weighing berhenti
- Mengurangi fluktuasi yang tidak perlu

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
1. Weight update dari WebSocket: 44.4g
2. setCurrentWeight(44.4) → currentWeight = 44.4g ✓
3. State update lain menyebabkan isWeighingActive = false (sementara)
4. useEffect detect: !isWeighingActive → setCurrentWeight(0) → currentWeight = 0g ✗
5. Weight update berikutnya: 44.5g
6. setCurrentWeight(44.5) → currentWeight = 44.5g ✓
7. Loop terus menerus → Fluktuasi!
```

### Setelah Perbaikan:
```
1. Weight update dari WebSocket: 44.4g
2. Check: isWeighingActive && selectedIngredient? → Yes
3. setCurrentWeight(44.4) → currentWeight = 44.4g ✓
4. State update lain menyebabkan isWeighingActive = false (sementara)
5. useEffect detect: !isWeighingActive → setTimeout(100ms)
6. Setelah 100ms, check lagi: !isWeighingActive? → No (sudah true lagi)
7. Tidak reset → currentWeight tetap 44.4g ✓
8. Weight update berikutnya: 44.5g
9. Check: isWeighingActive && selectedIngredient? → Yes
10. setCurrentWeight(44.5) → currentWeight = 44.5g ✓
11. Tidak ada fluktuasi! ✓
```

## File yang Diubah

1. **src/App.jsx**:
   - Line 395-411: Menambahkan timeout untuk mencegah race condition
   - Line 454: Menambahkan check sebelum update weight (WebSocket)
   - Line 493-497: Menghapus reset untuk ingredient lain (WebSocket)
   - Line 524-529: Menambahkan else clause untuk skip update (WebSocket)
   - Line 657: Menambahkan check sebelum update weight (HTTP polling)
   - Line 693-697: Menghapus reset untuk ingredient lain (HTTP polling)
   - Line 724-728: Menambahkan else clause untuk skip update (HTTP polling)

## Testing

Setelah perbaikan ini:
1. ✅ Weight tidak akan direset terlalu cepat
2. ✅ Weight hanya di-update jika masih dalam weighing mode
3. ✅ Tidak ada reset untuk ingredient lain yang tidak perlu
4. ✅ Fluktuasi antara nilai aktual dan 0 seharusnya sudah teratasi

## Catatan Penting

- **Timeout 100ms** memberikan waktu untuk state update selesai
- **Check sebelum update** mencegah update setelah weighing berhenti
- **Tidak reset ingredient lain** mencegah fluktuasi yang tidak perlu
- **Cleanup function** memastikan timeout dibersihkan jika component unmount

## Troubleshooting

Jika masih ada fluktuasi:

1. **Periksa Console**: Apakah ada error atau warning?
2. **Periksa State**: Apakah `isWeighingActive` atau `selectedIngredient` berubah secara tidak sengaja?
3. **Periksa WebSocket**: Apakah koneksi stabil?
4. **Periksa Parsing**: Apakah parsing kadang return null?





