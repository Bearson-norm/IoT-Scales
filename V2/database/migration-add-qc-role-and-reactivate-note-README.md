# Migration: Add QC Role and Reactivate Note Support

## Overview
Migration ini menambahkan dukungan untuk role QC dan fitur reactivate MO yang dibatalkan.

## Perubahan

### 1. Role QC
- Menambahkan role 'qc' ke dalam constraint `master_user.role`
- Role yang tersedia sekarang: 'admin', 'supervisor', 'operator', 'qc'

### 2. QC Reactivation Support
Menambahkan kolom-kolom berikut ke tabel `work_orders`:
- `qc_reactivate_note` (TEXT): Catatan dari QC saat mengaktifkan kembali MO yang dibatalkan
- `qc_reactivated_by` (UUID): ID user QC yang mengaktifkan kembali MO
- `qc_reactivated_at` (TIMESTAMP WITH TIME ZONE): Waktu ketika MO diaktifkan kembali

## Cara Menjalankan Migration

### Option 1: Menggunakan psql
```bash
psql -U postgres -d FLB_MOWS -f database/migration-add-qc-role-and-reactivate-note.sql
```

### Option 2: Menggunakan pgAdmin atau tool database lainnya
1. Buka file `database/migration-add-qc-role-and-reactivate-note.sql`
2. Copy semua isi file
3. Jalankan di query editor

## Fitur yang Ditambahkan

### 1. QC User Login
- User dengan role 'QC' dapat login menggunakan username: `qc`, password: `qc123`

### 2. Reactivate Cancelled MO
- QC dapat melihat MO yang statusnya 'cancelled' di halaman History
- QC dapat mengaktifkan kembali MO yang dibatalkan dengan menambahkan catatan
- Status MO akan berubah dari 'cancelled' menjadi 'in_progress'
- Informasi reactivation (note, user, timestamp) akan disimpan di database

### 3. Reject Report
- Laporan penolakan (reject) sudah disimpan dengan lengkap di history
- Informasi yang disimpan termasuk:
  - Nama bahan yang melebihi toleransi
  - Target berat
  - Berat aktual
  - Batas maksimal toleransi
  - Jumlah kelebihan
  - Jumlah bahan yang melanggar toleransi

## Catatan Penting

1. **Backup Database**: Sebelum menjalankan migration, pastikan untuk backup database terlebih dahulu
2. **Role Existing Users**: User yang sudah ada tidak akan terpengaruh, hanya constraint yang diupdate
3. **QC Reactivation**: Hanya MO dengan status 'cancelled' yang dapat diaktifkan kembali
4. **Note Required**: Catatan (note) wajib diisi saat mengaktifkan kembali MO

## Testing

Setelah migration dijalankan, lakukan testing:
1. Login sebagai QC (username: qc, password: qc123)
2. Buka halaman History
3. Cari MO dengan status 'cancelled'
4. Klik tombol "Aktifkan Kembali"
5. Isi catatan dan submit
6. Verifikasi status MO berubah menjadi 'in_progress'














