# Perbaikan Debugging dan Parsing untuk Format AND Scale

## Masalah yang Ditemukan

Dari log terminal, parsing menghasilkan nilai yang tidak konsisten:
- "200kg", "200.1kg", "200100kg", "200200kg" - nilai yang sangat besar dan tidak konsisten
- Format dari RealTerm: "US,+000000.0  g" untuk 0 gram (benar)
- Tapi parsing menghasilkan nilai yang jauh berbeda

## Analisis Masalah

### Format Data dari Timbangan
```
US,+000000.0  g
```

Format ini memiliki:
- Status: "US" (atau "ST")
- Weight: "+000000.0" (dengan leading zeros dan decimal point)
- Unit: "g" (gram)

### Masalah Parsing

1. **Log Masih Menampilkan dalam kg**: Log masih menampilkan `parsed.weight` + "kg" padahal sudah dalam gram
2. **Kurang Debug Info**: Tidak ada logging detail untuk melihat proses parsing
3. **Validasi Kurang Ketat**: Nilai yang sangat besar (200100kg) tidak ditolak dengan benar

## Perbaikan yang Diterapkan

### 1. **Perbaikan Log Output**

**Sebelumnya:**
```javascript
if (DEBUG_SCALE) console.log(`✅ Parsed: ${parsed.weight}kg, stable: ${parsed.stable}`);
```

**Setelah Perbaikan:**
```javascript
if (DEBUG_SCALE) console.log(`✅ Parsed: ${parsed.weight}g (${parsed.weight/1000}kg), stable: ${parsed.stable}, raw: "${trimmed}"`);
```

**Manfaat:**
- Menampilkan nilai dalam gram (yang benar)
- Juga menampilkan dalam kg untuk referensi
- Menampilkan raw data untuk debugging

### 2. **Penambahan Debug Logging di Parsing**

**Di Split Method:**
```javascript
// Debug logging untuk melihat raw data
if (DEBUG_SCALE && weightRaw) {
  console.log(`🔍 Parsing AND format - status: "${status}", weightRaw: "${weightRaw}", parts.length: ${parts.length}`);
}

// Debug logging untuk melihat parsing detail
if (DEBUG_SCALE) {
  console.log(`🔍 Weight match - signStr: "${signStr}", numStr: "${numStr}", fullNumStr: "${fullNumStr}", weightValue: ${weightValue}, weightUnit: "${weightUnit}"`);
}

// Debug logging untuk melihat hasil akhir
if (DEBUG_SCALE) {
  console.log(`✅ Split method result - weightValue: ${weightValue}, weightUnit: "${weightUnit}", weightGrams: ${weightGrams}, raw: "${cleaned}"`);
}
```

**Di Fallback Regex Method:**
```javascript
// Debug logging untuk melihat hasil akhir fallback method
if (DEBUG_SCALE) {
  console.log(`✅ Fallback regex method result - weightValue: ${weightValue}, sign: ${sign}, unit: "${unit}", weightGrams: ${weightGrams}, raw: "${cleaned}"`);
}
```

### 3. **Validasi yang Lebih Ketat**

Validasi sudah ada untuk menolak nilai > 10000, tapi sekarang dengan logging yang lebih detail:
```javascript
if (weightValue > 10000) {
  if (DEBUG_SCALE) {
    console.warn(`⚠️  Suspicious weight value: ${weightValue} from raw: "${weightRaw}"`);
  }
  // Try to re-parse...
  // If still too large, reject it
  if (DEBUG_SCALE) {
    console.warn(`❌ Rejected weight value: ${weightValue} (too large) from raw: "${weightRaw}"`);
  }
  return null;
}
```

## Cara Menggunakan Debug Mode

### Aktifkan Debug Mode:
```bash
# Windows PowerShell
$env:DEBUG_SCALE="true"; npm start

# Windows CMD
set DEBUG_SCALE=true && npm start

# Linux/Mac
DEBUG_SCALE=true npm start
```

### Output yang Akan Dilihat:

1. **Raw Data Parsing:**
```
🔍 Parsing AND format - status: "US", weightRaw: "+000000.0  g", parts.length: 2
```

2. **Weight Match Details:**
```
🔍 Weight match - signStr: "+", numStr: "000000.0", fullNumStr: "+000000.0", weightValue: 0, weightUnit: "G"
```

3. **Final Result:**
```
✅ Split method result - weightValue: 0, weightUnit: "G", weightGrams: 0, raw: "US,+000000.0  g"
✅ Parsed: 0g (0kg), stable: true, raw: "US,+000000.0  g"
```

4. **Warning untuk Nilai Mencurigakan:**
```
⚠️  Suspicious weight value: 200100 from raw: "+000200.1  g"
✅ Corrected weight: 200100 -> 200.1 from raw: "+000200.1  g"
```

5. **Rejection untuk Nilai Terlalu Besar:**
```
❌ Rejected weight value: 200100 (too large) from raw: "+000200.1  g"
```

## Testing

Dengan debug mode aktif, Anda akan melihat:
1. ✅ Raw data yang diterima dari timbangan
2. ✅ Proses parsing step-by-step
3. ✅ Nilai akhir yang dihasilkan
4. ✅ Warning untuk nilai mencurigakan
5. ✅ Rejection untuk nilai yang tidak valid

## Troubleshooting

Jika masih melihat nilai yang salah:

1. **Aktifkan DEBUG_SCALE=true** dan periksa log:
   - Apakah raw data sudah benar?
   - Apakah parsing match sudah benar?
   - Apakah weightValue sudah benar sebelum konversi?

2. **Periksa Format Data:**
   - Pastikan format sesuai: "US,+000000.0  g" atau "ST,+000000.0  g"
   - Pastikan ada koma setelah status
   - Pastikan ada spasi sebelum unit

3. **Periksa Validasi:**
   - Apakah nilai > 10000 ditolak?
   - Apakah re-parsing berhasil?

## File yang Diubah

1. **server.js**:
   - Line 1675: Update log format untuk menampilkan gram
   - Line 1698: Update log format untuk menampilkan gram
   - Line 600-614: Tambah debug logging di split method
   - Line 678-683: Tambah debug logging untuk hasil akhir split method
   - Line 759-763: Tambah debug logging untuk hasil akhir fallback method

## Catatan Penting

- **Debug mode harus aktif** untuk melihat logging detail
- **Log sekarang menampilkan dalam gram** (yang benar)
- **Raw data ditampilkan** untuk memudahkan debugging
- **Validasi tetap aktif** untuk menolak nilai yang tidak masuk akal




