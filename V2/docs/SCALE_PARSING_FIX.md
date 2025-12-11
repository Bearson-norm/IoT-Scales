# Perbaikan Parsing Data Timbangan AND EK-15KL

## Masalah yang Ditemukan

Setelah membandingkan implementasi di folder `AND Print/scaleReader.js` dengan `server.js`, ditemukan beberapa perbedaan kritis yang menyebabkan pembacaan timbangan tidak akurat:

### 1. **Validasi yang Terlalu Ketat - Menolak Nilai Negatif dan Nol**
   - **Sebelumnya (server.js)**: 
     ```javascript
     if (isNaN(weightValue) || weightValue <= 0) {
       return null; // Menolak nilai negatif dan nol
     }
     ```
   - **Masalah**: Timbangan AND dapat mengirim nilai negatif (misalnya `-000000.8  g`) yang valid, tetapi kode menolaknya.
   - **Setelah Perbaikan**: Hanya menolak jika `isNaN(weightValue)`, sehingga nilai negatif dan nol diterima.

### 2. **Validasi yang Terlalu Ketat - Menolak Nilai > 10000**
   - **Sebelumnya (server.js)**:
     ```javascript
     if (weightValue > 10000) {
       return null; // Menolak nilai > 10000 gram
     }
     ```
   - **Masalah**: Validasi ini terlalu ketat dan dapat menolak nilai yang valid dalam kondisi tertentu.
   - **Setelah Perbaikan**: Validasi ini dihapus untuk mengikuti implementasi AND Print yang lebih fleksibel.

### 3. **Pembersihan Data yang Kurang Lengkap**
   - **Sebelumnya (server.js)**: Hanya menghapus `\r\n` dan karakter `?`.
   - **Setelah Perbaikan**: Menambahkan pembersihan karakter kontrol yang lebih lengkap seperti di AND Print:
     ```javascript
     cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
     cleaned = cleaned.replace(/\?([A-Za-z0-9\s,\.\-\+])/g, '$1');
     cleaned = cleaned.replace(/([A-Za-z0-9\s,\.\-\+])\?/g, '$1');
     ```

### 4. **Metode Parsing yang Berbeda**
   - **Sebelumnya (server.js)**: Hanya menggunakan regex pattern matching.
   - **Setelah Perbaikan**: Menggunakan metode split berdasarkan koma (seperti AND Print) sebagai metode utama, dengan regex sebagai fallback:
     - Format lengkap: `ST,-000000.8  g,11:06:00,03/12/2025,36` (5 bagian)
     - Format sederhana: `ST,+000000.0  g` (2 bagian)

### 5. **Regex Pattern yang Terlalu Ketat**
   - **Sebelumnya (server.js)**: Pattern `\d+\.\d+` mengharuskan adanya titik desimal.
   - **Setelah Perbaikan**: Pattern `\d+\.?\d*` memungkinkan titik desimal opsional (seperti AND Print).

## Perubahan yang Diterapkan

### File: `server.js` - Fungsi `parseAndEk15kl()`

1. **Pembersihan Data yang Lebih Lengkap**:
   - Menambahkan pembersihan karakter kontrol
   - Menambahkan pembersihan karakter `?` yang lebih canggih

2. **Metode Parsing Utama: Split Method**:
   - Menggunakan `split(',')` untuk memisahkan bagian-bagian data
   - Mendukung format lengkap (5 bagian) dan format sederhana (2 bagian)
   - Menggunakan regex pattern yang sama dengan AND Print: `/([+\-]?\d+\.?\d*)\s*(kg|g|lb|oz)?/i`

3. **Validasi yang Diperbaiki**:
   - Menghapus validasi `weightValue <= 0` (sekarang menerima nilai negatif dan nol)
   - Menghapus validasi `weightValue > 10000` (lebih fleksibel)
   - Hanya menolak jika parsing gagal (`isNaN`)

4. **Fallback Method**:
   - Tetap mempertahankan metode regex sebagai fallback jika split method gagal
   - Pattern regex diperbarui untuk mendukung titik desimal opsional

## Contoh Data yang Sekarang Dapat Diparsing dengan Benar

### Format Lengkap:
```
ST,-000000.8  g,11:06:00,03/12/2025,36
```
- **Sebelumnya**: Ditolak karena nilai negatif (`-0.8`)
- **Sekarang**: Diterima dan diparsing dengan benar → `-0.0008 kg`

### Format Sederhana:
```
ST,+000140.7  g
```
- **Sebelumnya**: Dapat diparsing, tetapi validasi terlalu ketat
- **Sekarang**: Diparsing dengan lebih akurat → `0.1407 kg`

### Nilai Nol:
```
ST,+000000.0  g
```
- **Sebelumnya**: Ditolak karena `weightValue <= 0`
- **Sekarang**: Diterima dan diparsing dengan benar → `0.0 kg`

## Testing

Setelah perbaikan ini, program seharusnya:
1. ✅ Menerima nilai negatif dari timbangan
2. ✅ Menerima nilai nol
3. ✅ Memproses data dengan karakter encoding error (karakter `?`)
4. ✅ Memproses format lengkap dan format sederhana
5. ✅ Lebih akurat dalam membaca berat dari timbangan AND EK-15KL

## Referensi

- Implementasi asli: `AND Print/scaleReader.js`
- Fungsi yang diperbaiki: `server.js` - `parseAndEk15kl()`
- Format data timbangan: Lihat `AND Print/README.md`




