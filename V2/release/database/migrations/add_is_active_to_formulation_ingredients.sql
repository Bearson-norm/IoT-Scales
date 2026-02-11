-- Migration: Add is_active column to master_formulation_ingredients
-- This allows soft delete while preserving history

-- Add is_active column (default true for existing records)
ALTER TABLE master_formulation_ingredients 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_master_formulation_ingredients_is_active 
ON master_formulation_ingredients(formulation_id, is_active);

-- Update all existing records to be active
UPDATE master_formulation_ingredients 
SET is_active = true 
WHERE is_active IS NULL;
