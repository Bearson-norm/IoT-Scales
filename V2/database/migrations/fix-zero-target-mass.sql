-- =============================================
-- Migration: Fix Zero Target Mass Values
-- Purpose: Fix target_mass values that were incorrectly imported as 0
--          due to parsing issues (e.g., decimal separator problems)
-- Date: 2026-02-14
-- =============================================

-- This migration is designed to help identify and fix target_mass = 0 issues
-- You should manually review and update based on your actual data

-- Step 1: Identify all ingredients with target_mass = 0
-- Run this query first to see which ingredients need fixing:
SELECT 
    mfi.id,
    mf.formulation_code,
    mf.formulation_name,
    mp.product_code,
    mp.product_name,
    mfi.target_mass,
    mfi.sequence_order,
    mfi.is_active,
    mfi.created_at,
    mfi.updated_at
FROM master_formulation_ingredients mfi
INNER JOIN master_formulation mf ON mfi.formulation_id = mf.id
INNER JOIN master_product mp ON mfi.product_id = mp.id
WHERE mfi.target_mass = 0
ORDER BY mf.formulation_code, mfi.sequence_order;

-- Step 2: MANUAL FIX - Update specific records
-- WARNING: You MUST review your CSV file or original data to determine the correct values
-- Example: If you know that a specific ingredient should be 0.5 instead of 0:

-- UPDATE master_formulation_ingredients 
-- SET target_mass = 0.5, updated_at = CURRENT_TIMESTAMP
-- WHERE formulation_id = (SELECT id FROM master_formulation WHERE formulation_code = 'YOUR_FORMULATION_CODE')
--   AND product_id = (SELECT id FROM master_product WHERE product_code = 'YOUR_PRODUCT_CODE')
--   AND target_mass = 0;

-- Step 3: RECOMMENDED APPROACH - Re-import your CSV file
-- The best solution is to:
-- 1. Fix your CSV file to ensure proper decimal format (use period "." not comma ",")
-- 2. Use the database import feature with "Full Refresh" mode
-- 3. The updated server.js code will now properly handle decimal parsing

-- Step 4: Verify the fix
-- After updating, run this query to confirm:
SELECT 
    mf.formulation_code,
    mp.product_code,
    mfi.target_mass,
    mfi.updated_at
FROM master_formulation_ingredients mfi
INNER JOIN master_formulation mf ON mfi.formulation_id = mf.id
INNER JOIN master_product mp ON mfi.product_id = mp.id
WHERE mfi.formulation_id = (SELECT id FROM master_formulation WHERE formulation_code = 'YOUR_FORMULATION_CODE')
ORDER BY mfi.sequence_order;

-- Note: If you have many records to fix, consider exporting the zero-target-mass records,
-- fixing them in Excel/CSV, and re-importing using the corrected import functionality.
