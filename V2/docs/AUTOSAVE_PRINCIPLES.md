# Prinsip Kerja Fungsi Auto Save

## Ringkasan
Fungsi Auto Save secara otomatis menyimpan hasil penimbangan ketika kondisi tertentu terpenuhi. Fitur ini membantu operator untuk tidak perlu menekan tombol save secara manual.

## Masalah yang Ditemukan dan Diperbaiki

### Masalah Utama
Fungsi autosave tidak berfungsi karena **konfigurasi autosave tidak dimuat dari localStorage** saat aplikasi dimulai. Meskipun pengaturan disimpan di Settings, nilai tersebut tidak pernah dimuat ke dalam state aplikasi.

### Perbaikan yang Dilakukan
1. ✅ Menambahkan field autosave ke initial state Settings component
2. ✅ Memuat konfigurasi autosave dari localStorage di Settings component
3. ✅ Memuat konfigurasi autosave dari localStorage di App.jsx saat mount
4. ✅ Menambahkan listener untuk event `autoSaveConfigUpdated` di App.jsx

## Prinsip Kerja Auto Save

### 1. Konfigurasi Auto Save
Auto save memiliki 4 pengaturan utama:

- **enabled** (boolean): Apakah autosave diaktifkan atau tidak
- **counterTime** (detik): Waktu tunggu sebelum autosave dipicu (default: 3 detik)
- **threshold** (gram): Perubahan berat minimum yang diperlukan untuk memulai counter (default: 0.5g)
- **onlyInRange** (boolean): Apakah autosave hanya aktif saat berat dalam range toleransi (default: true)

### 2. Kondisi untuk Autosave Berfungsi
Autosave akan berfungsi hanya jika **semua** kondisi berikut terpenuhi:

1. ✅ **Autosave diaktifkan** (`autoSaveConfig.enabled === true`)
2. ✅ **Penimbangan sedang aktif** (`isWeighingActive === true`)
3. ✅ **Ada ingredient yang dipilih** (`selectedIngredient !== null`)
4. ✅ **Ada Work Order** (`workOrder !== null`)
5. ✅ **Tidak sedang dalam proses save** (`autoSaveState.isSaving === false`)

### 3. Alur Kerja Autosave

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MONITORING - useEffect memantau berat secara terus-menerus│
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VALIDASI KONDISI                                          │
│    - Apakah semua kondisi dasar terpenuhi?                  │
│    - Apakah berat berubah >= threshold?                     │
│    - Apakah berat dalam range (jika onlyInRange=true)?      │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   ❌ TIDAK                ✅ YA
        │                       │
        │                       ▼
        │           ┌──────────────────────────────┐
        │           │ 3. MULAI COUNTER             │
        │           │ - Set counterStartTime       │
        │           │ - Start interval timer       │
        │           │ - Update lastCheckedWeight   │
        │           └───────────┬──────────────────┘
        │                       │
        │                       ▼
        │           ┌──────────────────────────────┐
        │           │ 4. COUNTDOWN (counterTime detik)│
        │           │ - Timer berjalan setiap 100ms │
        │           │ - Monitor kondisi terus-menerus│
        │           └───────────┬──────────────────┘
        │                       │
        │                       ▼
        │           ┌──────────────────────────────┐
        │           │ 5. VALIDASI ULANG            │
        │           │ - Apakah kondisi masih valid? │
        │           │ - Apakah berat masih dalam    │
        │           │   range & >= threshold?       │
        │           └───────────┬──────────────────┘
        │                       │
        └───────────────────────┴─────────────┐
                                              │
                    ┌─────────────────────────┴─────────────┐
                    │                                         │
                    ▼                                         ▼
            ✅ MASIH VALID                            ❌ TIDAK VALID
                    │                                         │
                    ▼                                         │
        ┌──────────────────────────────┐                    │
        │ 6. TRIGGER AUTO SAVE         │                    │
        │ - Panggil handleSaveProgress │                    │
        │ - Update lastSavedWeight     │                    │
        │ - Reset counter              │                    │
        └──────────────────────────────┘                    │
                                                             │
                                                             ▼
                                                    ┌────────────────────┐
                                                    │ RESET COUNTER      │
                                                    │ - Clear interval   │
                                                    │ - Reset state      │
                                                    └────────────────────┘
