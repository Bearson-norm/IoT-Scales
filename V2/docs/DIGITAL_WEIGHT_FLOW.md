# 📊 Dokumentasi: Alur Digital Weight Display

## 🎯 Ringkasan

Dokumen ini menjelaskan alur lengkap bagaimana `digital-weight` ditampilkan dari awal program hingga proses-proses setelahnya, termasuk masalah freeze yang terjadi.

---

## 🔄 Alur Lengkap Digital Weight Display

### 1. **Inisialisasi Awal (Saat Program Dimulai)**

```
1. App.jsx di-mount
   ↓
2. State scaleDisplayWeight diinisialisasi dengan 0
   const [scaleDisplayWeight, setScaleDisplayWeight] = useState(0)
   ↓
3. RightPanel.jsx menerima scaleDisplayWeight = 0 sebagai prop
   ↓
4. digital-weight menampilkan: "0.0 g"
```

**Status WebSocket**: ✅ **TERHUBUNG** (WebSocket selalu terhubung untuk menampilkan `scaleDisplayWeight`)

**Hasil**: `scaleDisplayWeight` mulai ter-update dengan data real-time dari scale segera setelah WebSocket terhubung.

---

### 2. **Saat User Memilih Ingredient (Sebelum Start Pertama)**

```
1. User klik ingredient dari list
   ↓
2. setSelectedIngredient(ingredient) dipanggil
   ↓
3. useEffect untuk WebSocket di-trigger
   ↓
4. WebSocket sudah terhubung (karena selalu terhubung untuk scaleDisplayWeight)
   ↓
5. ws.onmessage terus menerima data dari scale
   ↓
6. setScaleDisplayWeight(weightGrams) terus dipanggil
   ↓
7. digital-weight menampilkan nilai real-time dari scale
```

**Status WebSocket**: ✅ **TERHUBUNG** (WebSocket selalu terhubung, tidak tergantung pada `selectedIngredient`)

**Hasil**: `scaleDisplayWeight` terus ter-update dengan data real-time dari scale.

---

### 3. **Saat User Klik Start (Weighing Aktif)**

```
1. User klik tombol "Start"
   ↓
2. handleStartWeighingFromPanel() dipanggil
   ↓
3. setIsWeighingActive(true)
   ↓
4. WebSocket masih terhubung (karena selectedIngredient masih ada)
   ↓
5. ws.onmessage terus menerima data
   ↓
6. setScaleDisplayWeight(weightGrams) terus dipanggil
   ↓
7. digital-weight menampilkan nilai real-time
```

**Status WebSocket**: ✅ **TERHUBUNG** (karena `selectedIngredient` masih ada)

**Hasil**: `scaleDisplayWeight` terus ter-update dengan data real-time.

---

### 4. **Saat Weighing Selesai (Setelah Save/Complete)**

```
1. User klik "Save" atau "Complete"
   ↓
2. setIsWeighingActive(false)
   ↓
3. Cek kondisi di useEffect (line 363-367):
   if (!selectedIngredient) return
   ↓
   ✅ selectedIngredient masih ada, WebSocket tetap terhubung
   ↓
4. ws.onmessage terus menerima data
   ↓
5. setScaleDisplayWeight(weightGrams) terus dipanggil
   ↓
6. digital-weight menampilkan nilai real-time
```

**Status WebSocket**: ✅ **TERHUBUNG** (karena `selectedIngredient` masih ada)

**Hasil**: `scaleDisplayWeight` masih ter-update (TIDAK freeze).

---

### 5. **Saat User Pilih Ingredient Baru (Start Kedua dan Seterusnya) - SUDAH DIPERBAIKI**

**Skenario A: selectedIngredient di-reset sebelum pilih yang baru**

