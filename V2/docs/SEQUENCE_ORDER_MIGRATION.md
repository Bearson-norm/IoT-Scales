# Migration: Sequence Order untuk Urutan Import Ingredients

## Deskripsi
Migration ini menambahkan kolom `sequence_order` ke tabel `master_formulation_ingredients` untuk menyimpan urutan import ingredients. Ini memastikan bahwa tampilan ingredients di Recipe Panel dan History selalu sesuai dengan urutan import.

## File Migration
- `database/migration-add-sequence-order.sql` - SQL migration script
- `scripts/update-sequence-order.bat` - Windows batch script untuk menjalankan migration

## Cara Menjalankan Migration

### Opsi 1: Menggunakan Batch Script (Windows)
1. Buka Command Prompt atau PowerShell
2. Jalankan:
   ```batch
   scripts\update-sequence-order.bat
   ```
3. Ikuti instruksi untuk memasukkan kredensial database

### Opsi 2: Manual dengan psql
```bash
psql -U postgres -d FLB_MOWS -f database/migration-add-sequence-order.sql
```

### Opsi 3: Menggunakan Database Client
1. Buka database client (pgAdmin, DBeaver, dll)
2. Buka file `database/migration-add-sequence-order.sql`
3. Jalankan script tersebut

## Apa yang Dilakukan Migration

1. **Menambahkan Kolom `sequence_order`**
   - Menambahkan kolom `sequence_order INTEGER` ke tabel `master_formulation_ingredients`
   - Default value: 0

2. **Update Data Existing**
   - Mengisi `sequence_order` untuk data yang sudah ada berdasarkan `created_at`
   - Menggunakan `ROW_NUMBER()` untuk menghitung urutan per formulation

3. **Set Default Value**
   - Set default value untuk record baru

## Setelah Migration

### Import Baru
**Ya, `sequence_order` akan otomatis dibuat saat import data baru!**

Saat Anda import formula baru melalui fitur import:
1. **Sistem membaca CSV secara berurutan** (baris demi baris)
2. **Mengelompokkan ingredients per formulation** sambil mempertahankan urutan CSV
3. **Otomatis mengisi `sequence_order`** berdasarkan urutan munculnya ingredient di CSV untuk setiap formulation
4. **Urutan dimulai dari 1** untuk setiap formulation

#### Contoh:
Jika CSV Anda seperti ini:
```
FormulationCode, ProductCode, TargetMass
FML001, PRD001, 100
FML001, PRD002, 200
FML001, PRD003, 300
FML002, PRD001, 50
FML002, PRD002, 75
```

Maka setelah import:
- **FML001**: PRD001 (sequence_order=1), PRD002 (sequence_order=2), PRD003 (sequence_order=3)
- **FML002**: PRD001 (sequence_order=1), PRD002 (sequence_order=2)

**Urutan ini akan dipertahankan di semua tampilan!**

#### Update Data Existing
Jika Anda import ulang formula yang sudah ada:
- `sequence_order` akan diupdate sesuai urutan baru di CSV
- Data lama akan diupdate dengan urutan baru

### Query yang Diupdate
Semua query yang mengambil ingredients sekarang menggunakan:
```sql
ORDER BY COALESCE(mfi.sequence_order, 999999), mfi.created_at ASC
```

Ini memastikan:
- Ingredients dengan `sequence_order` diurutkan berdasarkan nilai tersebut
- Ingredients tanpa `sequence_order` (data lama) diurutkan berdasarkan `created_at`

## Verifikasi

Setelah migration, verifikasi dengan query:
```sql
SELECT 
  mf.formulation_code,
  mp.product_code,
  mfi.sequence_order,
  mfi.created_at
FROM master_formulation_ingredients mfi
JOIN master_formulation mf ON mfi.formulation_id = mf.id
JOIN master_product mp ON mfi.product_id = mp.id
WHERE mf.formulation_code = 'YOUR_FORMULATION_CODE'
ORDER BY mfi.sequence_order, mfi.created_at;
```

## Troubleshooting

### Error: column "sequence_order" already exists
- Kolom sudah ada, migration sudah dijalankan sebelumnya
- Skip Step 1, lanjutkan ke Step 2 untuk update data

### Data tidak terurut dengan benar
- Pastikan migration Step 2 sudah dijalankan
- Cek apakah `sequence_order` sudah terisi dengan benar
- Untuk import baru, pastikan urutan di CSV sesuai dengan yang diinginkan

