# Summary: Perbaikan Masalah Import Target Mass

## Masalah yang Ditemukan
Tabel `master_formulation_ingredients` di kolom `target_mass` ada nilai yang terimport sebagai `0` padahal seharusnya `0.5` (atau nilai desimal lainnya).

## Penyebab Root Cause
1. **Format desimal regional**: CSV menggunakan koma (`,`) sebagai pemisah desimal (misal: `0,5`) sedangkan `parseFloat()` JavaScript hanya mengerti titik (`.`)
2. **Whitespace**: Nilai dengan spasi tambahan tidak ter-parse dengan benar
3. **Handling error lemah**: Kode sebelumnya menggunakan `|| 0` yang mengubah semua nilai NaN menjadi 0

## Perbaikan yang Dilakukan

### 1. Kode Server (server.js)
**Lokasi:** 2 tempat
- Import Database Endpoint (~baris 8020)
- Preview Import Endpoint (~baris 7652)

**Perubahan:**
```javascript
// SEBELUM (BERMASALAH):
const targetMass = parseFloat(row.targetMass || row.target_mass || 0) || 0;

// SESUDAH (DIPERBAIKI):
let targetMassStr = (row.targetMass || row.target_mass || '0').toString().trim();
targetMassStr = targetMassStr.replace(',', '.');  // Support regional format
const targetMass = parseFloat(targetMassStr);

if (isNaN(targetMass)) {
    console.warn(`⚠️  Invalid targetMass...`);
    // Log warning untuk debugging
}
```

**Fitur Baru:**
- ✅ Trim whitespace otomatis
- ✅ Support format desimal dengan koma (0,5 → 0.5)
- ✅ Validasi NaN dengan warning log
- ✅ Better error handling

### 2. Utility Import (src/utils/formulaImport.js)
Diperbaiki parsing untuk semua nilai numerik:
- `targetMass`
- `totalMass`
- `min`, `max`
- `maxAllowedWeighingQty`

### 3. Tools & Dokumentasi Baru

#### Scripts Bantuan:
1. **scripts/check-zero-target-mass.bat**
   - Cek semua ingredient dengan target_mass = 0
   - Tampilkan detail: formulation_code, product_code, dll

2. **scripts/run-fix-zero-target-mass.bat**
   - Jalankan migration SQL
   - Identifikasi data yang perlu diperbaiki

#### SQL Migration:
**database/migrations/fix-zero-target-mass.sql**
- Query untuk identifikasi masalah
- Template untuk manual update
- Panduan verifikasi

#### Dokumentasi Lengkap:
**docs/FIX_ZERO_TARGET_MASS.md**
- Penjelasan masalah detail
- 2 opsi solusi (re-import atau manual fix)
- Step-by-step guide
- Best practices

## Cara Memperbaiki Data yang Sudah Ada

### OPSI 1: Re-import CSV (DIREKOMENDASIKAN) ⭐

1. **Buka file CSV asli**
2. **Pastikan format desimal benar:**
   - Gunakan TITIK (`.`) bukan koma (`,`)
   - Contoh: `0.5` ✅ bukan `0,5` ❌
   - Contoh: `12.75` ✅ bukan `12,75` ❌
3. **Save CSV dengan format yang benar**
4. **Di aplikasi:**
   - Buka menu Database Import
   - ✅ Centang "Full Refresh"
   - Upload CSV yang sudah diperbaiki
5. **Kode yang diperbaiki akan handle dengan benar**

### OPSI 2: Manual Fix via SQL

```bash
# 1. Identifikasi masalah
cd scripts
check-zero-target-mass.bat

# 2. Lihat hasil, catat formulation & product code yang salah

# 3. Update manual (gunakan pgAdmin atau psql)
```

Contoh SQL update:
```sql
UPDATE master_formulation_ingredients 
SET target_mass = 0.5, updated_at = CURRENT_TIMESTAMP
WHERE formulation_id = (
    SELECT id FROM master_formulation 
    WHERE formulation_code = 'FML001'
)
AND product_id = (
    SELECT id FROM master_product 
    WHERE product_code = 'PRD001'
)
AND target_mass = 0;
```

## Pencegahan di Masa Depan

### ✅ Format CSV yang Benar:
```
formulationCode,formulationName,productCode,productName,targetMass
FML001,Formula A,PRD001,Ingredient A,0.5
FML001,Formula A,PRD002,Ingredient B,1.25
FML002,Formula B,PRD003,Ingredient C,100.75
```

**PENTING:**
- Desimal pakai TITIK (`.`)
- Tidak ada spasi di nilai numerik
- Pastikan kolom targetMass tidak kosong

### ✅ Validasi:
1. Preview import dulu sebelum import final
2. Cek console log untuk warning
3. Verifikasi beberapa sample data setelah import

## Files yang Diubah/Dibuat

### Modified:
- ✏️ `server.js` (2 lokasi)
- ✏️ `src/utils/formulaImport.js`
- ✏️ `database/README.md`

### Created:
- ✨ `database/migrations/fix-zero-target-mass.sql`
- ✨ `release/database/migrations/fix-zero-target-mass.sql`
- ✨ `scripts/check-zero-target-mass.bat`
- ✨ `scripts/run-fix-zero-target-mass.bat`
- ✨ `docs/FIX_ZERO_TARGET_MASS.md`
- ✨ `docs/IMPORT_FIX_SUMMARY.md` (file ini)

## Testing

Untuk test perbaikan:
1. Buat CSV test dengan nilai desimal: 0.5, 1.25, 100.75
2. Import dengan preview dulu
3. Verifikasi nilai ter-parse dengan benar
4. Check console log tidak ada warning
5. Query database untuk konfirmasi nilai

```sql
SELECT 
    mf.formulation_code,
    mp.product_code,
    mfi.target_mass
FROM master_formulation_ingredients mfi
INNER JOIN master_formulation mf ON mfi.formulation_id = mf.id
INNER JOIN master_product mp ON mfi.product_id = mp.id
ORDER BY mf.formulation_code, mfi.sequence_order;
```

## Kontak & Support

Jika masih ada masalah:
1. ✅ Check console log saat import (ada warning?)
2. ✅ Verifikasi format CSV (pakai titik untuk desimal?)
3. ✅ Test dengan sample data kecil dulu
4. ✅ Baca dokumentasi lengkap di `docs/FIX_ZERO_TARGET_MASS.md`

---

**Status:** ✅ SELESAI - Ready to use
**Date:** 2026-02-14
**Impact:** Critical fix untuk data integrity
