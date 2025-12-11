-- Migration: Add sequence_order column to master_formulation_ingredients
-- This column stores the import order for ingredients in each formulation
-- Created: 2024

-- Step 1: Add sequence_order column
ALTER TABLE master_formulation_ingredients 
ADD COLUMN IF NOT EXISTS sequence_order INTEGER;

-- Step 2: Update existing data with sequence_order based on created_at
-- This ensures existing data has proper ordering
-- CRITICAL: Use ROW_NUMBER() partitioned by formulation_id to ensure each formulation has its own sequence starting from 1
UPDATE master_formulation_ingredients mfi
SET sequence_order = sub.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY formulation_id ORDER BY created_at ASC) as row_num
  FROM master_formulation_ingredients
  WHERE sequence_order IS NULL OR sequence_order = 0
) sub
WHERE mfi.id = sub.id;

-- Step 2b: Also update any existing data that might have incorrect sequence_order
-- Recalculate sequence_order for all ingredients to ensure consistency
UPDATE master_formulation_ingredients mfi
SET sequence_order = sub.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY formulation_id ORDER BY created_at ASC) as row_num
  FROM master_formulation_ingredients
) sub
WHERE mfi.id = sub.id;

-- Step 3: Set default value for new records (will be set during import)
ALTER TABLE master_formulation_ingredients 
ALTER COLUMN sequence_order SET DEFAULT 0;

-- Step 4: Add comment
COMMENT ON COLUMN master_formulation_ingredients.sequence_order IS 'Order sequence of ingredient in formulation (based on import order)';

