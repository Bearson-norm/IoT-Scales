-- Additional tables for weighing process
-- Run this SQL script to create the required tables

-- Work Orders table
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mo_number VARCHAR(50) UNIQUE NOT NULL,
    formulation_id UUID NOT NULL REFERENCES master_formulation(id),
    order_quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES master_user(id),
    notes TEXT
);

-- Weighing Progress table
CREATE TABLE IF NOT EXISTS weighing_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_formulation_ingredients(id),
    target_mass DECIMAL(10,3) NOT NULL,
    actual_mass DECIMAL(10,3) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'weighing', 'completed', 'failed')),
    tolerance_min DECIMAL(10,3),
    tolerance_max DECIMAL(10,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(work_order_id, ingredient_id)
);

-- Scale Readings table (for real-time weight tracking)
CREATE TABLE IF NOT EXISTS scale_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_formulation_ingredients(id),
    weight_value DECIMAL(10,3) NOT NULL,
    reading_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_stable BOOLEAN DEFAULT FALSE,
    scale_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- QR Code Verification table
CREATE TABLE IF NOT EXISTS qr_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_formulation_ingredients(id),
    qr_code VARCHAR(255) NOT NULL,
    verification_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT TRUE,
    verified_by UUID REFERENCES master_user(id),
    notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_orders_mo_number ON work_orders(mo_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_formulation_id ON work_orders(formulation_id);
CREATE INDEX IF NOT EXISTS idx_weighing_progress_work_order_id ON weighing_progress(work_order_id);
CREATE INDEX IF NOT EXISTS idx_weighing_progress_status ON weighing_progress(status);
CREATE INDEX IF NOT EXISTS idx_scale_readings_work_order_id ON scale_readings(work_order_id);
CREATE INDEX IF NOT EXISTS idx_scale_readings_ingredient_id ON scale_readings(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_scale_readings_reading_time ON scale_readings(reading_time);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_work_order_id ON qr_verifications(work_order_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weighing_progress_updated_at BEFORE UPDATE ON weighing_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO work_orders (mo_number, formulation_id, order_quantity, status, created_by) 
SELECT 
    'MO-TEST-001',
    id,
    100,
    'pending',
    '47b9e99c-b753-49dc-9c08-5565c61d23b8'
FROM master_formulation 
WHERE formulation_code = 'MIXING - GABRIEL ICY MENTHOL'
LIMIT 1
ON CONFLICT (mo_number) DO NOTHING;

-- Add some sample QR codes for ingredients
INSERT INTO qr_verifications (work_order_id, ingredient_id, qr_code, is_valid)
SELECT 
    wo.id,
    mfi.id,
    'INGREDIENT_' || UPPER(REPLACE(mp.product_name, ' ', '_')),
    TRUE
FROM work_orders wo
JOIN master_formulation_ingredients mfi ON wo.formulation_id = mfi.formulation_id
JOIN master_product mp ON mfi.product_id = mp.id
WHERE wo.mo_number = 'MO-TEST-001'
ON CONFLICT DO NOTHING;



