# 🔧 Cara Mengatasi Error "Failed to fetch formulation ingredients"

## ❌ Masalah

Error yang muncul:
```
Error loading ingredients for formulation: Error: Failed to fetch formulation ingredients
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

## ✅ Solusi

### 1. Stop Server (Jika Masih Running)

Di terminal yang menjalankan server, tekan `Ctrl+C` untuk stop server.

Atau jalankan:
```bash
npm run stop-server
```

### 2. Restart Server

Jalankan ulang server untuk menerapkan perubahan:
```bash
npm run start-server
```

### 3. Refresh Browser

Refresh browser (F5 atau Ctrl+R) untuk reload data.

---

## 🔍 Apa yang Diperbaiki?

### Masalah Sebelumnya:
- Query SQL menggunakan tabel yang **salah**: `master_ingredients`
- Database schema menggunakan: `master_product` (tabel produk)
- Column names tidak match dengan schema

### Yang Diperbaiki:
- ✅ Query sekarang menggunakan `master_product` (benar)
- ✅ Column mapping sudah diperbaiki:
  - `product_code` → `ingredient_code`
  - `product_name` → `ingredient_name`
  - `product_category` → `category`
  - `type_tolerance` (sama)
  - `tolerance_grouping.name` → `tolerance_grouping_name`

---

## ✅ Expected Result

Setelah restart, Anda akan melihat:
- ✅ Ingredients berhasil di-load
- ✅ Tabel ingredients menampilkan data yang benar
- ✅ Kolom-kolom: Product Name, Product Code, Category, Type Tolerance, Tolerance Grouping, Target Mass

---

## 📝 Checklist

- [ ] Server di-restart
- [ ] Browser di-refresh
- [ ] Tidak ada error di console
- [ ] Data ingredients muncul di tabel
- [ ] Status 500 error hilang

---

## 🐛 Jika Masih Error

1. Check terminal server - lihat pesan error detail
2. Verify database connection - pastikan PostgreSQL running
3. Check database schema - pastikan tabel `master_product` ada
4. Check data - pastikan ada ingredients di `master_formulation_ingredients`

**Perintah untuk check database:**
```sql
-- Connect to PostgreSQL
psql -U postgres -d FLB_MOWS

-- Check tables
\dt

-- Check formulation ingredients
SELECT * FROM master_formulation_ingredients LIMIT 5;

-- Check products
SELECT * FROM master_product LIMIT 5;
```



