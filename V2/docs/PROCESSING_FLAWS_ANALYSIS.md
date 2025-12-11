# 🔍 Analisis Flaw Processing Program - IoT Scales V2

## 📋 Ringkasan Eksekutif
Dokumen ini mengidentifikasi flaw-flaw kritis dalam processing program yang dapat menyebabkan:
- **Race Conditions** (Overlapping Processes)
- **Blocking Processes**
- **Database-Endpoint Mismatches**

### **🚨 Status: KRITIS - Memerlukan Perbaikan Segera**

**Total Flaws Ditemukan**: 9 flaws (3 KRITIS, 3 HIGH, 3 MEDIUM)

**Dampak Potensial**:
- ❌ **Data Loss**: Race condition dapat menyebabkan kehilangan data timbangan
- ❌ **Data Corruption**: Accumulation logic yang salah dapat menghasilkan nilai yang tidak akurat
- ❌ **Deadlock**: Blocking operations dapat menyebabkan deadlock di database
- ❌ **Connection Exhaustion**: Pool tidak dikonfigurasi dapat menyebabkan aplikasi hang
- ❌ **Inconsistent State**: Transaction isolation issue dapat menyebabkan inconsistent database state

**Affected Endpoints**:
- `/api/weighing/save-progress` - **KRITIS** (Flaw #1, #2, #3, #4, #5, #6, #7)
- `/api/weighing/complete` - **HIGH** (Flaw #1, #4, #5, #6)
- `/api/database/import-formulation` - **MEDIUM** (Flaw #4, #5, #6)

---

## 🚨 **KRITIS: Race Condition dalam Transaction Management**

### **Flaw 1: Transaction Tidak Terisolasi Per Request**

**Lokasi**: `server.js` lines 862-1215 (`/api/weighing/save-progress`)

**Masalah**:
```javascript
// ❌ SALAH: Setiap pool.query('BEGIN') mungkin menggunakan connection berbeda
await pool.query('BEGIN');
await pool.query(workOrderQuery, [...]);
// ... banyak query lainnya
await pool.query('COMMIT');
```

**Dampak**:
- Ketika ada **multiple concurrent requests**, setiap request menggunakan connection pool yang berbeda
- Transaction `BEGIN` di connection A, tapi query berikutnya di connection B
- **Result**: Transaction tidak terisolasi, bisa terjadi lost updates atau inconsistent state

**Solusi**:
```javascript
// ✅ BENAR: Gunakan transaction client untuk isolasi
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const result = await client.query(workOrderQuery, [...]);
  // ... semua query menggunakan client yang sama
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

---

## 🚨 **KRITIS: Race Condition pada Accumulation Logic**

### **Flaw 2: Read-Modify-Write Race Condition**

**Lokasi**: `server.js` lines 1036-1079

**Masalah**:
```javascript
// ❌ SALAH: Race condition antara read dan update
const existingCheck = await pool.query(
  'SELECT actual_mass FROM weighing_progress WHERE work_order_id = $1 AND ingredient_id = $2',
  [workOrderId, ingredient.id]
);

const existingMass = existingCheck.rows.length > 0 
  ? parseFloat(existingCheck.rows[0].actual_mass || 0) 
  : 0;

const newMass = parseFloat(ingredient.currentWeight || ingredient.actualWeight || 0);
const accumulatedMass = existingMass + newMass; // ⚠️ Bisa race condition di sini!

await pool.query(progressQuery, [
  workOrderId,
  ingredient.id,
  targetMass,
  accumulatedMass, // ⚠️ Update dengan nilai yang mungkin sudah outdated
  // ...
]);
```

**Skenario Race Condition**:
1. Request A membaca `actual_mass = 100g`
2. Request B membaca `actual_mass = 100g` (bersamaan)
3. Request A menghitung: `100 + 50 = 150g` dan update
4. Request B menghitung: `100 + 30 = 130g` dan update (❌ overwrites 150g!)
5. **Result**: Seharusnya `180g`, tapi hanya `130g` yang tersimpan

**Solusi**:
```javascript
// ✅ BENAR: Gunakan atomic update dengan SQL
const progressQuery = `
  INSERT INTO weighing_progress (...)
  VALUES (...)
  ON CONFLICT (work_order_id, ingredient_id)
  DO UPDATE SET 
    actual_mass = weighing_progress.actual_mass + $4, -- ✅ Atomic increment
    status = $5,
    updated_at = CURRENT_TIMESTAMP
`;
// $4 adalah newMass (currentWeight), bukan accumulatedMass
```

---

## 🚨 **KRITIS: Missing Row-Level Locking**

### **Flaw 3: Concurrent Work Order Updates Tanpa Locking**

**Lokasi**: `server.js` lines 960-975

**Masalah**:
```javascript
// ❌ SALAH: Tidak ada lock saat create/update work order
const workOrderQuery = `
  INSERT INTO work_orders (...)
  VALUES (...)
  ON CONFLICT (work_order_number) 
  DO UPDATE SET 
    status = 'in_progress',
    updated_at = CURRENT_TIMESTAMP
  RETURNING id, work_order_number
`;

const workOrderResult = await pool.query(workOrderQuery, [...]);
```

**Dampak**:
- Multiple concurrent requests dengan `moNumber` yang sama bisa menghasilkan inconsistent state
- Status bisa di-overwrite oleh request lain
- Tidak ada guarantee bahwa update sequential

**Solusi**:
```javascript
// ✅ BENAR: Gunakan SELECT FOR UPDATE atau advisory lock
const workOrderQuery = `
  INSERT INTO work_orders (...)
  VALUES (...)
  ON CONFLICT (work_order_number) 
  DO UPDATE SET 
    status = 'in_progress',
    updated_at = CURRENT_TIMESTAMP
  RETURNING id, work_order_number
  FOR UPDATE; -- ✅ Lock row selama transaction
`;
```

---

## ⚠️ **HIGH: Database Connection Pool Tidak Dikonfigurasi**

### **Flaw 4: Missing Pool Configuration**

**Lokasi**: `server.js` line 70

**Masalah**:
```javascript
// ❌ SALAH: Pool tanpa konfigurasi
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'FLB_MOWS',
  password: process.env.DB_PASSWORD || 'Admin123',
  port: process.env.DB_PORT || 5432,
  // ❌ Tidak ada max, min, idle timeout, dll
});
```

**Dampak**:
- **Default pool size** (10 connections) mungkin tidak cukup untuk concurrent requests
- Tidak ada **connection timeout** handling
- Tidak ada **max pool size** limit, bisa exhaust database connections
- Tidak ada **idle timeout**, connections bisa hang

**Solusi**:
```javascript
// ✅ BENAR: Konfigurasi pool dengan proper limits
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'FLB_MOWS',
  password: process.env.DB_PASSWORD || 'Admin123',
  port: process.env.DB_PORT || 5432,
  max: 20,                    // Maximum connections in pool
  min: 5,                     // Minimum connections to keep
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error if cannot connect within 2 seconds
  allowExitOnIdle: false,     // Don't exit when pool is idle
});
```

**Catatan**: Config di `src/config/database.js` tidak digunakan oleh server.js!

---

## ⚠️ **HIGH: Blocking Operations dalam Transaction**

### **Flaw 5: Long-Running Loop dalam Transaction**

**Lokasi**: `server.js` lines 996-1164

**Masalah**:
```javascript
// ❌ SALAH: Loop panjang dalam transaction
await pool.query('BEGIN');

