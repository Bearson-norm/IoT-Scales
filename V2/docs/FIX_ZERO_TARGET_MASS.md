# Fix Zero Target Mass Import Issue

## Masalah

Saat mengimpor database CSV, ada beberapa nilai `target_mass` di tabel `master_formulation_ingredients` yang terimport sebagai `0` padahal seharusnya nilai yang valid seperti `0.5`.

## Penyebab

Masalah ini terjadi karena:

1. **Format desimal yang berbeda**: Jika CSV menggunakan koma (`,`) sebagai pemisah desimal (format regional, misalnya `0,5`), fungsi `parseFloat()` JavaScript tidak dapat mem-parse dengan benar dan menghasilkan nilai `0`.
2. **Spasi atau karakter tambahan**: Jika ada spasi atau karakter tambahan di sekitar angka, parsing bisa gagal.
3. **Nilai kosong atau null**: Jika kolom `targetMass` kosong, akan di-set menjadi `0`.

## Solusi yang Telah Diterapkan

Kode telah diperbaiki di beberapa file:

### 1. `server.js` - Import Database Endpoint
- **Baris ~8020**: Parsing `targetMass` sekarang lebih robust
- Menangani format desimal dengan koma (`,`) dan titik (`.`)
- Trim whitespace
- Validasi NaN dan log warning jika ada nilai yang tidak valid

### 2. `server.js` - Preview Import Endpoint
- **Baris ~7652**: Parsing `targetMass` diperbaiki dengan cara yang sama

### 3. `src/utils/formulaImport.js`
- Parsing semua nilai numerik (targetMass, totalMass, min, max, dll.) diperbaiki
- Menangani format desimal yang berbeda

## Cara Memperbaiki Data yang Sudah Terimport

### Opsi 1: Re-import CSV (Direkomendasikan)

1. **Pastikan CSV menggunakan format yang benar**:
   - Gunakan titik (`.`) sebagai pemisah desimal, bukan koma (`,`)
   - Contoh: `0.5` bukan `0,5`
   - Pastikan tidak ada spasi di sekitar angka

2. **Jalankan Full Refresh Import**:
   - Buka aplikasi
   - Pergi ke menu Database Import
   - Centang opsi "Full Refresh"
   - Upload file CSV yang sudah diperbaiki
   - Kode yang diperbaiki akan mem-parse nilai dengan benar

### Opsi 2: Manual Fix via SQL

1. **Identifikasi data yang bermasalah**:

```bash
# Windows
cd scripts
check-zero-target-mass.bat
```

Atau jalankan query SQL langsung:

```sql
SELECT 
    mfi.id,
    mf.formulation_code,
    mf.formulation_name,
    mp.product_code,
    mp.product_name,
    mfi.target_mass
FROM master_formulation_ingredients mfi
INNER JOIN master_formulation mf ON mfi.formulation_id = mf.id
INNER JOIN master_product mp ON mfi.product_id = mp.id
WHERE mfi.target_mass = 0
ORDER BY mf.formulation_code, mfi.sequence_order;
```

2. **Update nilai yang salah**:

Gunakan template SQL ini (sesuaikan dengan data Anda):

```sql
-- Contoh: Memperbaiki target_mass untuk formulation tertentu
UPDATE master_formulation_ingredients 
SET target_mass = 0.5, updated_at = CURRENT_TIMESTAMP
WHERE formulation_id = (
    SELECT id FROM master_formulation 
    WHERE formulation_code = 'KODE_FORMULATION_ANDA'
)
AND product_id = (
    SELECT id FROM master_product 
    WHERE product_code = 'KODE_PRODUCT_ANDA'
)
AND target_mass = 0;
```

3. **Verifikasi hasil**:

```sql
SELECT 
    mf.formulation_code,
    mp.product_code,
    mfi.target_mass,
    mfi.updated_at
FROM master_formulation_ingredients mfi
INNER JOIN master_formulation mf ON mfi.formulation_id = mf.id
INNER JOIN master_product mp ON mfi.product_id = mp.id
WHERE mf.formulation_code = 'KODE_FORMULATION_ANDA'
ORDER BY mfi.sequence_order;
```

## Pencegahan di Masa Depan

1. **Format CSV**:
   - Selalu gunakan titik (`.`) untuk desimal: `0.5`, `1.25`, `100.75`
   - Hindari koma (`,`) untuk desimal kecuali menggunakan aplikasi yang mendukung regional format
   - Pastikan tidak ada spasi di kolom numerik

2. **Validasi Sebelum Import**:
   - Gunakan fitur "Preview Import" untuk melihat data sebelum import final
   - Periksa apakah ada warning tentang nilai yang tidak valid di console/log

3. **Testing**:
   - Test dengan sample data kecil terlebih dahulu
   - Verifikasi hasil import sebelum menggunakan data untuk production

## File yang Diperbaiki

- `server.js` (2 lokasi: import dan preview endpoints)
- `src/utils/formulaImport.js`
- `database/migrations/fix-zero-target-mass.sql` (helper SQL)
- `scripts/check-zero-target-mass.bat` (helper script)

## Catatan Teknis

### Perubahan Parsing:

**Sebelum:**
```javascript
const targetMass = parseFloat(row.targetMass || row.target_mass || 0) || 0;
```

**Sesudah:**
```javascript
// Parse targetMass more robustly
let targetMassStr = (row.targetMass || row.target_mass || '0').toString().trim();
// Replace comma with period for decimal separator (support regional formats)
targetMassStr = targetMassStr.replace(',', '.');
const targetMass = parseFloat(targetMassStr);

// Validate: if parsing failed (NaN), log warning and skip/use 0
if (isNaN(targetMass)) {
    console.warn(`⚠️  Invalid targetMass value...`);
}
```

Perbaikan ini:
- Convert ke string dan trim whitespace
- Replace koma dengan titik untuk mendukung regional format
- Validasi hasil parsing (check NaN)
- Log warning untuk debugging

## Kontak

Jika masih mengalami masalah, periksa:
1. Log console saat import untuk warning tentang nilai yang tidak valid
2. Format CSV original Anda
3. Pastikan semua nilai numerik menggunakan format yang benar
