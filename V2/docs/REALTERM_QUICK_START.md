# Quick Start: Testing Timbangan dengan RealTerm

## ⚡ Langkah Cepat (5 Menit)

### 1. Download & Install RealTerm
- Download: https://sourceforge.net/projects/realterm/
- **Jalankan sebagai Administrator** (penting!)

### 2. Konfigurasi Port (Tab "Port")

**Pengaturan Dasar:**
```
Port:         COM2
Baud:         2400
Data Bits:    8
Parity:       None
Stop Bits:    1 (coba 2 jika 1 tidak berhasil)
Flow Control: None (semua OFF)
```

**Pengaturan Lanjutan (Tab "Advanced"):**
```
DTR: OFF  ← PENTING! Pastikan OFF
RTS: OFF  ← PENTING! Pastikan OFF
```

### 3. Buka Koneksi
- Klik tombol **"Open"** atau **"Change"**
- Pastikan timbangan **ON** dan terhubung

### 4. Test Command (Tab "Send")

**Command yang Dicoba (satu per satu, beri delay 1 detik):**

1. **`P\r`** (huruf P + Enter)
   - Di "Send", ketik: `P`
   - Pastikan "Send Numbers" **unchecked** (untuk ASCII)
   - Atau ketik di "Send" dengan format ASCII
   - Klik "Send"

2. **`\r`** (hanya Enter)
   - Klik "Send" untuk mengirim carriage return

3. **`?\r`** (tanda tanya + Enter)
   - Ketik: `?` lalu klik "Send"

### 5. Lihat Response (Tab "Display")

**Yang Dicari:**
- ✅ Data muncul di window?
- ✅ Format seperti apa? (contoh: "+000085.9 G S" atau "85.9")
- ❌ Timbangan mati/reset setelah koneksi?
- ❌ Tidak ada response sama sekali?

### 6. Troubleshooting Cepat

**Jika Tidak Ada Response:**
- ✅ Cek Device Manager: Apakah COM2 terdeteksi?
- ✅ Coba port lain: COM1, COM3, dll
- ✅ Restart timbangan: Matikan dan hidupkan kembali
- ✅ Coba baud rate lain: 9600, 4800
- ✅ Coba stop bits: Ganti dari 1 ke 2 atau sebaliknya

**Jika Timbangan Mati/Reset:**
- ✅ **Pastikan DTR = OFF** (sering terlewat!)
- ✅ **Pastikan RTS = OFF**
- ✅ Tutup semua aplikasi lain yang menggunakan COM2

### 7. Catat Hasil

**Catat konfigurasi yang berhasil:**
```
✅ Port: COM2
✅ Baud Rate: 2400
✅ Data Bits: 8
✅ Parity: None
✅ Stop Bits: 1 atau 2?
✅ Command yang Berhasil: P\r atau \r atau ?\r
✅ Response Format: (contoh: "+000085.9 G S")
✅ DTR/RTS: OFF (required)
```

## 📝 Tips Penting

1. **DTR/RTS HARUS OFF** - Ini adalah penyebab utama timbangan mati
2. **Test satu command per waktu** - Jangan kirim multiple command sekaligus
3. **Beri delay** - Tunggu 1-2 detik antar command
4. **Monitor timbangan** - Pastikan tetap ON selama testing
5. **Capture log** - Aktifkan "Capture" di tab "Display" untuk dokumentasi

## 🎯 Langkah Selanjutnya

**Jika berhasil dengan RealTerm:**
1. Gunakan konfigurasi yang sama di aplikasi (Settings → Scale → Manual Configuration)
2. Laporkan hasil ke developer untuk perbaikan auto-configure

**Jika masih tidak berhasil:**
1. Test di komputer lain untuk memastikan bukan masalah hardware
2. Cek driver USB-to-Serial (Prolific) sudah terinstall dengan benar
3. Hubungi vendor timbangan untuk dokumentasi protocol

## ⚠️ TIDAK ADA RESPONSE SAMA SEKALI?

Jika **tidak ada output sama sekali** (bahkan karakter random), kemungkinan masalah hardware/koneksi atau konfigurasi salah.

### Quick Checks:
1. **Stop Bits**: Ganti dari 1 ke 2 atau sebaliknya (sering kali ini masalahnya!)
2. **Data Bits**: Coba 7 jika 8 tidak berhasil
3. **Parity**: Coba "Even" jika "None" tidak berhasil
4. **Baud Rate**: Coba 9600, 4800 jika 2400 tidak berhasil
5. **Command**: Pastikan mengirim command (P\r), beberapa timbangan tidak auto-send
6. **Wait Time**: Tunggu 5-10 detik, beberapa timbangan lambat response
7. **Device Manager**: Pastikan port terdeteksi dan tidak ada error
8. **Test Aplikasi Lain**: Coba PuTTY atau Tera Term untuk memastikan bukan masalah RealTerm

### Panduan Lengkap Troubleshooting:
Lihat `docs/TROUBLESHOOTING_NO_RESPONSE.md` untuk troubleshooting mendalam jika tidak ada response sama sekali.

## 📖 Panduan Lengkap

- **Testing Guide**: `docs/REALTERM_TESTING_GUIDE.md` - panduan lengkap testing dengan RealTerm
- **Troubleshooting**: `docs/TROUBLESHOOTING_NO_RESPONSE.md` - troubleshooting mendalam jika tidak ada response
