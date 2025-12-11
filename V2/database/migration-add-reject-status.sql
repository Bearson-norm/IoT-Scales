-- Migration script to add 'reject' status to work_orders table
-- Run this script if your database was created before this update

-- First, drop the existing check constraint
ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS work_orders_status_check;

-- Add new constraint with 'reject' status
ALTER TABLE work_orders
ADD CONSTRAINT work_orders_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'reject'));

-- Verify the update
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'work_orders'::regclass
  AND conname = 'work_orders_status_check';


