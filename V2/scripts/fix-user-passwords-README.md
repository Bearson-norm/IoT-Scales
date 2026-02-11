# Script untuk Memperbaiki Password User

## Masalah
User-user di database memiliki password hash yang tidak valid (placeholder `$2b$10$example_hash`), sehingga tidak bisa login kecuali user `qc`.

## Solusi

### Opsi 1: Menggunakan Script Node.js (Recommended)
Script ini akan otomatis mendeteksi user yang memiliki placeholder hash dan memperbaikinya:

```bash
node scripts/fix-user-passwords.js
```

**Default Passwords setelah script dijalankan:**
- `admin`: admin123
- `faliq`: faliq123
- `operator1`: operator123
- `supervisor`: supervisor123
- `qc`: qc123 (tidak diubah jika sudah valid)

### Opsi 2: Menggunakan SQL Script
Jalankan SQL script langsung di database:

```bash
psql -U postgres -d FLB_MOWS -f scripts/update-user-passwords.sql
```

### Opsi 3: Generate Hash Manual
Jika ingin membuat password hash untuk password custom:

```bash
node scripts/generate-password-hash.js <password>
```

Kemudian gunakan hash yang dihasilkan dalam SQL UPDATE statement.

## Catatan Penting

1. **Security**: Setelah script dijalankan, semua user akan memiliki password default. User harus segera mengganti password mereka setelah login pertama kali.

2. **Environment Variables**: Script Node.js menggunakan environment variables untuk koneksi database:
   - `DB_USER` (default: postgres)
   - `DB_HOST` (default: localhost)
   - `DB_NAME` (default: FLB_MOWS)
   - `DB_PASSWORD` (default: Admin123)
   - `DB_PORT` (default: 5432)

3. **Update Password melalui API**: Setelah login, user bisa mengubah password melalui endpoint `/api/auth/update-password` dengan menyertakan password lama atau password admin.

## Testing

Setelah script dijalankan, test login dengan:
- Username: `admin`, Password: `admin123`
- Username: `faliq`, Password: `faliq123`
- Username: `operator1`, Password: `operator123`
- Username: `supervisor`, Password: `supervisor123`
- Username: `qc`, Password: `qc123`

