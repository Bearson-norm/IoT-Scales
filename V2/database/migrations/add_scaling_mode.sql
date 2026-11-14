-- Migration: Per-unit (PCS/botol) scaling mode for formulations
-- target_mass per 1 unit when scaling_mode = 'per_unit'; MO quantity in PCS

ALTER TABLE master_formulation
ADD COLUMN IF NOT EXISTS scaling_mode VARCHAR(20) NOT NULL DEFAULT 'per_1000g';

ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS planned_units DECIMAL(12,3);

-- Ensure existing rows use legacy mode
UPDATE master_formulation
SET scaling_mode = 'per_1000g'
WHERE scaling_mode IS NULL OR scaling_mode = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'master_formulation_scaling_mode_check'
  ) THEN
    ALTER TABLE master_formulation
      ADD CONSTRAINT master_formulation_scaling_mode_check
      CHECK (scaling_mode IN ('per_1000g', 'per_unit'));
  END IF;
END $$;
