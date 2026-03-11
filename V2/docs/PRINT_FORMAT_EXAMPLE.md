# Format Print Label Penimbangan

Dokumen ini menjelaskan format print label penimbangan yang akan dicetak pada thermal printer.

## Spesifikasi Label
- **Ukuran**: 72mm × 100mm (portrait)
- **DPI**: 203
- **Format**: ZPL (Zebra Programming Language)

## Format Label

### Contoh 1: Print Pertama untuk Bahan Stroberi

```
╔═══════════════════════════════════════╗
║                                       ║
║        LABEL PENIMBANGAN PT KMI              ║
║                                       ║
║        MO: MO-2025-001                ║
║        ═══════════════════            ║
║                                       ║
║        SKU/PRODUK:                    ║
║        Formula Stroberi Premium       ║
║                                       ║
║        BAHAN:                         ║
║        Stroberi Segar                ║
║        ═══════════════════            ║
║                                       ║
║        Berat Saat Ini:                ║
║        250.50 gram                    ║
║                                       ║
║        Penimbangan ke-1               ║
║        ═══════════════════            ║
║                                       ║
║        15/01/2025 14:30:25            ║
║        Op: Operator                    ║
║                                       ║
╚═══════════════════════════════════════╝
```

### Contoh 2: Print Kedua untuk Bahan Stroberi (Penimbangan Lanjutan)

```
╔═══════════════════════════════════════╗
║                                       ║
║        LABEL PENIMBANGAN PT KMI              ║
║                                       ║
║        MO: MO-2025-001                ║
║        ═══════════════════            ║
║                                       ║
║        SKU/PRODUK:                    ║
║        Formula Stroberi Premium       ║
║                                       ║
║        BAHAN:                         ║
║        Stroberi Segar                 ║
║        ═══════════════════            ║
║                                       ║
║        Berat Saat Ini:                ║
║        500.75 gram                    ║
║                                       ║
║        Penimbangan ke-2               ║
║        ═══════════════════            ║
║                                       ║
║        15/01/2025 14:35:10            ║
║        Op: Operator                    ║
║                                       ║
╚═══════════════════════════════════════╝
```

### Contoh 3: Print Ketiga untuk Bahan Stroberi

```
╔═══════════════════════════════════════╗
║                                       ║
║        LABEL PENIMBANGAN PT KMI              ║
║                                       ║
║        MO: MO-2025-001                ║
║        ═══════════════════            ║
║                                       ║
║        SKU/PRODUK:                    ║
║        Formula Stroberi Premium       ║
║                                       ║
║        BAHAN:                         ║
║        Stroberi Segar                 ║
║        ═══════════════════            ║
║                                       ║
║        Berat Saat Ini:                ║
║        750.25 gram                    ║
║                                       ║
║        Penimbangan ke-3               ║
║        ═══════════════════            ║
║                                       ║
║        15/01/2025 14:40:45            ║
║        Op: Operator                    ║
║                                       ║
╚═══════════════════════════════════════╝
```

## Penjelasan Bagian Label

### 1. Header
- **LABEL PENIMBANGAN PT KMI**: Judul label (font besar)
- **MO: [nomor MO]**: Nomor Work Order (jika tersedia)

### 2. Informasi Produk
- **SKU/PRODUK**: Nama formula/produk yang sedang ditimbang
- **BAHAN**: Nama bahan/ingredient yang sedang ditimbang

### 3. Data Penimbangan
- **Berat Saat Ini**: Total berat yang telah ditimbang (dalam gram, 2 desimal)
- **Penimbangan ke-X**: **FITUR BARU** - Menunjukkan urutan penimbangan untuk bahan tersebut
  - Penimbangan ke-1 = penimbangan pertama untuk bahan ini
  - Penimbangan ke-2 = penimbangan kedua untuk bahan ini
  - Penimbangan ke-3 = penimbangan ketiga untuk bahan ini
  - Dan seterusnya...

