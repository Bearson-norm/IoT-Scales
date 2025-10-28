-- Database: FLB_MOWS
-- PostgreSQL Schema for Manufacturing Operations Weighing System

-- Create database (run this as superuser)
-- CREATE DATABASE FLB_MOWS;

-- Connect to FLB_MOWS database
\c FLB_MOWS;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MASTER TABLES
-- =============================================

-- Master Tolerance Grouping
CREATE TABLE master_tolerance_grouping (
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

-- Master Product
CREATE TABLE master_product (
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

-- Master Formulation
CREATE TABLE master_formulation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formulation_code VARCHAR(50) UNIQUE NOT NULL,
    formulation_name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) NOT NULL, -- Foreign key reference
    total_mass DECIMAL(12,3) NOT NULL DEFAULT 0,
    total_ingredients INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Master Formulation Ingredients (Junction table)
CREATE TABLE master_formulation_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formulation_id UUID NOT NULL REFERENCES master_formulation(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES master_product(id),
    target_mass DECIMAL(12,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(formulation_id, product_id)
);

-- Master User
CREATE TABLE master_user (
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

-- =============================================
-- OPERATIONAL TABLES
-- =============================================

-- Work Orders
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    formulation_id UUID NOT NULL REFERENCES master_formulation(id),
    planned_quantity DECIMAL(12,3) NOT NULL,
    actual_quantity DECIMAL(12,3) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_by UUID NOT NULL REFERENCES master_user(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Weighing Sessions
CREATE TABLE weighing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id),
    product_id UUID NOT NULL REFERENCES master_product(id),
    target_weight DECIMAL(12,3) NOT NULL,
    actual_weight DECIMAL(12,3),
    tolerance_min DECIMAL(12,3) NOT NULL,
    tolerance_max DECIMAL(12,3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    operator_id UUID NOT NULL REFERENCES master_user(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Barcode Scans
CREATE TABLE barcode_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES weighing_sessions(id),
    barcode VARCHAR(255) NOT NULL,
    scan_type VARCHAR(20) NOT NULL CHECK (scan_type IN ('mo', 'sku', 'quantity', 'raw_material')),
    scanned_data JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Import Logs
CREATE TABLE import_logs (
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
    imported_by UUID NOT NULL REFERENCES master_user(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Server Database Configurations
CREATE TABLE server_database_configs (
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
    created_by UUID NOT NULL REFERENCES master_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES
-- =============================================

-- Performance indexes
CREATE INDEX idx_master_product_code ON master_product(product_code);
CREATE INDEX idx_master_formulation_code ON master_formulation(formulation_code);
CREATE INDEX idx_work_orders_number ON work_orders(work_order_number);
CREATE INDEX idx_weighing_sessions_work_order ON weighing_sessions(work_order_id);
CREATE INDEX idx_barcode_scans_session ON barcode_scans(session_id);
CREATE INDEX idx_import_logs_type ON import_logs(import_type);
CREATE INDEX idx_import_logs_status ON import_logs(status);
CREATE INDEX idx_import_logs_created_at ON import_logs(created_at);
CREATE INDEX idx_server_configs_active ON server_database_configs(is_active);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_master_tolerance_grouping_updated_at BEFORE UPDATE ON master_tolerance_grouping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_master_product_updated_at BEFORE UPDATE ON master_product FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_master_formulation_updated_at BEFORE UPDATE ON master_formulation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_master_user_updated_at BEFORE UPDATE ON master_user FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weighing_sessions_updated_at BEFORE UPDATE ON weighing_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_server_database_configs_updated_at BEFORE UPDATE ON server_database_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample tolerance groupings
INSERT INTO master_tolerance_grouping (code, name, description, min_tolerance, max_tolerance, unit) VALUES
('TOL001', 'High Precision', 'High precision tolerance for critical ingredients', 0.1, 0.1, 'g'),
('TOL002', 'Standard Precision', 'Standard precision tolerance for regular ingredients', 0.5, 0.5, 'g'),
('TOL003', 'Low Precision', 'Low precision tolerance for bulk ingredients', 1.0, 1.0, 'g');

-- Insert sample products
INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, tolerance_grouping_id) VALUES
('PRD001', 'SALTNIC A6H1007', 'raw', 'high', (SELECT id FROM master_tolerance_grouping WHERE code = 'TOL001')),
('PRD002', 'PROPYLENE GLYCOL (PG)', 'raw', 'standard', (SELECT id FROM master_tolerance_grouping WHERE code = 'TOL002')),
('PRD003', 'VEGETABLE GLYCERIN (VG)', 'raw', 'standard', (SELECT id FROM master_tolerance_grouping WHERE code = 'TOL002')),
('PRD004', 'MINT FLAVOR', 'raw', 'high', (SELECT id FROM master_tolerance_grouping WHERE code = 'TOL001')),
('PRD005', 'CREAM BASE', 'sfg', 'low', (SELECT id FROM master_tolerance_grouping WHERE code = 'TOL003'));

-- Insert sample formulations
INSERT INTO master_formulation (formulation_code, formulation_name, sku, total_mass, total_ingredients) VALUES
('FML001', 'MIXING - ICY MINT', 'SKU001', 99000.0, 3),
('FML002', 'MIXING - FOOM X A', 'SKU002', 36000.0, 3),
('FML003', 'MIXING - VANILLA CREAM', 'SKU003', 50000.0, 2);

-- Insert sample formulation ingredients
INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass) VALUES
((SELECT id FROM master_formulation WHERE formulation_code = 'FML001'), (SELECT id FROM master_product WHERE product_code = 'PRD001'), 11880.0),
((SELECT id FROM master_formulation WHERE formulation_code = 'FML001'), (SELECT id FROM master_product WHERE product_code = 'PRD002'), 5445.0),
((SELECT id FROM master_formulation WHERE formulation_code = 'FML001'), (SELECT id FROM master_product WHERE product_code = 'PRD003'), 39600.0),
((SELECT id FROM master_formulation WHERE formulation_code = 'FML002'), (SELECT id FROM master_product WHERE product_code = 'PRD001'), 90.0),
((SELECT id FROM master_formulation WHERE formulation_code = 'FML002'), (SELECT id FROM master_product WHERE product_code = 'PRD002'), 702.0),
((SELECT id FROM master_formulation WHERE formulation_code = 'FML002'), (SELECT id FROM master_product WHERE product_code = 'PRD003'), 16200.0);

-- Insert sample users
INSERT INTO master_user (username, name, email, password_hash, role) VALUES
('faliq', 'Faliq', 'faliq@presisitech.com', '$2b$10$example_hash', 'operator'),
('admin', 'Administrator', 'admin@presisitech.com', '$2b$10$example_hash', 'admin'),
('operator1', 'Operator 1', 'operator1@presisitech.com', '$2b$10$example_hash', 'operator'),
('supervisor', 'Supervisor', 'supervisor@presisitech.com', '$2b$10$example_hash', 'supervisor');