```
1. Weighing selesai
   ↓
2. setSelectedIngredient(null) dipanggil (misalnya saat complete)
   ↓
3. useEffect untuk WebSocket di-trigger
   ↓
4. WebSocket TETAP TERHUBUNG (karena selalu terhubung untuk scaleDisplayWeight)
   ↓
5. ws.onmessage terus menerima data
   ↓
6. setScaleDisplayWeight(weightGrams) terus dipanggil
   ↓
7. digital-weight terus menampilkan nilai real-time
   ↓
8. User pilih ingredient baru
   ↓
9. setSelectedIngredient(newIngredient)
   ↓
10. WebSocket TETAP TERHUBUNG (tidak perlu reconnect)
   ↓
11. ws.onmessage terus menerima data
   ↓
12. digital-weight terus menampilkan nilai real-time
```

**Status WebSocket**: ✅ **TERHUBUNG SELALU** (tidak tergantung pada `selectedIngredient`)

**Hasil**: `scaleDisplayWeight` terus ter-update tanpa gap atau freeze.

---

**Skenario B: selectedIngredient tidak di-reset, tapi ingredient berubah**

```
1. Weighing selesai untuk ingredient A
   ↓
2. selectedIngredient masih = ingredient A
   ↓
3. WebSocket TETAP TERHUBUNG
   ↓
4. User pilih ingredient B
   ↓
5. setSelectedIngredient(ingredient B)
   ↓
6. useEffect untuk WebSocket di-trigger
   ↓
7. Cek: connectedIngredientId !== newIngredientId
   ↓
8. WebSocket lama ditutup (karena ingredient berubah)
   ↓
9. WebSocket baru dibuat untuk ingredient B
   ↓
10. Reconnection cepat (karena WebSocket selalu aktif)
   ↓
11. scaleDisplayWeight terus ter-update (minimal gap)
```

**Status WebSocket**: 
- ✅ **TERHUBUNG** untuk ingredient A
- ⚠️ **REKONEKSI CEPAT** saat switch ke ingredient B (minimal gap)
- ✅ **TERHUBUNG LAGI** untuk ingredient B

**Hasil**: `scaleDisplayWeight` terus ter-update dengan minimal gap saat reconnection.

---

## ✅ Solusi yang Sudah Diterapkan

### Perubahan yang Dilakukan:

1. **WebSocket selalu terhubung** untuk menampilkan `scaleDisplayWeight`
   - Menghapus early return `if (!selectedIngredient) return`
   - WebSocket tidak lagi tergantung pada `selectedIngredient`

2. **WebSocket tidak ditutup** saat `selectedIngredient = null`
   - Menghapus logika yang menutup WebSocket saat `!selectedIngredient`
   - WebSocket tetap terhubung untuk menampilkan `scaleDisplayWeight`

3. **Minimal delay saat reconnection**
   - WebSocket hanya reconnect saat ingredient berubah (bukan saat `selectedIngredient = null`)
   - Reconnection cepat karena WebSocket selalu aktif

### Implementasi:

```javascript
// WebSocket selalu terhubung untuk scaleDisplayWeight
// selectedIngredient hanya digunakan untuk weighing logic, bukan untuk WebSocket connection
const currentIngredientId = selectedIngredient ? (selectedIngredient.id || selectedIngredient.code) : null

// WebSocket selalu terhubung jika useWebSocket = true
if (useWebSocket) {
  // Connect WebSocket untuk scaleDisplayWeight
  connectWebSocket()
}
// Tidak ada penutupan WebSocket saat !selectedIngredient
```

---

## 📝 Kesimpulan

**Masalah freeze sudah diperbaiki:**
1. ✅ WebSocket selalu terhubung untuk menampilkan `scaleDisplayWeight`
2. ✅ WebSocket tidak ditutup saat `selectedIngredient = null`
3. ✅ Minimal delay saat reconnection (hanya saat ingredient berubah)

**Hasil:**
- `digital-weight` selalu menampilkan pembacaan real-time dari scale
- Tidak ada freeze saat `selectedIngredient = null`
- Tidak ada freeze saat switch ingredient (minimal gap saat reconnection)
- `scaleDisplayWeight` terus ter-update tanpa gangguan

**Catatan:**
- `selectedIngredient` hanya digunakan untuk weighing logic, bukan untuk WebSocket connection
- WebSocket hanya ditutup saat:
  - User logout
  - Aplikasi ditutup
  - Koneksi error yang tidak bisa di-recover
  - Ingredient berubah (reconnection cepat)
