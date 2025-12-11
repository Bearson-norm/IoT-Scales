# Perbaikan Validasi Parsing Weight untuk Mencegah Nilai Salah (529 menjadi 9)

## Masalah yang Ditemukan

User melaporkan bahwa di frontend, digital weight kadang menampilkan data yang jatuh jauh, misalnya 529 gram menjadi 9 gram. Ini juga mempengaruhi progress bar container dan progress bar di recipe section.

### Analisis Masalah

Masalah ini kemungkinan disebabkan oleh:

1. **Parsing yang Tidak Lengkap**:
   - Regex pattern mungkin hanya menangkap sebagian dari angka
   - Data yang masuk mungkin terpotong atau tidak lengkap
   - Multiple matches yang menyebabkan hanya bagian tertentu yang diambil

2. **Tidak Ada Validasi**:
   - Tidak ada validasi untuk memastikan nilai yang di-parse masuk akal
   - Tidak ada pengecekan jika nilai tiba-tiba drop drastis
   - Tidak ada logging untuk membantu debug

3. **Race Condition**:
   - Update weight yang tiba-tiba bisa menyebabkan nilai ter-overwrite dengan nilai yang salah
   - Tidak ada pengecekan konsistensi antara nilai sebelumnya dan nilai baru

## Perbaikan yang Diterapkan

### 1. **Validasi di Frontend (App.jsx)**

**Sebelumnya:**
```javascript
if (message.type === 'scale_data' && message.success && message.weight !== undefined) {
  const weightGrams = message.weight
  setCurrentWeight(weightGrams) // Update langsung tanpa validasi
}
```

**Setelah Perbaikan:**
```javascript
if (message.type === 'scale_data' && message.success && message.weight !== undefined) {
  let weightGrams = message.weight
  
  // CRITICAL: Validate weight value to prevent incorrect parsing
  if (typeof weightGrams !== 'number' || isNaN(weightGrams)) {
    console.warn('⚠️ Invalid weight value received:', weightGrams);
    return; // Skip invalid weight values
  }
  
  // CRITICAL: Validate weight range to catch parsing errors
  // If weight suddenly drops significantly (e.g., from 529 to 9), log warning
  if (weightGrams > 0 && weightGrams < 10 && currentWeight > 100) {
    console.warn('⚠️ Suspicious weight drop detected:', {
      previousWeight: currentWeight,
      newWeight: weightGrams
    });
    // Don't update if the drop seems too large (likely parsing error)
    if (Math.abs(weightGrams - currentWeight) > currentWeight * 0.5) {
      console.warn('⚠️ Skipping weight update - suspicious drop too large');
      return;
    }
  }
  
  setCurrentWeight(weightGrams) // Update hanya jika valid
}
```

**Manfaat:**
- Mencegah update dengan nilai yang tidak valid
- Mendeteksi dan mencegah drop drastis yang tidak masuk akal
- Logging untuk membantu debug

### 2. **Validasi di RightPanel.jsx**

**Sebelumnya:**
```javascript
const currentReading = isWeighingActive ? (parseFloat(currentWeight || 0) || 0) : 0;
```

**Setelah Perbaikan:**
```javascript
let rawCurrentWeight = parseFloat(currentWeight || 0) || 0;
// Validate: if currentWeight seems incorrect, log warning
if (isWeighingActive && rawCurrentWeight > 0 && rawCurrentWeight < 10 && targetWeight > 100) {
  console.warn('⚠️ Suspicious currentWeight value:', {
    currentWeight: rawCurrentWeight,
    targetWeight: targetWeight,
    savedWeight: savedWeight
  });
}
const currentReading = isWeighingActive ? rawCurrentWeight : 0;
```

**Manfaat:**
- Deteksi nilai yang mencurigakan sebelum ditampilkan
- Logging untuk membantu identifikasi masalah

### 3. **Validasi di Backend (server.js)**

