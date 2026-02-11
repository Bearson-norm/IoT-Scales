# Fix: Operator Name in External API

## Problem
Field `operator` pada external API masih hardcoded atau menggunakan user default, bukan nama operator yang sebenarnya sedang menjalankan MO.

## Root Cause
1. **Frontend** mengirim hanya `operatorName` (string) ke backend, tanpa `operatorId` (UUID)
2. **Backend** mengabaikan `operatorName` dan hanya mengambil user pertama dari database sebagai `created_by`
3. **External API** mendapat operator yang salah karena `work_orders.created_by` mereferensi user yang salah

## Solution Implemented

### 1. Frontend Changes (src/App.jsx)
**File:** `src/App.jsx` (line 2544-2545)

Sekarang frontend mengirim **kedua** `operatorName` dan `operatorId`:

```javascript
const requestBody = {
  moNumber: workOrder.mo,
  formulationId: workOrder.formulationId,
  ingredients: ingredientsToSave,
  progress: {
    totalQuantity: workOrder.orderQty,
    completedIngredients: recipe.filter(ing => ing.status === 'completed').length,
    totalIngredients: recipe.length
  },
  operatorName: operatorName, // Include operator name from currentUser
  operatorId: currentUser?.id || null // BARU: Include operator ID from currentUser for database reference
};
```

### 2. Backend Changes (server.js)
**File:** `server.js` (lines 4643-4720)

Backend sekarang menggunakan strategi 3-tier untuk menentukan operator:

**Priority 1: Gunakan operatorId dari request**
```javascript
if (operatorId) {
  const userCheckResult = await pool.query(
    'SELECT id FROM master_user WHERE id = $1 AND status = $2', 
    [operatorId, 'active']
  );
  if (userCheckResult.rows.length > 0) {
    createdBy = userCheckResult.rows[0].id;
    console.log(`✅ Using operator from request: ${operatorName} (ID: ${createdBy})`);
  }
}
```

**Priority 2: Lookup berdasarkan operatorName**
```javascript
if (!createdBy && operatorName) {
  const userLookupResult = await pool.query(
    'SELECT id FROM master_user WHERE (name = $1 OR username = $1) AND status = $2 LIMIT 1',
    [operatorName, 'active']
  );
  if (userLookupResult.rows.length > 0) {
    createdBy = userLookupResult.rows[0].id;
    console.log(`✅ Found operator by name: ${operatorName} (ID: ${createdBy})`);
  }
}
```

**Priority 3: Fallback ke user default** (hanya jika operator tidak ditemukan)
```javascript
if (!createdBy) {
  const userResult = await pool.query('SELECT id FROM master_user ORDER BY created_at ASC LIMIT 1');
  if (userResult.rows.length > 0) {
    createdBy = userResult.rows[0].id;
    console.warn(`⚠️  Using default user (ID: ${createdBy}) as operator not found`);
  }
}
```

### 3. External API Data Flow
Data flow yang benar sekarang:

1. **Login**: User login → `currentUser` object berisi `{id, username, name, role}`
2. **Save Progress**: Frontend mengirim `operatorId` dan `operatorName` → Backend menyimpan ke `work_orders.created_by`
3. **External API**: 
   - Backend query join `work_orders` dengan `master_user` menggunakan `created_by`
   - Query: `LEFT JOIN master_user mu ON wo.created_by = mu.id`
   - Result: `COALESCE(mu.username, mu.name, 'Unknown') as operator_name`
   - External API payload: `operator_name: workOrder.operator_name`

**Query di `/api/history` dan `/api/history/:mo`** (lines 6010-6020, 6329-6330):
```sql
SELECT 
  wo.id,
  wo.work_order_number as work_order,
  -- ... other fields ...
  COALESCE(mu.username, mu.name, 'Unknown') as operator_name,
  mu.name as operator_full_name
FROM work_orders wo
LEFT JOIN master_formulation mf ON wo.formulation_id = mf.id
LEFT JOIN master_user mu ON wo.created_by = mu.id
```

**External API Payload** (lines 5761-5762):
```javascript
workOrder: {
  // ... other fields ...
  operator_name: workOrder.operator_name || workOrder.operator_full_name || 'Unknown',
  operator_full_name: workOrder.operator_full_name || workOrder.operator_name || 'Unknown'
}
```

## Testing Checklist

### ✅ Skenario Normal
1. User login dengan username/password → `currentUser` berisi ID dan name
2. Scan MO dan mulai weighing
3. Save progress → Backend menerima `operatorId` dan `operatorName`
4. Backend menggunakan `operatorId` untuk set `created_by`
5. Cek database: `work_orders.created_by` harus sama dengan user yang login
6. Send to external API → Field `operator_name` harus nama user yang login

### ✅ Skenario Fallback
1. Jika `operatorId` tidak dikirim (compatibility dengan versi lama)
2. Backend akan lookup berdasarkan `operatorName`
3. Jika tidak ditemukan, gunakan default user (dengan warning di log)

### ✅ Verifikasi Database
```sql
-- Cek work order dengan operator yang benar
SELECT 
  wo.work_order_number,
  wo.status,
  mu.name as operator_name,
  mu.username as operator_username
FROM work_orders wo
LEFT JOIN master_user mu ON wo.created_by = mu.id
ORDER BY wo.created_at DESC
LIMIT 10;
```

## Benefits

1. **Akurat**: Operator name di external API sekarang mencerminkan user yang benar-benar menjalankan MO
2. **Traceable**: Setiap MO dapat dilacak ke user spesifik melalui `created_by` foreign key
3. **Backward Compatible**: Sistem tetap bekerja dengan fallback jika data user tidak lengkap
4. **Debuggable**: Log yang informatif untuk troubleshooting

## Logging
Backend sekarang mencatat operator yang digunakan:
```
💾 Saving weighing progress for MO: MO-2024-001, Formulation: abc123
   Ingredients count: 5
   Operator: John Doe (ID: 550e8400-e29b-41d4-a716-446655440000)
✅ Using operator from request: John Doe (ID: 550e8400-e29b-41d4-a716-446655440000)
```

## Notes
- Tidak ada hardcoded operator lagi
- Field `operator` di external API sekarang dinamis berdasarkan user login
- Kompatibel dengan sistem authentication yang sudah ada
- Tidak memerlukan perubahan database schema (menggunakan kolom `created_by` yang sudah ada)
