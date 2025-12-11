# 📊 Dokumentasi: Proses Tampilan Hasil Timbangan

## 🎯 Ringkasan

Dokumen ini menjelaskan alur lengkap proses tampilan hasil timbangan dari pembacaan scale hingga ditampilkan di UI, khususnya di **Weight Display** pada Right Panel.

---

## 🔄 Flow Data: Dari Scale ke UI

### 1. **Data Source: Scale Reading**

#### A. WebSocket Connection (Primary Method)
```
Scale Hardware → COM Port → Server (server.js) → WebSocket → Client (App.jsx)
```

**Proses:**
1. Scale hardware mengirim data via COM Port (Serial)
2. Server membaca data menggunakan `serialport` module
3. Server mengirim data ke client via WebSocket (`ws://localhost:3001`)
4. Client menerima data real-time di `App.jsx`

**Kode:** `src/App.jsx` (line 222-304)
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.type === 'scale_data' && message.success) {
    const weightGrams = message.unit === 'kg' ? message.weight * 1000 : message.weight
    setCurrentWeight(weightGrams) // ← Simpan ke state
  }
}
```

#### B. HTTP Polling (Fallback Method)
```
Scale Hardware → COM Port → Server → REST API (/api/scale/read) → Client
```

**Digunakan ketika:**
- WebSocket tidak tersedia
- Koneksi WebSocket terputus
- Rate limiting terjadi

**Kode:** `src/App.jsx` (line 306-380)
```javascript
const pollScale = async () => {
  const response = await fetch('/api/scale/read')
  const data = await response.json()
  if (data.success) {
    const weightGrams = data.unit === 'kg' ? data.weight * 1000 : data.weight
    setCurrentWeight(weightGrams)
  }
}
```

---

### 2. **State Management: App.jsx**

#### Data yang Disimpan:
```javascript
// State di App.jsx
const [currentWeight, setCurrentWeight] = useState(0)        // ← Pembacaan real-time dari scale
const [selectedIngredient, setSelectedIngredient] = useState(null)
const [recipe, setRecipe] = useState([])
const [isWeighingActive, setIsWeighingActive] = useState(false)
```

#### Update Recipe State:
Setiap kali data scale diterima, recipe state diupdate:
```javascript
setRecipe(prev => prev.map(ing => {
  if (ing.id === currentIngredientId) {
    return { 
      ...ing, 
      currentWeight: weightGrams,      // ← Pembacaan baru
      totalWeight: savedWeight + weightGrams,  // ← Total (saved + current)
      savedWeight: savedWeight         // ← Tetap (dari database)
    }
  }
  return ing
}))
```

---

### 3. **Props Passing: App.jsx → RightPanel**

**Props yang dikirim ke RightPanel:**
```javascript
<RightPanel
  workOrder={workOrder}
  selectedIngredient={selectedIngredient}  // ← Berisi savedWeight, targetWeight, dll
  currentWeight={currentWeight}            // ← Pembacaan real-time dari scale
  isWeighingActive={isWeighingActive}      // ← Status penimbangan aktif
  zeroCheckWeight={zeroCheckWeight}        // ← Untuk zero check
  // ... props lainnya
/>
```

---

### 4. **Data Processing: RightPanel.jsx**

#### A. Extract dan Parse Data
```javascript
// Line 73-75
const savedWeight = parseFloat(selectedIngredient.savedWeight || 0) || 0
const currentReading = isWeighingActive 
  ? (parseFloat(currentWeight || 0) || 0)  // ← Hanya tampilkan jika weighing aktif
  : 0
