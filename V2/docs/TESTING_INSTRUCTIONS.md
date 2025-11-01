# 🧪 Testing Instructions - Debug Ingredients Loading

## 📋 Langkah-langkah Testing

### 1. Restart Server
```bash
# Stop server (Ctrl+C di terminal server)
# Start ulang:
npm run start-server
```

### 2. Refresh Browser
Tekan **F5** atau **Ctrl+R** untuk hard refresh.

### 3. Test Flow

1. **Login** ke aplikasi: `faliq` / `123456`
2. Klik menu **Master Formulation**
3. Tunggu data load (ada 150 formulations)
4. Klik tombol **Edit** (titik tiga) pada salah satu formulation
5. **Perhatikan console log** di browser (tekan F12 → Console tab)

---

## 🔍 Console Log yang Diharapkan

Setelah klik Edit, console harus menampilkan:

```
🔍 loadIngredients called with formulation: Object
🔍 Formulation ID: [uuid]
🔄 Loading ingredients for formulation ID: [uuid]
📦 Raw API response: {success: true, data: Array, count: X}
📦 API response type: object
📦 API response keys: ['success', 'data', 'count']
📦 Extracted ingredients data: Array[X]
📦 Ingredients data type: object
📦 Ingredients data length: X
📦 Is array? true
✅ Ingredients loaded: X ingredients
📋 First ingredient: {...}
📋 All ingredients data: [...]
```

---

## 🎯 Debug Info di UI

Di halaman Edit Formulation, akan ada box debug di atas yang menampilkan:
- Formulation ID
- Formulation Code
- Formulation Name
- SKU
- Total Mass
- Status
- **Ingredients Count** ← ini harus menampilkan jumlah > 0
- **Ingredients Data** ← ini menampilkan sample data ingredients (2 pertama)
- Products Available
- Loading State
- Data Loading State

---

## ✅ Expected Result

Jika ingredients berhasil load:
1. Console menunjukkan: `✅ Ingredients loaded: X ingredients`
2. Debug box di UI menunjukkan: `Ingredients Count: X` (X > 0)
3. Debug box menunjukkan sample data ingredients (JSON)
4. **Tabel Ingredients** menampilkan data dengan kolom:
   - Product Name (Ingredient Name)
   - Product Code (Ingredient Code)
   - Category
   - Type Tolerance
   - Tolerance Grouping
   - Target Mass (g)
   - Aksi

---

## ❌ Jika Masih Kosong

Check console log:

### Scenario 1: API Return Kosong
```
📦 API response: {success: true, data: [], count: 0}
⚠️ No ingredients found or empty array: []
```
**Solusi:** Data di database memang kosong untuk formulation tersebut.

### Scenario 2: API Error
```
❌ Error loading ingredients: [error message]
```
**Solusi:** Check server terminal untuk error details.

### Scenario 3: Response Format Wrong
```
📦 API response type: [unexpected type]
```
**Solusi:** API response tidak sesuai format yang diharapkan.

---

## 🛠️ Jika Ingredients Count = 0

1. **Check di Database:**
   ```sql
   -- Connect to PostgreSQL
   psql -U postgres -d FLB_MOWS
   
   -- Check formulation ingredients
   SELECT * FROM master_formulation_ingredients 
   WHERE formulation_id = 'FORMULATION_ID';
   ```

2. **Check API Direct:**
   ```
   http://localhost:3001/api/formulations/[FORMULATION_ID]/ingredients
   ```
   Buka di browser, harus return JSON dengan ingredients data.

---

## 📝 Next Steps Setelah Test

Jika ingredients masih tidak tampil:
1. **Copy seluruh console log** dari browser
2. **Copy error message** (jika ada)
3. **Screenshot** debug box di UI
4. Share dengan developer untuk further debugging

---

**Good luck testing! 🚀**



