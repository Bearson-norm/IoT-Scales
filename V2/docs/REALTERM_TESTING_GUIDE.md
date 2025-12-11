# Panduan Testing Timbangan dengan RealTerm

## Tujuan
Gunakan RealTerm untuk menguji koneksi ke timbangan secara langsung sebelum menggunakan aplikasi. Ini membantu memastikan:
1. Hardware berfungsi dengan baik
2. Konfigurasi serial port benar
3. Format data yang dikembalikan timbangan
4. Command yang tepat untuk timbangan

## Download RealTerm
- Download dari: https://sourceforge.net/projects/realterm/
- Atau alternatif: PuTTY, Tera Term, atau Serial Monitor Arduino

## Langkah-langkah Testing

### 1. Buka RealTerm
- Jalankan RealTerm sebagai Administrator (penting untuk akses COM port)

### 2. Tab "Port" - Konfigurasi Serial Port

#### Basic Settings:
- **Port**: Pilih `COM2` (atau port timbangan Anda)
- **Baud**: `2400`
- **Data Bits**: `8`
- **Parity**: `None` (Non-parity)
- **Stop Bits**: Coba `1` dulu, jika tidak berhasil coba `2`
- **Hardware Flow Control**: `None` (OFF)
- **Software Flow Control**: `None` (OFF)

#### Advanced Settings (Tab "Advanced"):
- **DTR**: **OFF** (Nonaktifkan) - Penting! Timbangan Prolific sering reset jika DTR aktif
- **RTS**: **OFF** (Nonaktifkan)
- **DSR**: Ignore
- **CTS**: Ignore

### 3. Koneksi
- Klik tombol **"Open"** atau **"Change"** untuk membuka koneksi
- Pastikan timbangan dalam kondisi ON dan terhubung ke COM port

### 4. Tab "Send" - Mengirim Command

#### Command yang Harus Dicoba (satu per satu):
1. **`P\r`** (huruf P + Enter/Carriage Return)
   - Command paling umum untuk request weight
   - Tekan "Send Numbers" atau ketik di "Send" dan klik "Send"

2. **`\r`** (Hanya Enter/Carriage Return)
   - Wake-up command untuk beberapa timbangan

3. **`?\r`** (Tanda tanya + Enter)
   - Query command untuk status

4. **`W\r`** (Huruf W + Enter)
   - Weight command alternatif

5. **`\x05`** (ENQ - Enquiry character)
   - Control character untuk request data

### 5. Tab "Display" - Melihat Response

#### Setting Display:
- **Ansi**: OFF
- **Display As**: Pilih "Ascii" atau "Hex"
- **Capture**: Aktifkan jika ingin save ke file

#### Yang Harus Dilihat:
- Apakah timbangan merespons? (data muncul di window)
- Format data: Apakah ada angka? Apakah ada unit (G/kg)?
- Apakah ada error message?
- Apakah timbangan mati/reset setelah koneksi?

### 6. Troubleshooting

#### Masalah: Tidak Ada Response
⚠️ **PENTING**: Jika sebelumnya berhasil dengan timbangan Vibra, berarti hardware OK. Masalah spesifik pada konfigurasi timbangan baru.

**Troubleshooting Sistematis:**
1. ✅ **Stop Bits**: Ini yang PALING UMUM! Ganti dari 1 ke 2 atau sebaliknya
2. ✅ **Data Bits**: Coba 7 jika 8 tidak berhasil (beberapa timbangan pakai 7 bit)
3. ✅ **Parity**: Coba "Even" jika "None" tidak berhasil
4. ✅ **Baud Rate**: Coba 9600, 4800, 19200 (mungkin bukan 2400)
5. ✅ **Command**: Pastikan MENGIRIM COMMAND (P\r), beberapa timbangan tidak auto-send
6. ✅ **Wait Time**: Tunggu 5-10 detik, beberapa timbangan butuh waktu lama
7. ✅ **Test Aplikasi Lain**: Coba PuTTY/Tera Term untuk memastikan bukan masalah RealTerm
8. ✅ **Device Manager**: Apakah COM2 terdeteksi? Apakah ada konflik?
9. ✅ **Coba port lain**: COM1, COM3, dll
10. ✅ **Restart timbangan**: Matikan dan hidupkan kembali

