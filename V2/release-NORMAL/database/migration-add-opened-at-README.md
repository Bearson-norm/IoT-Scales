# Migration: Add opened_at Field to work_orders Table

## Deskripsi
Migration ini menambahkan field `opened_at` ke tabel `work_orders` untuk tracking kapan detail history penimbangan pertama kali dibuka.

## Fitur
- Field `opened_at` akan NULL jika detail belum pernah dibuka
- Field `opened_at` akan berisi timestamp ketika detail pertama kali dibuka
- Menambahkan index untuk performa query yang lebih baik

## Cara Menjalankan

### Menggunakan psql
```bash
psql -U your_username -d your_database -f database/migration-add-opened-at.sql
```

### Menggunakan pgAdmin
1. Buka pgAdmin
2. Connect ke database
3. Buka Query Tool
4. Copy isi file `migration-add-opened-at.sql`
5. Execute query

## Verifikasi
Setelah migration berhasil, verifikasi dengan query berikut:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name = 'opened_at';
```

## Catatan
- Migration ini aman untuk dijalankan pada database yang sudah ada
- Field `opened_at` akan NULL untuk semua work order yang sudah ada
- Field ini hanya akan terisi ketika user membuka detail history untuk pertama kali


