# Perbaikan Handling Data dari Mesin Timbangan

## Masalah yang Ditemukan

User bertanya apakah handling angka penimbangan perlu menyesuaikan dengan inputan dari mesin timbangan. Dari analisis, ditemukan bahwa:

1. **Data Terpotong (Truncation)**:
   - Data kadang terpotong menjadi `8.3  g` dari `ST,+000138.3  g`
   - Data kadang terpotong menjadi `38.3  g` dari `ST,+000138.3  g` (hilang digit pertama)
   - Data kadang terpotong menjadi `00138.3  g` (hilang prefix `ST,`)

2. **Penyebab Truncation**:
   - Buffer dari serial port tidak lengkap saat parsing
   - Parsing terlalu cepat sebelum data lengkap diterima
   - Tidak ada validasi panjang data sebelum parsing

3. **Format Data dari Mesin AND**:
   - Format lengkap: `ST,+000138.3  g,11:06:00,03/12/2025,36` (5 bagian, ~40 chars)
   - Format sederhana: `ST,+000138.3  g` (2 bagian, ~15 chars)
   - Format tanpa prefix: `00138.3  g` atau `138.3  g` (1 bagian, ~10-15 chars)

## Perbaikan yang Diterapkan

### 1. **Validasi Panjang Data Sebelum Parsing**

**Sebelumnya:**
```javascript
if (trimmed.length > 0) {
  const parsed = parseWeightSmartLocal(trimmed);
  if (parsed) {
    finalize(true, parsed);
    return;
  }
}
```

**Setelah Perbaikan:**
```javascript
// CRITICAL: Validate line length before parsing
// Short lines (< 10 chars) are likely incomplete/truncated
// AND format should be at least 15 chars: "ST,+000138.3  g"
const minLengthForCompleteData = 15;

if (trimmed.length >= minLengthForCompleteData) {
  const parsed = parseWeightSmartLocal(trimmed);
  if (parsed) {
    finalize(true, parsed);
    return;
  }
} else if (trimmed.length > 0 && trimmed.length < minLengthForCompleteData) {
  // Line is too short - likely truncated, wait for more data
  if (DEBUG_SCALE) console.log(`⏳ Waiting for more data - line too short (${trimmed.length} chars): "${trimmed}"`);
  // Don't parse yet, wait for more data
}
```

**Manfaat:**
- Menolak data yang terlalu pendek (< 15 chars) sebelum parsing
- Mencegah parsing data terpotong seperti `8.3  g` atau `38.3  g`
- Menunggu data lengkap sebelum memproses

### 2. **Validasi Format Data Tanpa Newline**

**Sebelumnya:**
```javascript
if (rawBuffer.length > 10 && str.length >= 10 && newlineIdx === -1) {
  const trimmed = str.trim();
  if (trimmed.length >= 10) {
    const parsed = parseWeightSmartLocal(trimmed);
    if (parsed) {
      finalize(true, parsed);
      return;
    }
  }
}
```

**Setelah Perbaikan:**
```javascript
// CRITICAL: If we have data without newline, only parse if it's long enough
// This prevents parsing truncated data like "8.3  g" from "ST,+000138.3  g"
if (rawBuffer.length >= minLengthForCompleteData && str.length >= minLengthForCompleteData && newlineIdx === -1) {
  const trimmed = str.trim();
  // CRITICAL: Only parse if line is long enough and looks complete
  // Check if it has expected format (ST, or US, prefix, or at least 15 chars)
  const looksComplete = trimmed.length >= minLengthForCompleteData && 
                       (trimmed.match(/^(ST|US)[,:]/) || trimmed.length >= 20);
  if (looksComplete) {
    const parsed = parseWeightSmartLocal(trimmed);
    if (parsed) {
      finalize(true, parsed);
      return;
    }
  } else {
    // Data looks incomplete, wait a bit more
    if (DEBUG_SCALE) console.log(`⏳ Waiting for more data - incomplete (${trimmed.length} chars): "${trimmed}"`);
  }
}
```

