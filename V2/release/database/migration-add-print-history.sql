-- Migration: Add print history table for temporary storage (3 days)
-- This table stores print data for weighing receipts that can be reprinted
-- Created: 2024

-- Step 1: Create print_history table
CREATE TABLE IF NOT EXISTS print_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  work_order VARCHAR(255) NOT NULL,
  ingredient_id UUID REFERENCES master_formulation_ingredients(id) ON DELETE SET NULL,
  ingredient_name VARCHAR(255) NOT NULL,
  sku_name VARCHAR(255) NOT NULL,
  current_weight DECIMAL(10, 2) NOT NULL,
  target_weight DECIMAL(10, 2) NOT NULL,
  remaining_weight DECIMAL(10, 2) NOT NULL,
  operator_name VARCHAR(255),
  mo_number VARCHAR(255),
  print_data JSONB NOT NULL, -- Stores all print data (ZPL, layout, etc.)
  weighing_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  printed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_print_history_work_order ON print_history(work_order);
CREATE INDEX IF NOT EXISTS idx_print_history_weighing_time ON print_history(weighing_time DESC);
CREATE INDEX IF NOT EXISTS idx_print_history_created_at ON print_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_history_work_order_time ON print_history(work_order, weighing_time DESC);

-- Step 3: Add comment
COMMENT ON TABLE print_history IS 'Temporary storage for print data (auto-deleted after 3 days)';
COMMENT ON COLUMN print_history.print_data IS 'JSONB containing all print data (ZPL, layout config, etc.)';
COMMENT ON COLUMN print_history.weighing_time IS 'Timestamp when weighing was completed (for sorting)';

-- Step 4: Create function to auto-delete old records (older than 3 days)
CREATE OR REPLACE FUNCTION cleanup_old_print_history()
RETURNS void AS $$
BEGIN
  DELETE FROM print_history
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger or schedule cleanup (optional - can be run manually or via cron)
-- Note: For automatic cleanup, you may want to set up a cron job or scheduled task
-- Example: SELECT cleanup_old_print_history(); -- Run this daily

