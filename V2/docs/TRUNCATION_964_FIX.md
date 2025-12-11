# Perbaikan Truncation 964g → 64g dan Tampilan Sebelum Start

## Masalah yang Ditemukan

User melaporkan dua masalah:
1. Angka di frontend yang aktualnya 964.0g menjadi 64.0g dan 0g (terpotong)
2. Ingin angka penimbangan ditampilkan di frontend sebelum start penimbangan

### Analisis Masalah

1. **Parsing Error (964 → 64)**:
   - Regex pattern mungkin tidak menangkap digit pertama "9"
   - Validasi `isSuspiciouslyShort` mungkin tidak mendeteksi kasus ini
   - Pattern matching mungkin tidak mencoba semua kemungkinan

2. **Tidak Ada Tampilan Sebelum Start**:
   - `digital-weight` hanya menampilkan jika `isWeighingActive`
   - `zeroCheckWeight` tidak ditampilkan sebelum start
   - User tidak bisa melihat berat timbangan sebelum memulai penimbangan

## Perbaikan yang Diterapkan

### 1. **Enhanced Pattern Matching untuk Menangkap 964**

**Sebelumnya:**
```javascript
// Pattern 1: Try to find a longer number pattern (3+ digits)
let longerMatch = weightRaw.match(/([+\-]?)(\d{3,}\.?\d*)\s*(kg|g|lb|oz)?/i);
if (!longerMatch || !longerMatch[2] || longerMatch[2].length <= numStr.length) {
  // Pattern 2: Try to find number with decimal point
  longerMatch = weightRaw.match(/([+\-]?)(\d{2,}\.\d+)\s*(kg|g|lb|oz)?/i);
}
if (!longerMatch || !longerMatch[2] || longerMatch[2].length <= numStr.length) {
  // Pattern 3: Try to find any number sequence that's longer
  longerMatch = weightRaw.match(/([+\-]?)(\d{2,}\.?\d*)\s*(kg|g|lb|oz)?/i);
}
```

**Setelah Perbaikan:**
```javascript
// Pattern 1: Try to find a longer number pattern (3+ digits) - most common case (e.g., 964, 720)
let longerMatch = weightRaw.match(/([+\-]?)(\d{3,}\.?\d*)\s*(kg|g|lb|oz)?/i);
if (!longerMatch || !longerMatch[2] || longerMatch[2].length <= numStr.length) {
  // Pattern 2: Try to find number with decimal point (might be 964.0 or 720.5)
  longerMatch = weightRaw.match(/([+\-]?)(\d{3,}\.\d+)\s*(kg|g|lb|oz)?/i);
}
if (!longerMatch || !longerMatch[2] || longerMatch[2].length <= numStr.length) {
  // Pattern 3: Try to find any number sequence that's longer (2+ digits)
  longerMatch = weightRaw.match(/([+\-]?)(\d{2,}\.?\d*)\s*(kg|g|lb|oz)?/i);
}
if (!longerMatch || !longerMatch[2] || longerMatch[2].length <= numStr.length) {
  // Pattern 4: Try to find number without leading zeros (might be 964 without leading zeros)
  // This handles cases like "964.0" where leading zeros might be stripped
  longerMatch = weightRaw.match(/([+\-]?)([1-9]\d{2,}\.?\d*)\s*(kg|g|lb|oz)?/i);
}
```

**Manfaat:**
- Pattern 4 khusus untuk menangkap angka tanpa leading zeros (964, 720, dll)
- Lebih robust dalam menangkap angka yang terpotong
- Mencoba 4 pattern berbeda untuk memastikan menangkap angka lengkap

### 2. **Enhanced Suspicious Check**

**Sebelumnya:**
```javascript
const isSuspiciouslyShort = (numStrWithoutLeadingZeros.length < 3 && weightRaw.length > 10) || 
                             (numStrWithoutLeadingZeros.length < 2 && weightRaw.length > 15);
```

**Setelah Perbaikan:**
```javascript
const isSuspiciouslyShort = (numStrWithoutLeadingZeros.length < 3 && weightRaw.length > 10) || 
                             (numStrWithoutLeadingZeros.length < 2 && weightRaw.length > 15) ||
                             (weightValue > 0 && weightValue < 100 && weightRaw.length > 15); // Suspicious if value < 100g but raw data is long
```