// Save weighing progress for each ingredient
for (const ingredient of ingredients) {
  // Multiple queries per ingredient
  const existingCheck = await pool.query(...);      // Query 1
  const woCheckResult = await pool.query(...);      // Query 2
  await pool.query(progressQuery, [...]);           // Query 3
  await pool.query(sessionQuery, [...]);            // Query 4
  // ... bisa ratusan ingredients
}

await pool.query('COMMIT'); // ⚠️ Transaction terlalu lama!
```

**Dampak**:
- Transaction **hold locks** untuk waktu lama
- **Blocking** requests lain yang perlu update row yang sama
- **Deadlock** potential meningkat
- **Connection pool** bisa exhausted jika banyak concurrent requests

**Solusi**:
```javascript
// ✅ BENAR: Batch operations atau shorter transactions
// Option 1: Batch insert/update
const values = ingredients.map((ing, index) => 
  `($${index * 7 + 1}, $${index * 7 + 2}, ...)`
).join(', ');

await client.query(`
  INSERT INTO weighing_progress (...)
  VALUES ${values}
  ON CONFLICT (...) DO UPDATE SET ...
`, [...allParams]);

// Option 2: Shorter transactions per ingredient group
for (const ingredient of ingredients) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Process single ingredient
    await client.query('COMMIT');
  } finally {
    client.release();
  }
}
```

---

## ⚠️ **MEDIUM: Missing Error Handling untuk Transaction State**

### **Flaw 6: Transaction State Tidak Jelas Saat Error**

**Lokasi**: `server.js` lines 1190-1214

**Masalah**:
```javascript
// ❌ SALAH: Transaction state bisa ambiguous
let transactionStarted = false;

