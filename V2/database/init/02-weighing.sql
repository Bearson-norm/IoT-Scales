-- Weighing related tables compatible with server.js

CREATE TABLE IF NOT EXISTS weighing_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_formulation_ingredients(id),
    target_mass DECIMAL(12,3) NOT NULL,
    actual_mass DECIMAL(12,3) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'weighing', 'completed', 'failed')),
    tolerance_min DECIMAL(12,3),
    tolerance_max DECIMAL(12,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(work_order_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS scale_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_formulation_ingredients(id),
    weight_value DECIMAL(12,3) NOT NULL,
    reading_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_stable BOOLEAN DEFAULT FALSE,
    scale_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qr_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_formulation_ingredients(id),
    qr_code VARCHAR(255) NOT NULL,
    verification_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT TRUE,
    verified_by UUID NULL REFERENCES master_user(id),
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weighing_progress_work_order_id ON weighing_progress(work_order_id);
CREATE INDEX IF NOT EXISTS idx_weighing_progress_status ON weighing_progress(status);
CREATE INDEX IF NOT EXISTS idx_scale_readings_work_order_id ON scale_readings(work_order_id);
CREATE INDEX IF NOT EXISTS idx_scale_readings_ingredient_id ON scale_readings(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_scale_readings_reading_time ON scale_readings(reading_time);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_work_order_id ON qr_verifications(work_order_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_weighing_progress BEFORE UPDATE ON weighing_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



