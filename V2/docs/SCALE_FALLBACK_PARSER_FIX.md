# Perbaikan Fallback Parser untuk Format Tanpa Prefix

## Masalah yang Ditemukan

Dari log terminal, ditemukan bahwa parsing menghasilkan nilai yang salah untuk format tanpa prefix:
- `✅ Parsed: 44400g (44.4kg), stable: true, raw: "44.4  g"` - **SALAH!** Seharusnya 44.4g
- `✅ Parsed: 44400g (44.4kg), stable: true, raw: "0044.4  g"` - **SALAH!** Seharusnya 44.4g
- `✅ Parsed: 44400g (44.4kg), stable: true, raw: "00044.4  g"` - **SALAH!** Seharusnya 44.4g

### Analisis Masalah

Format dengan prefix sudah benar:
- `✅ Parsed (no newline): 44.4g (0.0444kg), raw: "ST,+000044.4  g"` - **BENAR!** ✓

Tapi format tanpa prefix menghasilkan nilai yang salah:
- `✅ Parsed: 44400g (44.4kg), stable: true, raw: "44.4  g"` - **SALAH!** ✗

**Penyebab:**
Fallback parser (DECIMAL_REGEX) menggunakan default unit 'K' (kg) jika unit tidak terdeteksi, sehingga:
- `val = 44.4`
- `unit = 'K'` (default, salah!)
- `weight = 44.4 * 1000 = 44400g` (SALAH!)

## Perbaikan yang Diterapkan

### 1. **Perbaikan Default Unit di Fallback Parser**

**Sebelumnya:**
```javascript
const unit = (mDec[2] || 'K'); // Default ke 'K' (kg) - SALAH untuk AND scale!
const weight = unit === 'G' ? val : val * 1000;
```

**Setelah Perbaikan:**
```javascript
// CRITICAL: For AND scale, if unit is not detected, assume it's in grams (not kg)
// Default to 'G' (gram) instead of 'K' (kg) to match AND scale behavior
const unit = (mDec[2] || 'G').toUpperCase();
// If unit is 'G' (gram), use value directly
// If unit is 'K' (kg), convert to grams
const weight = unit === 'K' ? val * 1000 : val;
```

**Manfaat:**
- Default unit sekarang 'G' (gram) untuk AND scale
- Jika unit tidak terdeteksi, asumsikan gram (bukan kg)
- Hanya konversi jika unit benar-benar 'K' (kg)

### 2. **Penambahan Support untuk Format Tanpa Prefix di parseAndEk15kl**

**Sebelumnya:**
```javascript
// Hanya menangani format dengan prefix (ST, atau US,)
if (parts.length >= 2) {
  status = parts[0].trim();
  weightRaw = parts[1].trim();
}
```

**Setelah Perbaikan:**
```javascript
// Format 3: Tanpa prefix (data tidak lengkap) - hanya angka dan unit
// Contoh: "44.4  g" atau "00044.4  g"
else if (parts.length === 1) {
  // Check if it looks like weight data (has number and unit)
  const hasWeightPattern = /[+\-]?\d+\.?\d*\s*[gkGK]+/i.test(cleaned);
  if (hasWeightPattern) {
    status = '';
    weightRaw = cleaned.trim();
  }
}
```

**Manfaat:**
- parseAndEk15kl sekarang juga bisa menangani format tanpa prefix
- Lebih robust untuk data yang tidak lengkap
- Tetap menggunakan logika parsing yang sama

### 3. **Penambahan Debug Logging**

```javascript
// Debug logging
if (DEBUG_SCALE) {
  console.log(`🔍 Fallback decimal parser - val: ${val}, unit: "${unit}", weight: ${weight}g, raw: "${raw}"`);
}
```

**Manfaat:**
- Memudahkan debugging untuk format tanpa prefix
- Melihat proses parsing step-by-step
- Mengidentifikasi masalah lebih cepat

## Contoh Perbaikan

### Sebelum Perbaikan:
```
Input: "44.4  g"
→ DECIMAL_REGEX: val = 44.4, unit = 'K' (default, salah!)
→ weight = 44.4 * 1000 = 44400g ✗
```

### Setelah Perbaikan:
```
Input: "44.4  g"
→ DECIMAL_REGEX: val = 44.4, unit = 'G' (default, benar!)
→ weight = 44.4g ✓
```

### Atau melalui parseAndEk15kl:
```
Input: "44.4  g"
→ parts.length = 1 (tanpa prefix)
→ hasWeightPattern = true
→ weightRaw = "44.4  g"
→ Parse sebagai 44.4g ✓
```

## Testing

Setelah perbaikan ini:
1. ✅ Format dengan prefix: "ST,+000044.4  g" → 44.4g ✓
2. ✅ Format tanpa prefix: "44.4  g" → 44.4g ✓ (sebelumnya 44400g ✗)
3. ✅ Format dengan leading zeros: "00044.4  g" → 44.4g ✓ (sebelumnya 44400g ✗)
4. ✅ Format tanpa unit: "44.4" → 44.4g ✓ (default ke gram)

## File yang Diubah

1. **server.js**:
   - Line 836-842: Perbaikan default unit dari 'K' ke 'G' di fallback parser
   - Line 600-605: Penambahan support untuk format tanpa prefix di parseAndEk15kl
   - Line 844-847: Penambahan debug logging

## Catatan Penting

- **Default unit sekarang 'G' (gram)** untuk AND scale
- **parseAndEk15kl lebih robust** untuk data yang tidak lengkap
- **Fallback parser tetap aktif** untuk format yang tidak sesuai AND format
- **Debug logging membantu** mengidentifikasi masalah

## Troubleshooting

Jika masih melihat nilai yang salah:

1. **Aktifkan DEBUG_SCALE=true** dan periksa log:
   - Apakah menggunakan fallback parser?
   - Apakah unit terdeteksi dengan benar?
   - Apakah default unit sudah 'G'?

2. **Periksa Format Data:**
   - Format lengkap: "ST,+000044.4  g" → parseAndEk15kl
   - Format tanpa prefix: "44.4  g" → parseAndEk15kl (baru) atau fallback parser
   - Format tanpa unit: "44.4" → fallback parser dengan default 'G'







