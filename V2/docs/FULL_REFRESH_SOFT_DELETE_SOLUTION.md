# Solusi Full Refresh dengan Soft Delete

## 📋 Masalah

Ketika melakukan Full Refresh import database:
- Ingredients yang tidak ada di CSV baru masih muncul di WO baru
- Data history harus tetap dipertahankan (tidak bisa dihapus karena foreign key constraint)
- WO baru harus hanya menampilkan ingredients yang ada di master data terbaru

## ✅ Solusi: Soft Delete dengan Kolom `is_active`

### Konsep
- **Soft Delete**: Menandai data sebagai nonaktif (tidak menghapus)
- **History Preservation**: Data history tetap utuh karena ingredients tidak dihapus
- **Selective Loading**: WO baru hanya mengambil ingredients aktif, WO lama tetap menampilkan semua ingredients

### Implementasi

#### 1. Migration Database
Menambahkan kolom `is_active` ke tabel `master_formulation_ingredients`:
```sql
ALTER TABLE master_formulation_ingredients 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
```

**Cara menjalankan migration:**
```bash
# Windows
scripts\run-migration-is-active.bat

# Atau manual
psql -U postgres -d FLB_MOWS -f database\migrations\add_is_active_to_formulation_ingredients.sql
```

#### 2. Logika Import (Full Refresh)
Saat import dengan Full Refresh:
- Ingredients yang ada di CSV baru: `is_active = true`
- Ingredients yang tidak ada di CSV baru: `is_active = false` (bukan dihapus)
- History tetap utuh karena ingredients tidak dihapus

#### 3. Query untuk WO Baru
Endpoint `/api/formulations/:id/ingredients` (digunakan saat scan MO baru):
```sql
WHERE mfi.formulation_id = $1
  AND COALESCE(mfi.is_active, true) = true
  AND COALESCE(mp.status, 'active') = 'active'
```
**Hasil**: Hanya ingredients aktif yang ditampilkan untuk WO baru

#### 4. Query untuk WO Lama
Endpoint `/api/work-orders/:mo` (untuk WO yang sudah ada):
```sql
WHERE mfi.formulation_id = $2
  -- Include all ingredients (active and inactive) to preserve history
```
**Hasil**: Semua ingredients ditampilkan (termasuk yang inactive) untuk preserve history

## 🔄 Alur Kerja

### Scenario: SKU B dengan Ingredients A (sudah nonaktif)

1. **Import Database dengan Full Refresh**
   - Ingredients A tidak ada di CSV baru
   - System set `is_active = false` untuk Ingredients A
   - Ingredients A tetap ada di database (history preserved)

2. **Scan MO/WO Baru dengan SKU B**
   - Query hanya mengambil ingredients dengan `is_active = true`
   - Ingredients A tidak muncul (karena `is_active = false`)
   - ✅ WO baru hanya menampilkan ingredients yang ada di master data terbaru

3. **View WO Lama yang sudah ada**
   - Query mengambil semua ingredients (termasuk yang inactive)
   - Ingredients A tetap muncul di WO lama
   - ✅ History tetap utuh dan bisa dilihat

## 📊 Keuntungan

1. ✅ **History Preserved**: Data history tidak hilang karena ingredients tidak dihapus
2. ✅ **WO Baru Clean**: WO baru hanya menampilkan ingredients aktif
3. ✅ **No Foreign Key Issues**: Tidak ada masalah dengan foreign key constraint
4. ✅ **Reversible**: Bisa mengaktifkan kembali ingredients jika diperlukan
5. ✅ **Audit Trail**: Bisa melihat kapan ingredients di-deactivate

## 🚀 Cara Menggunakan

1. **Jalankan Migration** (sekali saja):
   ```bash
   scripts\run-migration-is-active.bat
   ```

2. **Import Database dengan Full Refresh**:
   - Centang checkbox "Full Refresh"
   - Upload CSV file
   - System akan otomatis:
     - Set `is_active = true` untuk ingredients yang ada di CSV
     - Set `is_active = false` untuk ingredients yang tidak ada di CSV

3. **Scan MO Baru**:
   - Hanya ingredients aktif yang akan muncul
   - Ingredients yang sudah nonaktif tidak akan muncul

4. **View WO Lama**:
   - Semua ingredients tetap muncul (termasuk yang inactive)
   - History tetap utuh

## 🔍 Verifikasi

Untuk memverifikasi bahwa solusi bekerja:

1. **Cek kolom is_active**:
   ```sql
   SELECT id, formulation_id, product_id, is_active 
   FROM master_formulation_ingredients 
   WHERE is_active = false;
   ```

2. **Cek WO baru** (harus hanya ingredients aktif):
   - Scan MO baru
   - Pastikan hanya ingredients aktif yang muncul

3. **Cek WO lama** (harus semua ingredients):
   - View WO lama yang sudah ada
   - Pastikan semua ingredients muncul (termasuk yang inactive)

## ⚠️ Catatan Penting

- Migration harus dijalankan **sebelum** menggunakan fitur Full Refresh
- Setelah migration, semua ingredients existing akan memiliki `is_active = true`
- Jika ingin mengaktifkan kembali ingredients yang sudah nonaktif, bisa update manual:
  ```sql
  UPDATE master_formulation_ingredients 
  SET is_active = true 
  WHERE id = '<ingredient_id>';
  ```
