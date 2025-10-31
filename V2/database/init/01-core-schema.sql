-- Core schema for FLB_MOWS (no sample data)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- MASTER TABLES
CREATE TABLE IF NOT EXISTS master_tolerance_grouping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    min_tolerance DECIMAL(10,3) NOT NULL DEFAULT 0,
    max_tolerance DECIMAL(10,3) NOT NULL DEFAULT 0,
    unit VARCHAR(10) NOT NULL DEFAULT 'g',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_category VARCHAR(20) NOT NULL CHECK (product_category IN ('raw', 'sfg')),
    type_tolerance VARCHAR(20) NOT NULL CHECK (type_tolerance IN ('high', 'standard', 'low')),
    tolerance_grouping_id UUID REFERENCES master_tolerance_grouping(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_formulation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formulation_code VARCHAR(50) UNIQUE NOT NULL,
    formulation_name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    total_mass DECIMAL(12,3) NOT NULL DEFAULT 0,
    total_ingredients INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_formulation_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formulation_id UUID NOT NULL REFERENCES master_formulation(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES master_product(id),
    target_mass DECIMAL(12,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(formulation_id, product_id)
);

CREATE TABLE IF NOT EXISTS master_user (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'supervisor', 'operator')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OPERATIONAL TABLES (work_orders uses work_order_number)
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    formulation_id UUID NOT NULL REFERENCES master_formulation(id),
    planned_quantity DECIMAL(12,3) NOT NULL,
    actual_quantity DECIMAL(12,3) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_by UUID NULL REFERENCES master_user(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weighing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id),
    product_id UUID NOT NULL REFERENCES master_product(id),
    target_weight DECIMAL(12,3) NOT NULL,
    actual_weight DECIMAL(12,3),
    tolerance_min DECIMAL(12,3) NOT NULL,
    tolerance_max DECIMAL(12,3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    operator_id UUID NULL REFERENCES master_user(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS barcode_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES weighing_sessions(id),
    barcode VARCHAR(255) NOT NULL,
    scan_type VARCHAR(20) NOT NULL CHECK (scan_type IN ('mo', 'sku', 'quantity', 'raw_material')),
    scanned_data JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_type VARCHAR(50) NOT NULL CHECK (import_type IN ('master_product', 'master_formulation', 'master_tolerance_grouping', 'master_user')),
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('file', 'server', 'manual')),
    source_name VARCHAR(255),
    server_config JSONB,
    total_records INTEGER NOT NULL DEFAULT 0,
    successful_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    error_details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    imported_by UUID NULL REFERENCES master_user(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_database_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 5432,
    database_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    connection_type VARCHAR(20) NOT NULL DEFAULT 'postgresql' CHECK (connection_type IN ('postgresql', 'mysql', 'sqlserver')),
    ssl_enabled BOOLEAN DEFAULT FALSE,
    timeout_seconds INTEGER DEFAULT 30,
    max_connections INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NULL REFERENCES master_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_master_product_code ON master_product(product_code);
CREATE INDEX IF NOT EXISTS idx_master_formulation_code ON master_formulation(formulation_code);
CREATE INDEX IF NOT EXISTS idx_work_orders_number ON work_orders(work_order_number);
CREATE INDEX IF NOT EXISTS idx_weighing_sessions_work_order ON weighing_sessions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_session ON barcode_scans(session_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_type ON import_logs(import_type);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_server_configs_active ON server_database_configs(is_active);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_master_tolerance_grouping BEFORE UPDATE ON master_tolerance_grouping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_master_product BEFORE UPDATE ON master_product FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_master_formulation BEFORE UPDATE ON master_formulation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_master_user BEFORE UPDATE ON master_user FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_work_orders BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_weighing_sessions BEFORE UPDATE ON weighing_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_server_database_configs BEFORE UPDATE ON server_database_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



