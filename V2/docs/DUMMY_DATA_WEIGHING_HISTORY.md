# Dummy Data: History Penimbangan

## 📋 Overview

Script ini membuat dummy data untuk history penimbangan dengan spesifikasi:
- **MO Number**: TEST/MO/001
- **SKU**: CRYO-MENTHOL IP-CM0006
- **Quantity**: 1000g
- **Status**: Completed (semua ingredients sesuai target)

## 🎯 Data yang Dibuat

### Work Order
- **MO Number**: TEST/MO/001
- **Status**: completed
- **Planned Quantity**: 1000g
- **Actual Quantity**: 1000g
- **Started At**: 2 jam yang lalu
- **Completed At**: 30 menit yang lalu

### Formulation (jika belum ada)
- **Formulation Code**: CRYO-MENTHOL IP-CM0006
- **Formulation Name**: CRYO-MENTHOL IP-CM0006
- **SKU**: CRYO-MENTHOL IP-CM0006
- **Total Mass**: 1000g
- **Total Ingredients**: 4

### Ingredients (jika belum ada)
1. **SALTNIC A6H1007** - 60g (sequence_order: 1)
2. **PROPYLENE GLYCOL (PG)** - 200g (sequence_order: 2)
3. **VEGETABLE GLYCERIN (VG)** - 640g (sequence_order: 3)
4. **MENTHOL FLAVOR** - 100g (sequence_order: 4)

**Total**: 1000g

### Weighing Progress
- Setiap ingredient memiliki status: **completed**
- **Target Mass** = **Actual Mass** (perfect weighing)
- Tolerance: ±5% atau ±5g (mana yang lebih besar)

### Weighing Sessions
- 1 session per ingredient
- Status: **completed**
- Session times spread over 2 hours (25 minutes apart)
- Each session takes 15 minutes

## 🚀 Cara Menggunakan

### Method 1: Menggunakan Script Batch
```bash
scripts\insert-dummy-weighing-history.bat
```

### Method 2: Manual SQL
```bash
psql -U postgres -d FLB_MOWS -f database\migrations\insert-dummy-weighing-history.sql
```

## 📊 Verifikasi Data

Setelah script dijalankan, verifikasi dengan query berikut:

```sql
-- Cek work order
SELECT 
    wo.work_order_number,
    mf.formulation_name,
    wo.planned_quantity,
    wo.actual_quantity,
    wo.status,
    wo.started_at,
    wo.completed_at
FROM work_orders wo
JOIN master_formulation mf ON wo.formulation_id = mf.id
WHERE wo.work_order_number = 'TEST/MO/001';

-- Cek weighing progress
SELECT 
    mp.product_name,
    wp.target_mass,
    wp.actual_mass,
    wp.status,
    wp.tolerance_min,
    wp.tolerance_max
FROM weighing_progress wp
JOIN master_formulation_ingredients mfi ON wp.ingredient_id = mfi.id
JOIN master_product mp ON mfi.product_id = mp.id
JOIN work_orders wo ON wp.work_order_id = wo.id
WHERE wo.work_order_number = 'TEST/MO/001'
ORDER BY mfi.sequence_order;

-- Cek weighing sessions
SELECT 
    mp.product_name,
    ws.session_number,
    ws.target_mass,
    ws.actual_mass,
    ws.accumulated_mass,
    ws.status,
    ws.session_started_at,
    ws.session_completed_at
FROM weighing_sessions ws
JOIN master_formulation_ingredients mfi ON ws.ingredient_id = mfi.id
JOIN master_product mp ON mfi.product_id = mp.id
JOIN work_orders wo ON ws.work_order_id = wo.id
WHERE wo.work_order_number = 'TEST/MO/001'
ORDER BY ws.session_number;
```

## ⚠️ Catatan

1. **Auto-create**: Script akan otomatis membuat formulation dan ingredients jika belum ada
2. **Replace existing**: Jika MO "TEST/MO/001" sudah ada, akan dihapus dan dibuat ulang
3. **Perfect weighing**: Semua actual_mass = target_mass (sesuai permintaan)
4. **Realistic timing**: Session times dibuat realistis dengan spread 25 menit per ingredient

## 🔄 Menghapus Data

Jika ingin menghapus dummy data:

```sql
DELETE FROM weighing_sessions 
WHERE work_order_id IN (SELECT id FROM work_orders WHERE work_order_number = 'TEST/MO/001');

DELETE FROM weighing_progress 
WHERE work_order_id IN (SELECT id FROM work_orders WHERE work_order_number = 'TEST/MO/001');

DELETE FROM work_orders 
WHERE work_order_number = 'TEST/MO/001';
```
