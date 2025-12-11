-- Migration: Add QC role and reactivate note support
-- This migration adds:
-- 1. 'qc' role to master_user table
-- 2. qc_reactivate_note column to work_orders table
-- 3. qc_reactivated_by and qc_reactivated_at columns to work_orders table

-- Step 1: Update master_user role constraint to include 'qc'
ALTER TABLE master_user 
DROP CONSTRAINT IF EXISTS master_user_role_check;

ALTER TABLE master_user 
ADD CONSTRAINT master_user_role_check 
CHECK (role IN ('admin', 'supervisor', 'operator', 'qc'));

-- Step 2: Add QC reactivation columns to work_orders table
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS qc_reactivate_note TEXT;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS qc_reactivated_by UUID REFERENCES master_user(id);

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS qc_reactivated_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_work_orders_qc_reactivated_at ON work_orders(qc_reactivated_at);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN work_orders.qc_reactivate_note IS 'Note from QC when reactivating a cancelled MO';
COMMENT ON COLUMN work_orders.qc_reactivated_by IS 'User ID of QC who reactivated the MO';
COMMENT ON COLUMN work_orders.qc_reactivated_at IS 'Timestamp when MO was reactivated by QC';














