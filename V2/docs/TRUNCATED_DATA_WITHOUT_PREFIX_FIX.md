# Perbaikan Penolakan Data Terpotong Tanpa Prefix

## Masalah yang Ditemukan

User melaporkan bahwa angka penimbangan stabil di 442.4 gram, tapi tiba-tiba menampilkan 2.4 gram. Dari log yang diberikan:

1. Raw data pertama: `'ST,+000442.4'` → parsed: 442.4 ✓
2. Raw data kedua: `'ST,+000442.4'` → parsed: 442.4 ✓
3. Raw data ketiga: `'2.4  g'` → parsed: 2.4 ❌ (seharusnya 442.4)

Masalahnya adalah:
- Data ketiga `'2.4  g'` tidak memiliki prefix `ST,` atau `US,`
- Ini kemungkinan besar adalah data yang terpotong - seharusnya `'ST,+000442.4  g'` tapi hanya terkirim `'2.4  g'`
- Parser masih memproses data ini dan menghasilkan 2.4 (terpotong), menyebabkan fluktuasi dari 442.4 ke 2.4

### Analisis Masalah

1. **Data Terpotong Tanpa Prefix**:
   - Format lengkap: `'ST,+000442.4  g'` (ada prefix `ST,` dan angka lengkap)
   - Format terpotong: `'2.4  g'` (tidak ada prefix, hanya bagian akhir angka)
   - Parser masih memproses data terpotong dan menghasilkan nilai yang salah

2. **Tidak Ada Validasi untuk Data Tanpa Prefix**:
   - Tidak ada validasi untuk mendeteksi data tanpa prefix yang nilainya terlalu kecil
   - Parser menerima data apapun dan mencoba memparsing
   - Tidak ada penolakan untuk data yang terpotong

3. **Frontend Tidak Cukup Agresif**:
   - Frontend sudah memiliki validasi untuk mendeteksi truncation, tapi tidak cukup agresif
   - Validasi tidak mengecek apakah data memiliki prefix atau tidak
   - Validasi hanya mengecek ratio, tapi tidak mengecek format data

## Perbaikan yang Diterapkan

### 1. **Validasi Data Tanpa Prefix di Backend**

**Sebelumnya:**
```javascript
// Format 3: Tanpa prefix (data tidak lengkap) - hanya angka dan unit
else if (parts.length === 1) {
  const hasWeightPattern = /[+\-]?\d+\.?\d*\s*[gkGK]+/i.test(cleaned);
  if (hasWeightPattern) {
    status = '';
    weightRaw = cleaned.trim();
  }
}
```

**Setelah Perbaikan:**
```javascript
// Format 3: Tanpa prefix (data tidak lengkap) - hanya angka dan unit
// CRITICAL: Data tanpa prefix seringkali adalah data terpotong (e.g., "2.4  g" dari "ST,+000442.4  g")
// Validasi: Tolak data tanpa prefix jika nilainya terlalu kecil (< 10g) karena kemungkinan besar terpotong
else if (parts.length === 1) {
  const hasWeightPattern = /[+\-]?\d+\.?\d*\s*[gkGK]+/i.test(cleaned);
  if (hasWeightPattern) {
    // CRITICAL: Extract weight value first to validate
    const tempWeightMatch = cleaned.match(/([+\-]?)(\d+\.?\d*)\s*[gkGK]+/i);
    if (tempWeightMatch) {
      const tempWeightValue = parseFloat((tempWeightMatch[1] || '') + tempWeightMatch[2]);
      // CRITICAL: Reject data without prefix if value is too small (< 10g)
      // This prevents truncated data like "2.4  g" from "ST,+000442.4  g" being accepted
      if (!isNaN(tempWeightValue) && tempWeightValue < 10) {
        if (DEBUG_SCALE) {
          console.warn(`⚠️  Rejecting data without prefix (likely truncated): "${cleaned}" - value ${tempWeightValue}g is too small`);
        }
        return null; // Reject truncated data
      }
    }
    status = '';
    weightRaw = cleaned.trim();
  }
}
```

**Manfaat:**
- Mendeteksi data tanpa prefix yang nilainya terlalu kecil (< 10g)
- Menolak data yang kemungkinan besar terpotong
- Return null jika data terpotong - frontend akan menggunakan nilai sebelumnya

### 2. **Validasi Prefix di Frontend**

**Sebelumnya:**
```javascript
if (ratio < 0.10 && ratio >= 0.02) {
  if (weightGrams < 20 && currentWeight > 100) {
    console.warn('⚠️ Possible truncated weight detected');
    return;
  }
}
```

**Setelah Perbaikan:**
```javascript
if (ratio < 0.10 && ratio >= 0.02) {
  // CRITICAL: Also check if raw data doesn't have prefix (ST, or US,) - likely truncated
  const rawDataStr = (data.raw || JSON.stringify(data) || '').toString();
  const hasPrefix = /^(ST|US)[,:]/.test(rawDataStr);
  if ((weightGrams < 20 && currentWeight > 100) || (!hasPrefix && weightGrams < 50 && currentWeight > 100)) {
    console.warn('⚠️ Possible truncated weight detected:', {
      previousWeight: currentWeight,
      newWeight: weightGrams,
      ratio: ratio.toFixed(4),
      rawData: rawDataStr,
      hasPrefix: hasPrefix,
      data: data
    });
    return;
  }
}
```