### 4. Footer
- **Tanggal & Waktu**: Format Indonesia (DD/MM/YYYY HH:MM:SS)
- **Operator**: Nama operator (default: "Operator")

## Cara Kerja Nomor Urut Penimbangan

### Skenario: Menimbang Bahan Stroberi

1. **Print Pertama** (setelah menimbang 250g):
   - Sistem menghitung: belum ada session sebelumnya → **Penimbangan ke-1**
   - Label menampilkan: "Penimbangan ke-1"

2. **Print Kedua** (setelah menimbang tambahan 250g, total 500g):
   - Sistem menghitung: sudah ada 1 session → **Penimbangan ke-2**
   - Label menampilkan: "Penimbangan ke-2"

3. **Print Ketiga** (setelah menimbang tambahan 250g, total 750g):
   - Sistem menghitung: sudah ada 2 session → **Penimbangan ke-3**
   - Label menampilkan: "Penimbangan ke-3"

### Catatan Penting

- **Nomor urut dihitung per bahan per MO**: Setiap bahan dalam work order yang sama memiliki counter session number sendiri
- **Reset per MO baru**: Setiap work order baru, nomor urut dimulai dari 1 lagi
- **Bahan berbeda = counter terpisah**: 
  - Stroberi: Penimbangan ke-1, ke-2, ke-3...
  - Gula: Penimbangan ke-1, ke-2, ke-3... (counter terpisah)
- **Nomor urut otomatis**: Sistem menghitung otomatis berdasarkan jumlah session yang sudah ada di database

## Contoh Data yang Dikirim ke Printer

### Data untuk Print Pertama:
```json
{
  "skuName": "Formula Stroberi Premium",
  "ingredientName": "Stroberi Segar",
  "currentWeight": 250.50,
  "sessionNumber": 1,
  "moNumber": "MO-2025-001",
  "operatorName": "Operator",
  "dateStr": "15/01/2025",
  "timeStr": "14:30:25"
}
```

### Data untuk Print Kedua:
```json
{
  "skuName": "Formula Stroberi Premium",
  "ingredientName": "Stroberi Segar",
  "currentWeight": 500.75,
  "sessionNumber": 2,
  "moNumber": "MO-2025-001",
  "operatorName": "Operator",
  "dateStr": "15/01/2025",
  "timeStr": "14:35:10"
}
```

## Perbandingan Format Lama vs Baru

### Format Lama (Sebelum Update):
```
...
Berat Saat Ini:
250.50 gram

Sesi Penimbangan: 1
...
```
❌ **Masalah**: Tidak jelas apakah ini penimbangan pertama, kedua, atau ketiga
❌ **Masalah**: Tidak konsisten antara print pertama dan kedua

### Format Baru (Setelah Update):
```
...
Berat Saat Ini:
250.50 gram

Penimbangan ke-1
...
```
✅ **Keuntungan**: Jelas menunjukkan urutan penimbangan
✅ **Keuntungan**: Konsisten dan mudah dipahami
✅ **Keuntungan**: Otomatis increment untuk setiap print

## Manfaat Fitur Nomor Urut Penimbangan

1. **Tracking**: Mudah melacak berapa kali penimbangan untuk setiap bahan
2. **Quality Control**: Memudahkan verifikasi proses penimbangan
3. **Audit Trail**: Dokumentasi lengkap untuk setiap langkah penimbangan
4. **Klarifikasi**: Operator langsung tahu ini penimbangan yang ke berapa
5. **Konsistensi**: Format yang sama untuk semua print, hanya nomor urut yang berbeda

## Teknis

- Session number disimpan di tabel `weighing_sessions` dengan kolom `session_number`
- Setiap kali save progress, session baru dibuat dengan `session_number = COUNT(existing) + 1`
- Saat print, sistem menghitung: `nextSessionNumber = lastSessionNumber + 1`
- Jika belum ada session sebelumnya, default ke `1`

