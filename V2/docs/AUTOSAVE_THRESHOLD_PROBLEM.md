# Masalah Autosave: Threshold Check Tidak Tepat

## Masalah yang Ditemukan

Autosave tidak berfungsi meskipun berat sudah mendekati target karena **threshold check membandingkan dengan berat yang salah**.

## Root Cause

### Threshold Check Saat Ini

```javascript
const lastReferenceWeight = autoSaveState.lastSavedWeight || 0
const weightDifference = Math.abs(currentReading - lastReferenceWeight)
const meetsThreshold = weightDifference >= autoSaveConfig.threshold
```

**Masalah:**
- Membandingkan `currentReading` dengan `lastSavedWeight` (berat saat terakhir disimpan)
- Jika user sudah pernah save sebelumnya, `lastSavedWeight` akan berisi berat yang sudah disimpan
- Ketika user menimbang lagi, perubahan dari `lastSavedWeight` mungkin kecil sekali atau 0

### Contoh Masalah

1. **Scenario 1**: User sudah save 10g sebelumnya
   - `lastSavedWeight = 10g`
   - User timbang lagi, `currentReading = 11g`
   - `weightDifference = |11 - 10| = 1g`
   - Jika `threshold = 3g`, maka `1g < 3g` → Counter **TIDAK mulai** ❌

2. **Scenario 2**: User sudah save 10g sebelumnya
   - `lastSavedWeight = 10g`
   - User timbang lagi, `currentReading = 10.5g` (hampir sama)
   - `weightDifference = |10.5 - 10| = 0.5g`
   - Jika `threshold = 3g`, maka `0.5g < 3g` → Counter **TIDAK mulai** ❌

3. **Scenario 3**: User belum pernah save
   - `lastSavedWeight = 0g`
   - User timbang, `currentReading = 5g`
   - `weightDifference = |5 - 0| = 5g`
   - Jika `threshold = 3g`, maka `5g >= 3g` → Counter mulai ✅

## Solusi

Threshold check seharusnya memeriksa:
1. Apakah ada berat baru yang ditimbang (`currentReading > 0`)
2. Apakah berat sudah stabil (tidak berubah terlalu banyak)
3. **BUKAN** membandingkan dengan `lastSavedWeight`

### Logika yang Benar

**Untuk memulai counter, kita perlu:**
1. Ada berat yang ditimbang (`currentReading > 0`)
2. Berat dalam range (jika `onlyInRange = true`)
3. Berat sudah stabil (opsional - bisa diabaikan untuk pertama kali)

**Threshold seharusnya:**
- Hanya digunakan untuk memastikan berat sudah stabil sebelum save
- Bukan untuk menentukan apakah counter boleh mulai

## Perbaikan yang Diperlukan

1. **Hapus threshold check dari kondisi start counter**
   - Counter boleh mulai jika ada berat (`currentReading > 0`)
   - Threshold hanya digunakan saat counter selesai (untuk final check)

2. **Atau ubah logika threshold**
   - Bandingkan dengan `savedWeight` (bukan `lastSavedWeight`)
   - Atau bandingkan dengan 0 jika belum pernah save

## Rekomendasi

**Opsi 1: Hapus threshold check untuk start counter** (Recommended)
- Counter mulai jika: ada berat + dalam range (jika required)
- Threshold hanya untuk final check saat counter selesai

**Opsi 2: Ubah threshold reference**
- Gunakan `savedWeight` (dari ingredient) sebagai reference
- Atau gunakan 0 jika `savedWeight = 0`

## Testing

Setelah perbaikan, autosave harus:
1. ✅ Mulai counter saat ada berat baru (meskipun perubahan kecil dari last save)
2. ✅ Mulai counter meskipun user sudah pernah save sebelumnya
3. ✅ Tetap check threshold saat counter selesai (untuk memastikan berat stabil)