**📖 Lihat panduan lengkap di:** `docs/TROUBLESHOOTING_NO_RESPONSE.md` untuk troubleshooting sistematis dan detail.

#### Masalah: Timbangan Mati/Reset Saat Koneksi
- ✅ **Pastikan DTR = OFF** di Advanced Settings
- ✅ **Pastikan RTS = OFF** di Advanced Settings
- ✅ Tutup semua aplikasi lain yang menggunakan COM2 (Device Manager → Port → Properties → Close)

#### Masalah: Response Tidak Jelas/Garbled
- ✅ Coba baud rate lain: 9600, 4800
- ✅ Coba data bits: 7 (jika 8 tidak berhasil)
- ✅ Coba parity: Even (jika None tidak berhasil)
- ✅ Cek apakah ada noise di kabel: Ganti kabel USB/Serial

### 7. Mencatat Hasil Testing

Catat informasi berikut:

```
Port: COM2
Baud Rate: 2400
Data Bits: 8
Parity: None
Stop Bits: 1 atau 2 (yang berhasil)

Command yang Berhasil: P\r
Response Format: 
  Contoh: "+000085.9 G S"
  Atau: "85.9"
  Atau: "0.0859"

DTR/RTS Status: OFF (required)
Masalah yang Ditemukan: 
```

### 8. Testing dengan Format Hex (Opsional)

Di tab "Display":
- Pilih "Hex" untuk melihat raw bytes
- Berguna untuk melihat control characters atau special bytes
- Contoh response: `2B 30 30 30 30 38 35 2E 39 20 47 20 53 0D 0A`

### 9. Capture Log

Di tab "Display":
- Klik "Capture" → "Capture to file"
- Pilih lokasi file
- Semua komunikasi akan disimpan ke file
- Berguna untuk analisis lebih lanjut

## Command Format untuk RealTerm

### Cara Mengirim Command:

#### Metode 1: Send Numbers (Recommended)
- Tab "Send"
- Ketik command seperti: `P\r` atau `80 0D` (hex untuk "P\r")
- Klik "Send Numbers"

#### Metode 2: Send String
- Tab "Send"
- Pilih "Send Numbers" untuk send as hex, atau uncheck untuk send as ASCII
- Ketik command dan klik "Send"

#### Metode 3: Manual ASCII Entry
- Tab "Send"
- Ketik: `P` lalu `Enter` (akan otomatis menambahkan `\r` jika "Send Numbers" unchecked)

### Contoh Command dalam Hex:
- `P\r` = `50 0D` (P = 0x50, \r = 0x0D)
- `?\r` = `3F 0D` (? = 0x3F)
- `\x05` = `05` (ENQ)

## Konfigurasi yang Berhasil

Jika berhasil dengan RealTerm, gunakan konfigurasi yang sama di aplikasi:

1. **Port**: COM2
2. **Baud Rate**: 2400
3. **Data Bits**: 8
4. **Parity**: None
5. **Stop Bits**: 1 atau 2 (sesuai yang berhasil)
6. **DTR**: OFF
7. **RTS**: OFF

## Langkah Selanjutnya

Setelah berhasil dengan RealTerm:
1. Catat konfigurasi yang berhasil
2. Catat format response dari timbangan
3. Catat command yang berhasil
4. Laporkan hasil ke developer untuk debugging aplikasi
5. Jika perlu, gunakan konfigurasi manual di aplikasi (Settings → Scale → Manual Configuration)

## Tips Tambahan

1. **Jangan tinggalkan DTR/RTS ON**: Ini adalah penyebab utama timbangan reset/mati
2. **Test satu per satu**: Jangan mengirim multiple command sekaligus
3. **Beri delay**: Tunggu 200-500ms antar command
4. **Monitor timbangan**: Perhatikan apakah timbangan tetap ON selama testing
5. **Capture log**: Selalu capture log untuk dokumentasi

## Kontak & Bantuan

Jika setelah testing dengan RealTerm masih tidak berhasil:
1. Pastikan driver USB-to-Serial (Prolific) sudah terinstall dengan benar
2. Test di komputer lain untuk memastikan bukan masalah hardware
3. Hubungi vendor timbangan untuk dokumentasi protocol komunikasi
4. Berikan hasil testing (screenshot, log) untuk analisis lebih lanjut