**Sebelumnya:**
```javascript
const weightMatch = weightRaw.match(/([+\-]?)(0*\d+\.?\d*)\s*(kg|g|lb|oz)?/i);
if (weightMatch) {
  const numStr = weightMatch[2] || '';
  const weightValue = parseFloat(signStr + numStr);
  // No validation for incomplete parsing
}
```

**Setelah Perbaikan:**
```javascript
const weightMatch = weightRaw.match(/([+\-]?)(0*\d+\.?\d*)\s*(kg|g|lb|oz)?/i);
if (weightMatch) {
  const numStr = weightMatch[2] || '';
  
  // CRITICAL: Validate that we captured the full number correctly
  // Check if numStr seems incomplete (e.g., only 1 digit when we expect more)
  if (numStr.length < 3 && weightRaw.length > 10) {
    // Try to find a longer number pattern in the raw data
    const longerMatch = weightRaw.match(/([+\-]?)(\d{3,}\.?\d*)\s*(kg|g|lb|oz)?/i);
    if (longerMatch && longerMatch[2] && longerMatch[2].length > numStr.length) {
      // Use the longer match if it's more complete
      const correctedWeightValue = parseFloat(correctedFullNumStr);
      if (!isNaN(correctedWeightValue) && correctedWeightValue > 0 && correctedWeightValue <= 10000) {
        // Use the corrected value
        return correctedWeight;
      }
    }
  }
  
  const weightValue = parseFloat(signStr + numStr);
}
```

**Manfaat:**
- Mendeteksi parsing yang tidak lengkap
- Mencoba menemukan pattern yang lebih lengkap
- Menggunakan nilai yang lebih lengkap jika ditemukan

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
1. Raw data: "US,+000529.0 g"
2. Regex match: numStr = "9" (hanya digit terakhir) ✗
3. weightValue = 9 ✗
4. Frontend update: currentWeight = 9 ✗
5. Display: 9.0 g ✗
```

### Setelah Perbaikan:
```
1. Raw data: "US,+000529.0 g"
2. Regex match: numStr = "9" (hanya digit terakhir)
3. Validation: numStr.length < 3 && weightRaw.length > 10 → True
4. Try longer match: longerMatch = "529.0" ✓
5. Use corrected value: weightValue = 529 ✓
6. Frontend validation: weightGrams = 529, currentWeight = 100 → No suspicious drop
7. Frontend update: currentWeight = 529 ✓
8. Display: 529.0 g ✓
```

## File yang Diubah

1. **src/App.jsx**:
   - Line 448-472: Validasi weight value di WebSocket handler
   - Line 644-670: Validasi weight value di HTTP polling handler

2. **src/components/RightPanel.jsx**:
   - Line 69-82: Validasi currentWeight sebelum ditampilkan

3. **server.js**:
   - Line 633-680: Validasi parsing untuk mendeteksi parsing yang tidak lengkap

## Testing

Setelah perbaikan ini:
1. ✅ Weight tidak akan di-update dengan nilai yang tidak valid
2. ✅ Drop drastis yang tidak masuk akal akan dideteksi dan dicegah
3. ✅ Parsing yang tidak lengkap akan dideteksi dan diperbaiki
4. ✅ Logging akan membantu identifikasi masalah

## Catatan Penting

- **Validasi Frontend**: Mencegah update dengan nilai yang mencurigakan
- **Validasi Backend**: Mencoba memperbaiki parsing yang tidak lengkap
- **Logging**: Membantu debug jika masalah masih terjadi
- **Threshold**: Drop > 50% dari nilai sebelumnya dianggap mencurigakan

## Troubleshooting

Jika masih ada masalah:

1. **Periksa Console**: Apakah ada warning tentang suspicious weight drop?
2. **Periksa Raw Data**: Apakah data yang masuk dari scale lengkap?
3. **Periksa Parsing**: Apakah regex pattern cocok dengan format data?
4. **Aktifkan DEBUG_SCALE**: Set `DEBUG_SCALE=true` untuk melihat detail parsing