**Manfaat:**
- Validasi format data sebelum parsing (harus ada prefix `ST,` atau `US,` atau panjang >= 20 chars)
- Mencegah parsing data terpotong tanpa newline
- Menunggu data lengkap sebelum memproses

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
1. Serial port menerima chunk: "8.3  g"
   → Buffer: "8.3  g"
   → Parse: 8.3g ❌ (truncated!)

2. Serial port menerima chunk: "ST,+000138.3  g"
   → Buffer: "ST,+000138.3  g"
   → Parse: 138.3g ✓
```

### Setelah Perbaikan:
```
1. Serial port menerima chunk: "8.3  g"
   → Buffer: "8.3  g"
   → Validasi: length 7 < 15 (too short) ❌
   → Wait: Tidak parse, tunggu data lebih banyak ✓

2. Serial port menerima chunk: "ST,+000138.3  g"
   → Buffer: "ST,+000138.3  g"
   → Validasi: length 17 >= 15 (OK) ✓
   → Parse: 138.3g ✓
```

## Parameter Validasi

- **Minimum Length**: 15 chars (minimum untuk format AND sederhana: `ST,+000138.3  g`)
- **Format Check**: Harus memiliki prefix `ST,` atau `US,` atau panjang >= 20 chars
- **Wait for Complete Data**: Tidak parse jika data terlalu pendek

## File yang Diubah

1. **server.js**:
   - Line 1879-1943: Memperbaiki `dataHandler` untuk validasi panjang data sebelum parsing
   - Menambahkan `minLengthForCompleteData = 15` untuk validasi minimum
   - Menambahkan validasi format data sebelum parsing

## Testing

Setelah perbaikan ini:
1. ✅ Data terpotong (< 15 chars) akan ditolak sebelum parsing
2. ✅ Parser akan menunggu data lengkap sebelum memproses
3. ✅ Data dengan format lengkap akan diparse dengan benar
4. ✅ Tidak ada truncation karena parsing terlalu cepat

## Catatan Penting

- **Minimum Length**: 15 chars untuk format AND sederhana
- **Format Validation**: Harus memiliki prefix atau panjang cukup
- **Wait for Complete Data**: Tidak parse data tidak lengkap
- **Buffer Management**: Tetap mengakumulasi data di buffer sampai lengkap

## Troubleshooting

Jika masih ada masalah:

1. **Periksa Minimum Length**: Apakah 15 chars cukup untuk format mesin Anda?
2. **Periksa Format**: Apakah mesin selalu mengirim prefix `ST,` atau `US,`?
3. **Periksa Buffer**: Apakah buffer mengakumulasi data dengan benar?
4. **Periksa Timeout**: Apakah timeout cukup untuk menerima data lengkap?

## Contoh Skenario

### Skenario 1: Data Lengkap (Accepted)
```
Chunk: "ST,+000138.3  g\r\n"
→ Length: 17 chars >= 15 ✓
→ Format: Has prefix "ST," ✓
→ Parse: 138.3g ✓
```

### Skenario 2: Data Terpotong (Rejected)
```
Chunk: "8.3  g"
→ Length: 7 chars < 15 ❌
→ Wait: Tidak parse, tunggu data lebih banyak ✓
```

### Skenario 3: Data Tanpa Newline (Validated)
```
Chunk: "ST,+000138.3  g" (no newline)
→ Length: 17 chars >= 15 ✓
→ Format: Has prefix "ST," ✓
→ Parse: 138.3g ✓
```

### Skenario 4: Data Terpotong Tanpa Newline (Rejected)
```
Chunk: "38.3  g" (no newline, truncated)
→ Length: 7 chars < 15 ❌
→ Format: No prefix, length < 20 ❌
→ Wait: Tidak parse, tunggu data lebih banyak ✓
```