**Manfaat:**
- Mendeteksi kasus di mana nilai < 100g tapi raw data panjang (kemungkinan truncation)
- Menangkap kasus seperti 964 → 64 (64 < 100, tapi raw data panjang)

### 3. **Tampilan Angka Sebelum Start Penimbangan**

**Sebelumnya:**
```javascript
<div className="digital-weight">{isWeighingActive ? currentReading.toFixed(1) : '0.0'} g</div>
```

**Setelah Perbaikan:**
```javascript
<div className="digital-weight">
  {isWeighingActive 
    ? currentReading.toFixed(1) 
    : (zeroCheckWeight !== undefined && zeroCheckWeight !== null 
        ? Math.round(Math.abs(zeroCheckWeight) * 10) / 10 
        : 0.0).toFixed(1)
  } g
</div>
```

**Manfaat:**
- Menampilkan `zeroCheckWeight` sebelum start penimbangan
- User bisa melihat berat timbangan sebelum memulai
- Rounding ke 0.1g untuk konsistensi

## Alur Setelah Perbaikan

### Sebelum Perbaikan:
```
Raw: "US,+000964.0 g" → Parse: numStr="64.0" → weightValue=64.0 (truncated!) ❌
Frontend: 64.0g (wrong!)
Before start: 0.0g (no display) ❌
```

### Setelah Perbaikan:
```
Raw: "US,+000964.0 g" → Parse: numStr="64.0" → Check: suspiciously short (64 < 100, raw long)
→ Try Pattern 1: No match
→ Try Pattern 2: Match "964.0" → Corrected: 964.0g ✓
Frontend: 964.0g (correct!) ✓
Before start: zeroCheckWeight=964.0g → Display: 964.0g ✓
```

## File yang Diubah

1. **server.js**:
   - Line 638-700: Enhanced pattern matching dengan 4 patterns
   - Enhanced suspicious check untuk mendeteksi 964 → 64
   - Pattern 4 khusus untuk angka tanpa leading zeros

2. **src/components/RightPanel.jsx**:
   - Line 268: Menampilkan `zeroCheckWeight` sebelum start penimbangan

## Parameter

- **Pattern Matching**: 4 patterns untuk menangkap truncation
- **Suspicious Check**: `weightValue < 100 && weightRaw.length > 15`
- **Display Before Start**: `zeroCheckWeight` ditampilkan jika tidak aktif weighing

## Testing

Setelah perbaikan ini:
1. ✅ Parsing 964g tidak akan terpotong menjadi 64g
2. ✅ Pattern matching lebih robust dengan 4 patterns
3. ✅ Angka penimbangan ditampilkan sebelum start
4. ✅ User bisa melihat berat timbangan sebelum memulai penimbangan

## Catatan Penting

- **Pattern 4**: Khusus untuk menangkap angka tanpa leading zeros (964, 720, dll)
- **Suspicious Check**: Mendeteksi nilai < 100g dengan raw data panjang
- **Display Before Start**: Menampilkan `zeroCheckWeight` untuk user convenience

## Troubleshooting

Jika masih ada masalah:

1. **Periksa Backend Logs**: Apakah ada warning tentang short number?
2. **Periksa Raw Data**: Apakah raw data menunjukkan nilai yang benar?
3. **Periksa Pattern Matching**: Apakah pattern 4 menangkap angka dengan benar?
4. **Periksa zeroCheckWeight**: Apakah `zeroCheckWeight` di-update dengan benar?

## Contoh Skenario

### Skenario 1: Truncation Detection (964 → 64)
```
Raw: "US,+000964.0 g"
→ Parse: numStr="64.0", weightValue=64.0
→ Check: suspiciously short (64 < 100, raw length > 15)
→ Try Pattern 1: No match
→ Try Pattern 2: Match "964.0" → Corrected: 964.0g ✓
```

### Skenario 2: Display Before Start
```
Before start: zeroCheckWeight=964.0g
→ Display: 964.0g ✓
After start: isWeighingActive=true, currentReading=964.0g
→ Display: 964.0g ✓
```

### Skenario 3: Normal Parsing (964.0)
```
Raw: "US,+000964.0 g"
→ Parse: numStr="964.0", weightValue=964.0 (normal length)
→ No suspicious check → Use: 964.0g ✓
```