try {
  await pool.query('BEGIN');
  transactionStarted = true;
  // ... operations
  await pool.query('COMMIT');
  transactionStarted = false;
} catch (error) {
  if (transactionStarted) {
    await pool.query('ROLLBACK'); // ⚠️ Bisa fail jika connection sudah closed
  }
}
```

**Dampak**:
- Jika **network error** terjadi setelah `BEGIN`, connection bisa terputus
- `ROLLBACK` bisa **fail silently**, meninggalkan transaction hanging
- **Connection leak** jika transaction tidak di-rollback

**Solusi**:
```javascript
// ✅ BENAR: Gunakan client connection dan proper error handling
const client = await pool.connect();
let transactionActive = false;

try {
  await client.query('BEGIN');
  transactionActive = true;
  // ... operations
  await client.query('COMMIT');
  transactionActive = false;
} catch (error) {
  if (transactionActive) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
      // Connection mungkin sudah terputus, tidak bisa rollback
    }
  }
  throw error;
} finally {
  client.release(); // ✅ Always release connection
}
```

---

## ⚠️ **MEDIUM: Concurrent Save Progress Requests**

### **Flaw 7: No Request Deduplication atau Queueing**

**Lokasi**: `src/App.jsx` lines 418-497, `server.js` line 862

**Masalah**:
- **Client** bisa trigger multiple `handleSaveProgress()` calls (double-click, rapid saves)
- **Server** tidak ada mechanism untuk **deduplicate** atau **queue** requests
- Multiple requests dengan data yang sama bisa **race** dan overwrite satu sama lain

**Solusi**:
```javascript
// ✅ BENAR: Add request queueing di client
const [isSaving, setIsSaving] = useState(false);

const handleSaveProgress = async () => {
  if (isSaving) {
    console.warn('Save already in progress, ignoring...');
    return;
  }
  
  setIsSaving(true);
  try {
    // ... save logic
  } finally {
    setIsSaving(false);
  }
};

// ✅ BENAR: Add request deduplication di server
const activeSaves = new Map(); // moNumber -> Promise