const totalAccumulated = savedWeight + currentReading
```

**Penjelasan:**
- `savedWeight`: Berat yang sudah disimpan ke database (dari penimbangan sebelumnya)
- `currentReading`: Pembacaan real-time dari scale (hanya muncul saat `isWeighingActive = true`)
- `totalAccumulated`: Total berat = savedWeight + currentReading

#### B. Calculate Target & Tolerance
```javascript
// Line 78-81
const targetWeight = parseFloat(selectedIngredient.targetWeight) || 0
const tolerance = 3  // ±3g
const minWeight = Math.max(0, targetWeight - tolerance)  // Target - 3g
const maxWeight = targetWeight + tolerance                // Target + 3g
```

#### C. Calculate Remaining Weight
```javascript
// Line 98
const remaining = Math.max(0, targetWeight - savedWeight)
```

**PENTING:** Remaining weight **TIDAK** dikurangi secara streaming (real-time) untuk menghindari kebingungan. Hanya update setelah save.

**Contoh:**
- Target: 22000g
- Saved: 500g
- Remaining: 21500g (tetap, tidak berubah saat currentReading berubah)
- Setelah save (saved = 1000g), Remaining: 21000g (baru update)

#### D. Calculate Progress Bar
```javascript
// Line 107-143
// Progress bar max = remaining weight (dengan buffer untuk tolerance visibility)
const remainingMin = Math.max(0, minWeight - savedWeight)  // Min remaining to add
const remainingMax = Math.max(remaining, maxWeight - savedWeight)  // Max remaining to add

// Progress bar max calculation (adaptive berdasarkan remaining)
let progressBarMax
if (remaining <= 100) {
  progressBarMax = remainingMax + 25
} else if (remaining <= 500) {
  progressBarMax = remainingMax * 1.1  // 10% buffer
} else if (remaining <= 1000) {
  progressBarMax = remainingMax * 1.08  // 8% buffer
} else {
  // Very large weights: tolerance-based calculation
  progressBarMax = Math.max(
    remainingToleranceRange / 0.20,  // 20% untuk tolerance range
    remainingMax * 1.03
  )
}

// Progress fill percentage
const currentPercent = remaining > 0 && progressBarMax > 0 
  ? Math.min(100, Math.max(0, (currentReading / progressBarMax) * 100))
  : 0
```

**Penjelasan:**
- Progress bar menunjukkan **current reading** terhadap **remaining weight**
- `currentPercent`: Persentase currentReading terhadap progressBarMax
- Progress bar akan terisi dari 0% (currentReading = 0) hingga 100% (currentReading = remaining)

#### E. Calculate Tolerance Status
```javascript
// Line 82, 92-94
const current = isWeighingActive ? totalAccumulated : savedWeight
const withinTolerance = current >= minWeight && current <= maxWeight
const over = current > maxWeight
const under = current < minWeight
```

**Status untuk Progress Bar Fill:**
- `withinTolerance`: Hijau (#22c55e) - Total dalam range (minWeight ≤ total ≤ maxWeight)
- `under`: Kuning (#eab308) - Total < minWeight
- `over`: Merah (#ef4444) - Total > maxWeight

---

### 5. **Rendering: Weight Display**

#### A. Digital Weight Display
```javascript
// Line 194
<div className="digital-weight">
  {isWeighingActive ? current.toFixed(1) : '0.0'} g
</div>
```

**Menampilkan:**
- Jika `isWeighingActive = true`: `totalAccumulated` (saved + current)
- Jika `isWeighingActive = false`: `0.0`

#### B. Weight Display (Main)
```javascript
// Line 347-361
<div className="weight-display">
  <div className="current-weight">
    {currentReading.toFixed(1)} g  {/* ← New weight (current reading) */}
  </div>
  <div className="target-weight">
    / {remaining.toFixed(1)} g      {/* ← Remaining weight (fixed) */}
  </div>
  {(selectedIngredient.progressPercentage || 0) > 0 && (
    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
      Progress: {(selectedIngredient.progressPercentage || 0).toFixed(1)}% | 
      Total: {totalAccumulated.toFixed(1)}g / 
      Target: {targetWeight.toFixed(1)}g
    </div>
  )}
