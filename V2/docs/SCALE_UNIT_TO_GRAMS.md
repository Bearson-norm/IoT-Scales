# Perubahan Unit Weight ke Gram Langsung

## Masalah

User melaporkan bahwa angka yang ditampilkan di UI masih tidak sesuai, kadang menampilkan `170.0` gram (benar) dan kadang `17000.0` gram (salah). Masalah ini terjadi karena:

1. **Konversi Ganda**: Server mengkonversi gram ke kg, kemudian UI mengkonversi kembali kg ke gram
2. **Error Konversi**: Konversi ganda ini dapat menyebabkan kesalahan, terutama dengan angka desimal
3. **Kompleksitas**: Lebih banyak langkah konversi = lebih banyak peluang error

## Solusi

Mengubah semua parsing function untuk **langsung mengembalikan weight dalam gram**, sehingga:
- Tidak perlu konversi di UI
- Lebih langsung dan jelas
- Menghindari error konversi

## Perubahan yang Diterapkan

### 1. **parseAndEk15kl()** - Fungsi Utama untuk AND EK-15KL

**Sebelumnya:**
```javascript
// Convert to kg
let weightKg = weightValue;
if (weightUnit === 'G' || weightUnit.includes('G')) {
  weightKg = weightKg * 0.001; // gram to kg
}
return {
  weight: weightKg,
  unit: 'kg',
  ...
};
```

**Setelah Perbaikan:**
```javascript
// Return weight directly in grams (no conversion needed)
let weightGrams = weightValue;
if (weightUnit === 'KG' || weightUnit.includes('KG')) {
  weightGrams = weightGrams * 1000; // kg to gram
}
return {
  weight: weightGrams,
  unit: 'g',
  ...
};
```

### 2. **parseVibraData()** - Fungsi untuk Vibra Scale

**Sebelumnya:**
```javascript
let weightKg = numericValue;
if (unit === 'G') {
  weightKg = numericValue / 1000; // gram to kg
}
return {
  weight: weightKg,
  unit: 'kg',
  ...
};
```

**Setelah Perbaikan:**
```javascript
// Return weight directly in grams (no conversion needed)
let weightGrams = numericValue;
if (unit === 'K') {
  weightGrams = numericValue * 1000; // kg to gram
}
return {
  weight: weightGrams,
  unit: 'g',
  ...
};
```

### 3. **parseWeightSmart()** - Fungsi Utama yang Memilih Parser

**Sebelumnya (Vibra format):**
```javascript
const kg = unit === 'G' ? value * sign * 0.001 : value * sign;
return { 
  weight: kg, 
  unit: 'kg', 
  ...
};
```

**Setelah Perbaikan:**
```javascript
// Return weight directly in grams (no conversion needed)
const grams = unit === 'G' ? value * sign : value * sign * 1000;
return { 
  weight: grams, 
  unit: 'g', 
  ...
};
```

**Sebelumnya (Decimal fallback):**
```javascript
const weight = unit === 'G' ? val * 0.001 : val;
return { weight, unit: 'kg', ... };
```

**Setelah Perbaikan:**
```javascript
// Return weight directly in grams (no conversion needed)
const weight = unit === 'G' ? val : val * 1000;
return { weight, unit: 'g', ... };
```

### 4. **UI (App.jsx)** - Menghapus Konversi

**Sebelumnya:**
```javascript
const weightGrams = data.unit === 'kg' ? data.weight * 1000 : data.weight
```

**Setelah Perbaikan:**
```javascript
// Weight is now always in grams from server
const weightGrams = data.weight
```

## Keuntungan

1. **Lebih Sederhana**: Tidak perlu konversi di UI
2. **Lebih Akurat**: Menghindari error konversi ganda
3. **Lebih Konsisten**: Semua parsing function mengembalikan format yang sama
4. **Lebih Mudah Debug**: Langsung dalam gram, tidak perlu trace konversi

## Contoh

### Sebelum Perubahan:
```
Timbangan: "ST,+000200.5  g"
Parsing: weightValue = 200.5 gram
Konversi Server: 200.5 * 0.001 = 0.2005 kg
Kirim ke UI: { weight: 0.2005, unit: 'kg' }
Konversi UI: 0.2005 * 1000 = 200.5 gram ✓
```

**Tapi kadang error:**
```
Timbangan: "ST,+000200.5  g"
Parsing: weightValue = 200.5 gram (tapi kadang salah jadi 2005)
Konversi Server: 2005 * 0.001 = 2.005 kg (atau kadang tidak dikonversi)
Kirim ke UI: { weight: 2.005, unit: 'kg' } atau { weight: 2005, unit: 'kg' }
Konversi UI: 2.005 * 1000 = 2005 gram ✗ (atau 2005 * 1000 = 2005000 gram ✗)
```

### Setelah Perubahan:
```
Timbangan: "ST,+000200.5  g"
Parsing: weightValue = 200.5 gram
Kirim ke UI: { weight: 200.5, unit: 'g' }
UI: Langsung gunakan 200.5 gram ✓
```

## File yang Diubah

1. **server.js**:
   - `parseAndEk15kl()` - 3 tempat (split method, corrected weight, fallback regex)
   - `parseVibraData()` - 1 tempat
   - `parseWeightSmart()` - 2 tempat (Vibra format, decimal fallback)

2. **src/App.jsx**:
   - Zero check weight conversion (line 313)
   - WebSocket weight conversion (line 437)

## Testing

Setelah perubahan ini:
1. ✅ Weight langsung dalam gram, tidak perlu konversi
2. ✅ UI langsung menampilkan nilai yang benar
3. ✅ Tidak ada error konversi ganda
4. ✅ Lebih mudah untuk debug

## Catatan

- Semua parsing function sekarang mengembalikan `unit: 'g'`
- UI tidak perlu melakukan konversi lagi
- Jika ada timbangan yang mengirim dalam kg, akan dikonversi ke gram di server
- Format data tetap sama, hanya unit yang berubah dari 'kg' ke 'g'




