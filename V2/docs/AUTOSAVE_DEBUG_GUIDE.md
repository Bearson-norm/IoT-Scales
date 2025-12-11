# Panduan Debug Auto Save

## Cara Test Auto Save

### 1. Pastikan Konfigurasi Auto Save Sudah Diset

1. Buka aplikasi
2. Buka Settings → Tab "Umum"
3. Pastikan checkbox "Aktifkan Auto Save" tercentang
4. Set pengaturan:
   - Counter Time: 3 detik (untuk test cepat)
   - Threshold: 0.5 gram
   - Only In Range: Sesuai kebutuhan
5. Klik "Simpan Pengaturan"
6. Periksa console browser (F12) - harus ada log:
   ```
   ✅ Auto save config loaded from localStorage: {...}
   ```

### 2. Verifikasi Konfigurasi Terload

Buka browser console (F12) dan jalankan:
```javascript
const config = localStorage.getItem('autoSaveConfig')
console.log('Auto save config:', JSON.parse(config))
```

Harus menampilkan:
```json
{
  "autoSaveEnabled": true,
  "autoSaveCounterTime": 3,
  "autoSaveThreshold": 0.5,
  "autoSaveOnlyInRange": true
}
```

### 3. Test Auto Save

1. Scan Work Order (MO)
2. Pilih salah satu ingredient
3. Klik "Mulai Penimbangan"
4. Mulai timbang bahan
5. Buka browser console (F12) dan perhatikan log:

#### Log yang Harus Muncul:

**Ketika autosave aktif:**
```
🔍 Auto save check: {enabled: true, isWeighingActive: true, ...}
✅ All autosave conditions met, starting counter: {...}
⏱️ Auto save counter started: {...}
🔄 Auto save triggered: {...}
✅ Auto save completed successfully
```

**Jika tidak aktif, periksa log:**
```
⚠️ Auto save not active (conditions not met): {...}
```

### 4. Checklist Kondisi

Autosave akan aktif jika **SEMUA** kondisi berikut terpenuhi:

- [ ] `autoSaveConfig.enabled === true`
- [ ] `isWeighingActive === true` (tombol "Mulai Penimbangan" sudah diklik)
- [ ] Ada ingredient yang dipilih (`selectedIngredient !== null`)
- [ ] Ada Work Order (`workOrder !== null`)
- [ ] `autoSaveState.isSaving === false` (tidak sedang proses save)
- [ ] Berat berubah >= threshold dari berat terakhir disimpan
- [ ] Jika `onlyInRange === true`, totalWeight harus dalam range toleransi

### 5. Debug di Console

Jalankan perintah berikut di browser console untuk cek status autosave:

```javascript
// Cek apakah autosave config ter-load
const config = JSON.parse(localStorage.getItem('autoSaveConfig') || '{}')
console.log('Auto save config:', config)

// Cek apakah autosave enabled (perlu akses ke React component)
// Buka React DevTools dan inspect App component
// Cek state: autoSaveConfig.enabled
```

### 6. Troubleshooting

#### Problem: Autosave tidak pernah trigger

**Cek:**
1. Apakah autosave enabled?
   - Buka Settings → Tab "Umum"
   - Pastikan checkbox "Aktifkan Auto Save" tercentang
   - Klik "Simpan Pengaturan"

2. Apakah semua kondisi terpenuhi?
   - Buka console browser (F12)
   - Cari log: `⚠️ Auto save not active (conditions not met)`
   - Periksa nilai di log tersebut

3. Apakah counter mulai?
   - Cari log: `⏱️ Auto save counter started`
   - Jika tidak ada, berarti kondisi belum terpenuhi

4. Apakah berat berubah cukup?
   - Pastikan perubahan berat >= threshold (default: 0.5g)
   - Cari log: `🔍 Auto save threshold check`

5. Apakah berat dalam range?
   - Jika `onlyInRange === true`, pastikan totalWeight dalam range
   - Cari log: `🔍 Auto save range check`

#### Problem: Counter mulai tapi autosave tidak trigger

**Cek:**
1. Apakah handleSaveProgressRef tersedia?
   - Cari log: `❌ Auto save failed: handleSaveProgressRef.current is null`
   - Jika ada, berarti ref belum ter-assign

2. Apakah counter selesai?
   - Counter harus berjalan selama counterTime detik
   - Cek log untuk melihat berapa lama counter berjalan

3. Apakah kondisi masih valid saat counter selesai?
   - Cari log: `⚠️ Auto save conditions not met, resetting counter`
   - Berarti kondisi tidak terpenuhi saat counter selesai

#### Problem: Autosave trigger tapi save gagal

**Cek:**
1. Apakah Work Order tersedia?
   - Cari log: `❌ Auto save failed: ...`
   - Periksa error message

2. Apakah ada error di server?
   - Buka Network tab di DevTools
   - Cari request ke `/api/weighing/save`
   - Periksa response error

### 7. Manual Test Script

Jalankan di browser console untuk test autosave secara manual:

```javascript
// Simulasi trigger autosave (jika semua kondisi terpenuhi)
// Catatan: Ini hanya untuk debugging, jangan gunakan di production

// 1. Cek konfigurasi
const config = JSON.parse(localStorage.getItem('autoSaveConfig') || '{}')
console.log('Config:', config)

// 2. Dispatch event untuk reload config (jika perlu)
window.dispatchEvent(new Event('autoSaveConfigUpdated'))

// 3. Cek apakah config ter-load
// Periksa log: ✅ Auto save config loaded from localStorage
```

### 8. Log yang Berguna untuk Debug

| Log | Arti |
|-----|------|
| `✅ Auto save config loaded` | Config berhasil dimuat dari localStorage |
| `🔍 Auto save check` | Autosave sedang memeriksa kondisi |
| `⚠️ Auto save not active` | Kondisi tidak terpenuhi |
| `🔍 Auto save threshold check` | Memeriksa perubahan berat |
| `🔍 Auto save range check` | Memeriksa apakah berat dalam range |
| `✅ All autosave conditions met` | Semua kondisi terpenuhi, counter akan mulai |
| `⏱️ Auto save counter started` | Counter dimulai |
| `🔄 Auto save triggered` | Autosave dipicu |
| `✅ Auto save completed successfully` | Autosave berhasil |
| `❌ Auto save failed` | Autosave gagal |

### 9. Common Issues

#### Issue: Config tidak ter-load
**Solusi:** Pastikan Settings sudah menyimpan config dengan benar. Periksa localStorage.

#### Issue: Counter tidak mulai
**Solusi:** Pastikan semua kondisi terpenuhi. Periksa log untuk detail.

#### Issue: Counter di-reset terus
**Solusi:** Berat mungkin tidak stabil atau sering berubah. Coba naikkan threshold.

#### Issue: Autosave tidak trigger setelah counter selesai
**Solusi:** Periksa apakah kondisi masih valid. Mungkin berat sudah keluar dari range atau sudah tidak berubah.

### 10. Test Checklist

Sebelum melaporkan bug, pastikan:

- [ ] Autosave enabled di Settings
- [ ] Config sudah disimpan dan ter-load (cek console)
- [ ] Work Order sudah di-scan
- [ ] Ingredient sudah dipilih
- [ ] Penimbangan sudah aktif (tombol "Mulai Penimbangan")
- [ ] Berat sudah masuk ke timbangan
- [ ] Console browser terbuka dan log terlihat
- [ ] Tidak ada error di console
- [ ] Threshold dan range sudah sesuai

Jika semua sudah dicek dan masih tidak berfungsi, screenshot log console dan laporkan dengan detail kondisi yang terjadi.



