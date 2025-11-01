# Troubleshooting: Port COM Tidak Muncul

## 🔍 Masalah: Port COM tidak muncul di dropdown

Jika port COM tidak muncul padahal sudah terhubung dan bisa digunakan di RealTerm, ini adalah masalah umum dengan Web Serial API.

## ✅ Solusi Step-by-Step

### 1. Gunakan Tombol "Request Port"

**Ini adalah cara yang benar untuk Web Serial:**

1. Pastikan kabel USB-Serial sudah terhubung ke komputer
2. Buka aplikasi di browser Chrome/Edge
3. **JANGAN klik "Refresh"** - ini hanya menampilkan port yang sudah pernah diizinkan
4. **Klik tombol "Request Port"** (tombol biru)
5. Browser akan menampilkan dialog pemilihan port
6. Pilih port COM yang digunakan timbangan Anda
7. Klik "Connect" pada dialog browser
8. Port akan muncul di dropdown dan bisa digunakan

### 2. Perbedaan dengan RealTerm

**RealTerm (Desktop App):**
- Langsung scan semua port COM yang tersedia
- Tidak perlu permission dari user
- Akses langsung ke hardware

**Web Serial API (Browser):**
- Hanya menampilkan port yang sudah diizinkan user
- Perlu permission explicit dari user
- Security-first approach

### 3. Jika "Request Port" Tidak Muncul

**Checklist:**
- ✅ Browser: Chrome 89+ atau Edge 89+
- ✅ URL: `http://localhost:8000` (bukan `file://`)
- ✅ Kabel USB-Serial terhubung
- ✅ Driver USB-Serial terinstall

**Cara check driver:**
1. Buka Device Manager (Win+X → Device Manager)
2. Cari "Ports (COM & LPT)"
3. Pastikan ada port COM (misal: COM3, COM4, dll)
4. Jika ada tanda kuning/merah, install driver

### 4. Jika Permission Ditolak

**Solusi:**
1. Klik tombol "Request Port" lagi
2. Pastikan popup tidak di-block oleh browser
3. Check browser settings:
   - Chrome: Settings → Privacy → Site Settings → Serial Ports
   - Edge: Settings → Site permissions → Serial ports
4. Set ke "Allow" untuk localhost

### 5. Reset Permission Browser

**Jika masih bermasalah:**
1. Chrome: `chrome://settings/content/serialPorts`
2. Edge: `edge://settings/content/serialPorts`
3. Hapus localhost dari daftar
4. Refresh halaman aplikasi
5. Klik "Request Port" lagi

## 🔧 Troubleshooting Lanjutan

### Check Port COM di Windows

**Command Prompt:**
```cmd
mode
```
Akan menampilkan semua port COM yang tersedia.

**PowerShell:**
```powershell
Get-WmiObject -Class Win32_SerialPort | Select-Object Name, DeviceID
```

### Test dengan Aplikasi Lain

**Untuk memastikan port bekerja:**
1. Buka RealTerm atau PuTTY
2. Set ke port COM yang sama
3. Set baudrate 9600, 8N2
4. Test koneksi ke timbangan
5. Jika berhasil, port OK

### Browser Console Debug

**Tekan F12 untuk buka Developer Tools:**
1. Tab Console
2. Lihat error messages
3. Common errors:
   - `NotAllowedError`: Permission ditolak
   - `NotFoundError`: Port tidak ditemukan
   - `NetworkError`: Koneksi gagal

## 📋 Checklist Lengkap

### Hardware
- [ ] Kabel USB-Serial terhubung ke komputer
- [ ] Kabel RS232 terhubung ke timbangan Vibra
- [ ] Timbangan dalam mode ready/sending data
- [ ] Driver USB-Serial terinstall (check Device Manager)

### Software
- [ ] Browser Chrome 89+ atau Edge 89+
- [ ] Aplikasi dijalankan via `http://localhost:8000`
- [ ] Tidak ada firewall yang memblokir port
- [ ] Tidak ada aplikasi lain yang menggunakan port COM

### Web Serial
- [ ] Klik "Request Port" (bukan "Refresh")
- [ ] Pilih port COM yang benar di dialog browser
- [ ] Izinkan akses serial port
- [ ] Port muncul di dropdown setelah diizinkan

## 🚨 Error Messages Umum

### "Web Serial API tidak didukung"
**Solusi:** Gunakan Chrome 89+ atau Edge 89+

### "Permission ditolak"
**Solusi:** 
1. Klik "Request Port" lagi
2. Pastikan popup tidak di-block
3. Check browser settings untuk serial ports

### "Port tidak ditemukan"
**Solusi:**
1. Check kabel USB-Serial terhubung
2. Check Device Manager untuk port COM
3. Restart browser dan coba lagi

### "Access denied"
**Solusi:**
1. Close aplikasi lain yang menggunakan port COM
2. Run browser as Administrator (jika perlu)
3. Check Windows permissions

## 💡 Tips

1. **Selalu gunakan "Request Port"** untuk port baru
2. **"Refresh" hanya untuk port yang sudah diizinkan**
3. **Browser akan mengingat permission** untuk port yang sudah diizinkan
4. **Restart browser** jika ada masalah permission
5. **Check Device Manager** untuk memastikan port COM tersedia

## 📞 Jika Masih Bermasalah

1. Screenshot error message di browser console (F12)
2. Screenshot Device Manager → Ports (COM & LPT)
3. Informasi browser dan versi
4. Informasi port COM yang digunakan di RealTerm

---

**Ingat: Web Serial API berbeda dengan aplikasi desktop. Selalu gunakan "Request Port" untuk port baru!**