```

### 4. Penjelasan Detail

#### A. Threshold Check
- Sistem membandingkan **currentReading** dengan **lastReferenceWeight**
- `lastReferenceWeight` adalah:
  - Jika counter sedang berjalan: `lastCheckedWeight` (berat saat counter dimulai)
  - Jika counter tidak berjalan: `lastSavedWeight` (berat saat terakhir disimpan)
- Berat harus berubah minimal `threshold` gram untuk memulai counter

#### B. Range Check (jika onlyInRange = true)
- Sistem menghitung `totalWeight = savedWeight + currentReading`
- `totalWeight` harus berada dalam range toleransi:
  - `toleranceMin` = `targetWeight - tolerance` (default: targetWeight - 3g)
  - `toleranceMax` = `targetWeight + tolerance` (default: targetWeight + 3g)
- Jika ada `toleranceMin` dan `toleranceMax` di ingredient, gunakan nilai tersebut

#### C. Counter Mechanism
- Setelah semua kondisi terpenuhi, counter dimulai
- Counter berjalan selama `counterTime` detik
- Timer mengecek setiap 100ms
- Selama counter berjalan, sistem terus memantau kondisi
- Jika kondisi tidak terpenuhi lagi, counter di-reset

#### D. Auto Save Trigger
- Setelah counter selesai, sistem melakukan validasi ulang
- Jika kondisi masih valid, `handleSaveProgress()` dipanggil
- Setelah save berhasil:
  - `lastSavedWeight` diupdate dengan berat saat ini
  - `lastCheckedWeight` di-reset
  - Counter di-reset

### 5. State Management

#### autoSaveConfig (Configuration)
```javascript
{
  enabled: false,        // Apakah autosave aktif
  counterTime: 3,        // Waktu tunggu (detik)
  threshold: 0.5,        // Threshold perubahan berat (gram)
  onlyInRange: true      // Hanya save jika dalam range
}
```

#### autoSaveState (Runtime State)
```javascript
{
  isSaving: false,           // Flag untuk mencegah concurrent saves
  lastSavedWeight: 0,        // Berat saat terakhir disimpan
  lastCheckedWeight: 0,      // Berat saat counter dimulai
  counterStartTime: null,    // Timestamp saat counter dimulai
  counterInterval: null      // ID interval timer
}
```

### 6. Refs untuk Menghindari Stale Closure

Karena autosave menggunakan `setInterval`, kita perlu menggunakan refs untuk mendapatkan nilai terbaru:
- `selectedIngredientRef`
- `currentWeightRef`
- `workOrderRef`
- `isWeighingActiveRef`
- `autoSaveConfigRef`

Ini memastikan bahwa ketika counter selesai, kita menggunakan nilai state yang paling up-to-date.

## Cara Menggunakan Auto Save

1. **Buka Settings** → Tab "Umum"
2. **Aktifkan Auto Save** dengan mencentang checkbox "Aktifkan Auto Save"
3. **Konfigurasi**:
   - **Counter Time**: Waktu tunggu sebelum auto save (1-30 detik)
   - **Threshold**: Perubahan berat minimum untuk trigger (0.1-10 gram)
   - **Only In Range**: Centang jika hanya ingin auto save saat dalam range toleransi
4. **Klik "Simpan Pengaturan"**
5. **Mulai Penimbangan**:
   - Scan Work Order
   - Pilih ingredient
   - Mulai penimbangan
   - Ketika berat masuk range dan stabil selama counterTime, autosave akan otomatis trigger

## Troubleshooting

### Autosave tidak berfungsi?
1. ✅ Pastikan autosave diaktifkan di Settings
2. ✅ Pastikan penimbangan sedang aktif (isWeighingActive = true)
3. ✅ Pastikan ada ingredient yang dipilih
4. ✅ Pastikan ada Work Order
5. ✅ Buka browser console (F12) untuk melihat log:
   - `✅ All autosave conditions met, starting counter:` = Kondisi terpenuhi, counter dimulai
   - `⏱️ Auto save counter started:` = Counter mulai berjalan
   - `🔄 Auto save triggered:` = Autosave dipicu
   - `⚠️ Auto save not active:` = Ada kondisi yang tidak terpenuhi

### Counter tidak mulai?
- Periksa apakah berat sudah berubah >= threshold dari berat terakhir disimpan
- Jika `onlyInRange = true`, pastikan totalWeight dalam range toleransi
- Periksa console log untuk pesan error

### Counter di-reset terus-menerus?
- Kemungkinan berat belum stabil atau sering berubah
- Pastikan threshold tidak terlalu kecil (misalnya gunakan 0.5g atau lebih)
- Pastikan timbangan tidak terlalu sensitif terhadap getaran

## Catatan Penting

1. **Autosave hanya berfungsi saat penimbangan aktif** - Pastikan tombol "Mulai Penimbangan" sudah ditekan
2. **Counter akan di-reset jika kondisi tidak terpenuhi** - Misalnya jika berat keluar dari range
3. **Autosave tidak akan trigger jika sedang dalam proses save** - Mencegah race condition
4. **Threshold adalah perubahan berat, bukan berat absolut** - Sistem membandingkan dengan berat sebelumnya

## File yang Dimodifikasi

1. `src/App.jsx`:
   - Menambahkan useEffect untuk load autosave config dari localStorage
   - Menambahkan listener untuk event `autoSaveConfigUpdated`

2. `src/components/Settings.jsx`:
   - Menambahkan field autosave ke initial state
   - Menambahkan fungsi load autosave config dari localStorage
   - Menambahkan listener untuk event `autoSaveConfigUpdated`

## Kesimpulan

Dengan perbaikan ini, fungsi autosave sekarang akan:
- ✅ Memuat konfigurasi dari localStorage saat aplikasi dimulai
- ✅ Mendengarkan perubahan konfigurasi secara real-time
- ✅ Berfungsi sesuai dengan pengaturan yang disimpan
- ✅ Memberikan log yang jelas untuk debugging

Jika masih ada masalah, periksa console browser (F12) untuk melihat log detail dari proses autosave.