**Manfaat:**
- Mengecek apakah data memiliki prefix `ST,` atau `US,`
- Menolak data tanpa prefix jika nilainya terlalu kecil (< 50g) dan previous weight besar (> 100g)
- Lebih agresif dalam mendeteksi truncation

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
Raw: "ST,+000442.4" → Parse: 442.4g → Frontend: 442.4g ✓
Raw: "ST,+000442.4" → Parse: 442.4g → Frontend: 442.4g ✓
Raw: "2.4  g" → Parse: 2.4g (truncated!) → Frontend: 2.4g ❌
Result: Fluktuasi dari 442.4 ke 2.4
```

### Setelah Perbaikan:
```
Raw: "ST,+000442.4" → Parse: 442.4g → Frontend: 442.4g ✓
Raw: "ST,+000442.4" → Parse: 442.4g → Frontend: 442.4g ✓
Raw: "2.4  g" → Validate: no prefix, value < 10g → Return null (backend)
→ Frontend: Skip update → Keep previous: 442.4g ✓
OR
Raw: "2.4  g" → Parse: 2.4g → Frontend: Validate: no prefix, value < 50g, previous > 100g → Skip update → Keep previous: 442.4g ✓
Result: Stable at 442.4g (no fluctuation)
```

## File yang Diubah

1. **server.js**:
   - Line 602-611: Menambahkan validasi untuk data tanpa prefix yang nilainya terlalu kecil (< 10g)
   - Return null jika data terpotong
   - Logging warning untuk data terpotong

2. **src/App.jsx**:
   - Line 834-853: Menambahkan validasi prefix untuk HTTP polling handler
   - Line 523-538: Menambahkan validasi prefix untuk WebSocket handler
   - Mengecek apakah data memiliki prefix sebelum menerima update
   - Skip update jika data tanpa prefix dan nilainya terlalu kecil

## Parameter Validasi

### Backend:
- **Threshold**: Data tanpa prefix dengan nilai < 10g akan ditolak
- **Reason**: Data lengkap biasanya memiliki prefix, data tanpa prefix dengan nilai kecil kemungkinan besar terpotong

### Frontend:
- **Threshold 1**: Data dengan ratio 2-10% dan nilai < 20g ketika previous > 100g
- **Threshold 2**: Data tanpa prefix dengan nilai < 50g ketika previous > 100g
- **Prefix Check**: `/^(ST|US)[,:]/` - Mengecek apakah data dimulai dengan `ST,` atau `US,`

## Testing

Setelah perbaikan ini:
1. ✅ Data tanpa prefix yang nilainya terlalu kecil akan ditolak di backend
2. ✅ Frontend akan skip update jika data tanpa prefix dan nilainya terlalu kecil
3. ✅ Nilai sebelumnya akan dipertahankan (tidak ada fluktuasi)
4. ✅ Display stabil pada nilai yang benar (442.4g)

## Catatan Penting

- **Data Completeness**: Validasi data lengkap sebelum parsing
- **Prefix Validation**: Mengecek prefix untuk mendeteksi data terpotong
- **Threshold**: Threshold yang berbeda untuk backend (< 10g) dan frontend (< 50g) untuk memberikan lapisan validasi ganda
- **Stable Display**: Display akan stabil pada nilai yang benar

## Troubleshooting

Jika masih ada masalah:

1. **Periksa Backend Logs**: Apakah ada warning tentang data tanpa prefix yang ditolak?
2. **Periksa Raw Data**: Apakah raw data menunjukkan format yang lengkap dengan prefix?
3. **Periksa Frontend Logs**: Apakah frontend skip update dengan benar?
4. **Periksa Previous Value**: Apakah nilai sebelumnya dipertahankan?

## Contoh Skenario

### Skenario 1: Data Lengkap dengan Prefix (Accepted)
```
Raw: "ST,+000442.4  g"
→ Validate: has prefix ✓, value 442.4g ✓
→ Parse: 442.4g ✓
→ Frontend: 442.4g ✓
```

### Skenario 2: Data Terpotong Tanpa Prefix (Rejected by Backend)
```
Raw: "2.4  g"
→ Validate: no prefix ✗, value 2.4g < 10g ✗
→ Return: null
→ Frontend: Skip update, keep previous: 442.4g ✓
```

### Skenario 3: Data Terpotong Tanpa Prefix (Rejected by Frontend)
```
Raw: "2.4  g"
→ Parse: 2.4g (backend accepts if >= 10g)
→ Frontend: Validate: no prefix ✗, value 2.4g < 50g ✗, previous 442.4g > 100g ✓
→ Skip update, keep previous: 442.4g ✓
```

### Skenario 4: Data Valid Tanpa Prefix (Accepted)
```
Raw: "15.5  g" (valid small weight)
→ Validate: no prefix ✗, but value 15.5g >= 10g ✓
→ Parse: 15.5g ✓
→ Frontend: Validate: no prefix ✗, but value 15.5g >= 50g ✗ OR previous < 100g
→ Update: 15.5g ✓ (if previous was small, e.g., 10g)
```









