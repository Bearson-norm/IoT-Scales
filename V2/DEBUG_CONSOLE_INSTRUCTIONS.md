# DEBUG INSTRUCTIONS - Display-Weight Freeze After Product Verification

## Tolong Ikuti Steps Berikut dengan Teliti:

### Step 1: Buka Console Browser
1. Tekan **F12**
2. Klik tab **"Console"**
3. Biarkan console terbuka selama test

### Step 2: Reproduce Masalah dengan Detail
1. Login ke aplikasi
2. Pilih ingredient pertama
3. Modal product verification muncul
4. Masukkan code dan klik Verify
5. **Modal ditutup**
6. **SEGERA LIHAT CONSOLE - screenshot semua log yang muncul setelah modal ditutup!**
7. Lihat digital-weight - apakah freeze?
8. **Screenshot digital-weight**

### Step 3: Check WebSocket Status
1. Tab **"Network"** di Developer Tools
2. Klik filter **"WS"** (WebSocket)
3. Klik pada koneksi **"scale"**
4. Klik tab **"Messages"**
5. **Scroll ke bawah - lihat apakah ada messages baru masuk?**
6. **Screenshot messages tab**

### Step 4: Check State Changes
Di console, cari log yang berisi:
- "🔄" (reset log)
- "WebSocket" 
- "scale_data"
- "scaleDisplayWeight"

**Screenshot SEMUA log yang relevan!**

### Step 5: Test Tanpa Modal
1. Refresh page
2. Login
3. Pilih ingredient (product verification modal muncul)
4. **LANGSUNG KLIK CANCEL** (jangan verify)
5. Lihat digital-weight - apakah freeze juga?
6. Screenshot dan report hasilnya

### Step 6: Send Information
Kirim semua screenshot berikut:
1. Console log setelah modal ditutup
2. WebSocket messages tab
3. Digital-weight display (yang freeze)
4. Hasil test dengan Cancel (Step 5)

### Expected Information:
Saya perlu tau:
- Apakah WebSocket masih menerima messages setelah modal ditutup?
- Apakah ada error di console?
- Apakah useEffect re-run (ada log reset atau reconnect)?
- Apakah freeze juga terjadi saat Cancel (tanpa verify)?

---

**PENTING:** Saya curiga ada masalah dengan:
1. useEffect dependencies yang trigger unnecessary re-render
2. State update yang menyebabkan WebSocket logic re-run
3. selectedIngredient update yang tidak disengaja

Dengan info dari debug steps di atas, saya bisa identifikasi root cause yang sebenarnya!
