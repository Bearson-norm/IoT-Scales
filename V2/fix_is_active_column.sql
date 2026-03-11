-- Fix: Add is_active column to master_formulation_ingredients
-- This migration is required for the application to work correctly

-- Add is_active column (default true for existing records)
ALTER TABLE master_formulation_ingredients 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_master_formulation_ingredients_is_active 
ON master_formulation_ingredients(formulation_id, is_active);

-- Update all existing records to be active (safety check)
UPDATE master_formulation_ingredients 
SET is_active = true 
WHERE is_active IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'master_formulation_ingredients' 
AND column_name = 'is_active';
