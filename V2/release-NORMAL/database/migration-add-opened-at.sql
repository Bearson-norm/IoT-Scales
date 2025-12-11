-- Migration: Add opened_at field to work_orders table
-- This field tracks when a completed work order's detail was first opened
-- NULL means the detail has not been opened yet

-- Add opened_at column to work_orders table
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better query performance when sorting by opened_at
CREATE INDEX IF NOT EXISTS idx_work_orders_opened_at ON work_orders(opened_at);

-- Add index for better query performance when filtering by status and opened_at
CREATE INDEX IF NOT EXISTS idx_work_orders_status_opened_at ON work_orders(status, opened_at);

COMMENT ON COLUMN work_orders.opened_at IS 'Timestamp when the work order detail was first opened. NULL means not opened yet.';


