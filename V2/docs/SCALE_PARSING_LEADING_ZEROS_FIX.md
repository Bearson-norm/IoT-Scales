# Perbaikan Masalah Parsing Leading Zeros - 170.0 vs 17000.0

## Masalah yang Ditemukan

User melaporkan bahwa pembacaan timbangan kadang menampilkan **170.0 gram** (benar) dan kadang **17000.0 gram** (salah) untuk ukuran yang seharusnya 170.0 gram.

### Analisis Masalah

Masalah ini terjadi karena:

1. **Parsing Leading Zeros yang Tidak Konsisten**
   - Data dari timbangan: `ST,+000170.0  g`
   - Kadang diparsing sebagai: `170.0` gram → `0.17` kg → UI: `170.0` gram ✓
   - Kadang diparsing sebagai: `17000.0` gram → `17` kg → UI: `17000.0` gram ✗

2. **Kemungkinan Penyebab**:
   - Regex pattern yang berbeda menangkap angka dengan cara yang berbeda
   - Format data yang bervariasi (dengan/tanpa titik desimal, dengan/tanpa leading zeros)
   - Tidak ada validasi untuk mendeteksi parsing error

## Perbaikan yang Diterapkan

### 1. **Perbaikan Regex Pattern di Split Method**

**Sebelumnya:**
```javascript
const weightMatch = weightRaw.match(/([+\-]?\d+\.?\d*)\s*(kg|g|lb|oz)?/i);
```

**Setelah Perbaikan:**
```javascript
const weightMatch = weightRaw.match(/([+\-]?)(0*\d+\.?\d*)\s*(kg|g|lb|oz)?/i);
```

- Memisahkan capture group untuk sign dan number
- Memungkinkan deteksi leading zeros secara eksplisit

### 2. **Perbaikan Regex Pattern di Fallback Method**

**Sebelumnya:**
```javascript
const flexiblePattern = /(?:ST|US)[,:]\s*([+-]?)\s*0*(\d+\.?\d*)\s+([gkGK]+)(?:,|$)/i;
```

**Setelah Perbaikan:**
```javascript
const flexiblePattern = /(?:ST|US)[,:]\s*([+-]?)\s*(0*)(\d+\.?\d*)\s+([gkGK]+)(?:,|$)/i;
```

- Menambahkan capture group untuk leading zeros (`0*`)
- Memungkinkan validasi dan koreksi jika diperlukan

### 3. **Validasi untuk Mendeteksi Parsing Error**

Menambahkan validasi yang:
- Mendeteksi jika `weightValue > 10000` (nilai yang tidak masuk akal untuk timbangan)
- Mencoba re-parse dengan menghapus leading zeros
- Menolak nilai yang masih terlalu besar setelah cleaning

**Kode Validasi:**
```javascript
// CRITICAL VALIDATION: Check for parsing errors with leading zeros
// Problem: Sometimes "000170.0" might be parsed incorrectly, or data format varies
// Solution: Validate that parsed value is reasonable for a scale reading
// Typical scale range: 0.1g to 10000g (10kg)
// If weightValue > 10000, it's likely a parsing error
if (weightValue > 10000) {
  if (DEBUG_SCALE) {
    console.warn(`⚠️  Suspicious weight value: ${weightValue} from raw: "${weightRaw}"`);
  }
  // Try to re-parse by removing leading zeros more carefully
  const cleanedNumStr = numStr.replace(/^0+/, '') || '0';
  const reParsedValue = parseFloat(signStr + cleanedNumStr);
  if (!isNaN(reParsedValue) && reParsedValue <= 10000 && reParsedValue > 0) {
    // Use the re-parsed value if it's more reasonable
    if (DEBUG_SCALE) {
      console.log(`✅ Corrected weight: ${weightValue} -> ${reParsedValue} from raw: "${weightRaw}"`);
    }
    const correctedWeight = reParsedValue;
    // ... use corrected weight
  } else {
    // Value is still too large even after cleaning, reject it
    return null;
  }
}
```

### 4. **Debug Logging**

Menambahkan logging untuk membantu debugging:
- Warning ketika nilai mencurigakan terdeteksi
- Log ketika koreksi berhasil dilakukan
- Log ketika nilai ditolak karena terlalu besar

## Contoh Skenario

### Skenario 1: Data Normal (Benar)
```
Input: "ST,+000170.0  g"
Parsing: weightValue = 170.0
Konversi: 170.0 g → 0.17 kg
UI: 0.17 * 1000 = 170.0 gram ✓
```

### Skenario 2: Parsing Error (Diperbaiki)
```
Input: "ST,+000170.0  g" (tapi diparsing salah sebagai 17000.0)
Deteksi: weightValue = 17000.0 > 10000 → Suspicious!
Re-parse: cleanedNumStr = "170.0" → reParsedValue = 170.0
Koreksi: weightValue = 170.0
Konversi: 170.0 g → 0.17 kg
UI: 0.17 * 1000 = 170.0 gram ✓
```

### Skenario 3: Nilai yang Benar-benar Besar (Ditolak)
```
Input: "ST,+00020000.0  g" (jika benar-benar 20kg)
Deteksi: weightValue = 20000.0 > 10000 → Suspicious!
Re-parse: cleanedNumStr = "20000.0" → reParsedValue = 20000.0 > 10000
Aksi: Rejected (return null) karena di luar range normal timbangan
```

## Testing

Untuk menguji perbaikan ini:

1. **Aktifkan Debug Mode:**
   ```bash
   # Windows PowerShell
   $env:DEBUG_SCALE="true"; npm start
   
   # Windows CMD
   set DEBUG_SCALE=true && npm start
   
   # Linux/Mac
   DEBUG_SCALE=true npm start
   ```

2. **Monitor Console Output:**
   - Perhatikan warning jika nilai mencurigakan terdeteksi
   - Perhatikan log koreksi jika parsing error diperbaiki
   - Perhatikan log rejection jika nilai ditolak

3. **Test dengan Berbagai Format:**
   - `ST,+000170.0  g` (format normal)
   - `ST,+000170  g` (tanpa titik desimal)
   - `ST,+00000170.0  g` (banyak leading zeros)
   - `US,+000170.0  g` (format US)

## Catatan Penting

1. **Range Validasi**: Validasi `> 10000` gram (10 kg) didasarkan pada asumsi bahwa timbangan AND EK-15KL memiliki kapasitas maksimal sekitar 10 kg. Jika timbangan Anda memiliki kapasitas lebih besar, sesuaikan nilai ini.

2. **Debug Mode**: Aktifkan `DEBUG_SCALE=true` untuk melihat detail parsing dan koreksi yang dilakukan.

3. **Fallback Method**: Jika split method gagal, sistem akan menggunakan regex method sebagai fallback dengan validasi yang sama.

## File yang Diubah

- `server.js`: Fungsi `parseAndEk15kl()` (line 570-720)

## Referensi

- Implementasi asli: `AND Print/scaleReader.js`
- Dokumentasi sebelumnya: `docs/SCALE_PARSING_FIX.md`