</div>
```

**Format:**
```
[Current Reading] g / [Remaining] g
Progress: X% | Total: Xg / Target: Xg
```

**Contoh:**
```
500.0 g / 21500.0 g
Progress: 2.27% | Total: 500.0g / Target: 22000.0g
```

**Penjelasan:**
- **Current Reading**: Pembacaan baru dari scale (streaming, real-time)
- **Remaining**: Sisa yang perlu ditambahkan (fixed, tidak streaming)
- **Total**: Total accumulated (saved + current)
- **Target**: Target weight untuk ingredient ini

#### C. Tolerance Bar (Progress Bar)
```javascript
// Line 363-379
<div className="tolerance-bar">
  <div
    className="tolerance-fill"
    style={{
      width: `${currentPercent}%`,  // ← Width berdasarkan currentReading / progressBarMax
      background: withinTolerance ? '#22c55e' : (under ? '#eab308' : '#ef4444')
    }}
  />
  <div className="tolerance-marker min" style={{ left: `${minPercent}%` }} />
  <div className="tolerance-marker max" style={{ left: `${maxPercent}%` }} />
</div>
```

**Visual:**
```
[==========|====|====|==]  ← Progress bar
          Min  Target Max
          ↑              ↑
    currentPercent
```

**Penjelasan:**
- **Fill bar**: Terisi berdasarkan `currentReading` terhadap `progressBarMax`
- **Min marker**: Posisi minimum remaining (minWeight - savedWeight)
- **Max marker**: Posisi maximum remaining (maxWeight - savedWeight)
- **Color**: Hijau (dalam tolerance), Kuning (kurang), Merah (lebih)

#### D. Parameters Grid
```javascript
// Line 381-410
<div className="parameters-grid">
  <div className="parameter-item">
    <div className="parameter-label">Plan Qty</div>
    <div className="parameter-value">{targetWeight.toFixed(1)} g</div>
  </div>
  <div className="parameter-item">
    <div className="parameter-label">Min</div>
    <div className="parameter-value">{minWeight.toFixed(1)} g</div>
  </div>
  <div className="parameter-item">
    <div className="parameter-label">Max</div>
    <div className="parameter-value">{maxWeight.toFixed(1)} g</div>
  </div>
  <div className="parameter-item">
    <div className="parameter-label">Remaining</div>
    <div className="parameter-value">{remaining.toFixed(1)} g</div>
  </div>
</div>
```

**Menampilkan:**
- **Plan Qty**: Target weight
- **Min**: Minimum weight (target - 3g)
- **Max**: Maximum weight (target + 3g)
- **Remaining**: Sisa yang perlu ditambahkan (fixed)

---

## 📋 Ringkasan Flow Lengkap

```
1. Scale Hardware
   ↓ (Serial data)
2. Server (server.js) - Read COM Port
   ↓ (WebSocket / HTTP Polling)
3. App.jsx - Receive data
   ↓ (setCurrentWeight)
4. Update Recipe State
   ↓ (Props passing)
5. RightPanel.jsx - Receive props
   ↓ (Data processing)
6. Calculate Values:
   - savedWeight (from database)
   - currentReading (from props)
   - totalAccumulated (saved + current)
   - remaining (target - saved, fixed)
   - progressBarMax (adaptive)
   - currentPercent (currentReading / progressBarMax)
   ↓ (Rendering)
7. Display Components:
   - Digital Weight (totalAccumulated)
   - Weight Display (currentReading / remaining)
   - Tolerance Bar (currentPercent dengan color coding)
   - Parameters Grid (target, min, max, remaining)