app.post('/api/weighing/save-progress', async (req, res) => {
  const { moNumber } = req.body;
  
  // Check if save already in progress
  if (activeSaves.has(moNumber)) {
    return res.status(409).json({
      success: false,
      error: 'Save already in progress for this work order'
    });
  }
  
  const savePromise = performSave(req, res);
  activeSaves.set(moNumber, savePromise);
  
  try {
    await savePromise;
  } finally {
    activeSaves.delete(moNumber);
  }
});
```

---

## ⚠️ **MEDIUM: Database Schema Mismatch**

### **Flaw 8: Field Name Inconsistency**

**Lokasi**: Multiple files

**Masalah**:
- Database schema menggunakan `work_order_number` (line 961)
- Tapi beberapa query menggunakan `mo_number` atau `work_order`
- Client mengirim `moNumber`, server mengkonversi ke `work_order_number`

**Dampak**:
- Potential **SQL errors** jika field name salah
- **Confusion** saat debugging
- **Data inconsistency** jika field tidak match

**Status**: ✅ **VERIFIED** - Schema menggunakan `work_order_number`, server code sudah benar.

---

## ⚠️ **MEDIUM: Complete Endpoint Memiliki Masalah Serupa**

### **Flaw 9: `/api/weighing/complete` - Transaction Issues**

**Lokasi**: `server.js` lines 1217-1280

**Masalah**:
- **Sama seperti Flaw #1**: Menggunakan `pool.query('BEGIN')` tanpa transaction client
- **Sama seperti Flaw #4**: Tidak ada rollback handling yang proper
- **Sama seperti Flaw #5**: Loop dalam transaction tanpa batching

**Kode Problematic**:
```javascript
app.post('/api/weighing/complete', async (req, res) => {
  try {
    await pool.query('BEGIN'); // ❌ Same issue as Flaw #1
    // ... operations
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK'); // ❌ No error handling if rollback fails
  }
});
```

**Rekomendasi**: Apply same fixes as `/api/weighing/save-progress`

---

## 🔧 **REKOMENDASI PERBAIKAN PRIORITAS**

### **Priority 1 (Kritis - Segera Perbaiki)**:
1. ✅ **Fix Transaction Isolation** - Gunakan `pool.connect()` untuk transaction client
   - Apply ke: `/api/weighing/save-progress`, `/api/weighing/complete`
2. ✅ **Fix Accumulation Race Condition** - Gunakan atomic SQL increment
   - Apply ke: `/api/weighing/save-progress` (lines 1036-1079)
3. ✅ **Add Row-Level Locking** - `SELECT FOR UPDATE` untuk work orders
   - Apply ke: `/api/weighing/save-progress`, `/api/weighing/complete`

### **Priority 2 (High - Perbaiki Segera)**:
4. ✅ **Configure Connection Pool** - Add max, min, timeouts
   - Apply ke: `server.js` line 70 (pool initialization)
5. ✅ **Optimize Transaction Scope** - Reduce transaction duration
   - Apply ke: `/api/weighing/save-progress`, `/api/weighing/complete`, `/api/database/import-formulation`
6. ✅ **Fix Transaction Error Handling** - Proper rollback dengan client connection
   - Apply ke: Semua endpoints yang menggunakan transaction

### **Priority 3 (Medium - Perbaiki Saat Ada Waktu)**:
7. ✅ **Add Request Deduplication** - Prevent concurrent saves
   - Apply ke: Client-side (`src/App.jsx`), Server-side (`server.js`)
8. ✅ **Fix Complete Endpoint Transaction Issues** - Apply same fixes as save-progress
   - Apply ke: `/api/weighing/complete`
9. ✅ **Add Connection Pool Monitoring** - Log pool stats untuk debugging

---

## 📊 **TESTING SCENARIOS**

### **Test 1: Concurrent Save Progress**
```javascript
// Simulate 10 concurrent requests untuk work order yang sama
const requests = Array(10).fill(null).map(() => 
  fetch('/api/weighing/save-progress', {
    method: 'POST',
    body: JSON.stringify({
      moNumber: 'MO001',
      formulationId: 'xxx',
      ingredients: [{ id: 'ing1', currentWeight: 10 }]
    })
  })
);

const results = await Promise.all(requests);
// Verify: Semua requests berhasil, actual_mass = 100 (10 * 10)
```

### **Test 2: Connection Pool Exhaustion**
```javascript
// Simulate 100 concurrent requests
// Verify: Pool tidak exhausted, requests di-queue dengan proper error handling
```

### **Test 3: Transaction Rollback**
```javascript
// Simulate error di tengah transaction
// Verify: Transaction di-rollback dengan benar, tidak ada hanging connections
```

---

## 📝 **IMPLEMENTASI PERBAIKAN**

Lihat file `docs/PROCESSING_FIXES_IMPLEMENTATION.md` untuk implementasi detail perbaikan.

---

**Dibuat**: $(date)
**Versi**: 1.0
**Status**: Needs Immediate Action