```

---

## 🎨 Visual Display Breakdown

### Weight Display Section:
```
┌─────────────────────────────────────┐
│  Digital Weight: 500.0 g            │ ← Total accumulated
├─────────────────────────────────────┤
│  500.0 g / 21500.0 g                │ ← Current / Remaining
│  Progress: 2.27% | Total: 500.0g /  │
│  Target: 22000.0g                   │
└─────────────────────────────────────┘
```

### Tolerance Bar:
```
┌─────────────────────────────────────┐
│ [========|====|====|==]             │
│         Min Target Max              │
│         ↑              ↑            │
│    currentPercent (hijau/kuning/merah)
└─────────────────────────────────────┘
```

### Parameters Grid:
```
┌─────────────┬─────────────┐
│ Plan Qty    │ 22000.0 g   │
├─────────────┼─────────────┤
│ Min         │ 21997.0 g   │
├─────────────┼─────────────┤
│ Max         │ 22003.0 g   │
├─────────────┼─────────────┤
│ Remaining   │ 21500.0 g   │
└─────────────┴─────────────┘
```

---

## 🔑 Key Points

1. **Current Reading**: Real-time dari scale, streaming, hanya muncul saat `isWeighingActive = true`
2. **Saved Weight**: Dari database, fixed sampai dilakukan save
3. **Remaining Weight**: Fixed (tidak streaming), hanya update setelah save
4. **Total Accumulated**: savedWeight + currentReading (untuk tolerance check)
5. **Progress Bar**: Menunjukkan currentReading terhadap remaining weight
6. **Tolerance Check**: Berdasarkan totalAccumulated (bukan currentReading saja)

---

## 📝 Contoh Skenario

### Scenario: Menimbang 22000g, sudah saved 500g

**Input:**
- Target: 22000g
- Saved: 500g
- Current Reading: 300g (streaming)

**Perhitungan:**
```javascript
savedWeight = 500g
currentReading = 300g
totalAccumulated = 500 + 300 = 800g
remaining = 22000 - 500 = 21500g (fixed, tidak berubah)
minWeight = 22000 - 3 = 21997g
maxWeight = 22000 + 3 = 22003g
withinTolerance = false (800 < 21997)
```

**Display:**
```
Digital Weight: 800.0 g
Weight Display: 300.0 g / 21500.0 g
Progress: 1.40% | Total: 800.0g / Target: 22000.0g
Tolerance Bar: [====|====|====|====] (kuning, under)
Remaining: 21500.0 g
```

**Setelah Current Reading berubah menjadi 1000g:**
```
Digital Weight: 1500.0 g (500 + 1000)
Weight Display: 1000.0 g / 21500.0 g (remaining tetap)
Progress: 4.65% | Total: 1500.0g / Target: 22000.0g
Tolerance Bar: [====|====|====|====] (masih kuning, under)
Remaining: 21500.0 g (tetap, tidak berubah)
```

**Setelah Save (saved = 1500g):**
```
Digital Weight: 1500.0 g (1500 + 0, karena belum ada current reading baru)
Weight Display: 0.0 g / 20500.0 g (remaining update!)
Progress: 0% | Total: 1500.0g / Target: 22000.0g
Tolerance Bar: [|====|====|====] (kuning, under)
Remaining: 20500.0 g (update setelah save)
```

---

## 🐛 Troubleshooting

### Issue: Current Reading tidak muncul
**Penyebab:**
- `isWeighingActive = false`
- `currentWeight` prop tidak terkirim
- WebSocket/HTTP polling tidak berfungsi

**Solusi:**
- Pastikan sudah klik "Mulai Penimbangan"
- Check koneksi scale ke server
- Check console untuk error WebSocket/HTTP

### Issue: Remaining tidak update
**Penyebab:**
- Remaining weight memang fixed (tidak streaming)
- Belum melakukan save

**Solusi:**
- Ini adalah behavior yang benar (fixed sampai save)
- Lakukan save untuk update remaining

### Issue: Progress bar tidak terisi
**Penyebab:**
- `currentReading = 0`
- `remaining = 0` atau `progressBarMax = 0`

**Solusi:**
- Pastikan scale membaca data
- Pastikan target weight sudah di-set
- Check console untuk error

---

## 📚 Referensi File

- `src/App.jsx`: WebSocket/HTTP polling, state management
- `src/components/RightPanel.jsx`: Data processing, rendering
- `server.js`: Scale reading, WebSocket server
- `src/utils/vibraScale.js`: Scale utility functions

---

**Dokumen ini menjelaskan flow lengkap dari scale reading hingga weight display. Untuk detail implementasi, silakan lihat file-file referensi di atas.**
















