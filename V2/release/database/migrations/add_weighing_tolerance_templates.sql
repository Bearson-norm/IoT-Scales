-- Weighing tolerance templates: target qty bands with symmetric ± tolerance (grams)

CREATE TABLE IF NOT EXISTS weighing_tolerance_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weighing_tolerance_template_one_default
    ON weighing_tolerance_template (is_default)
    WHERE is_default = true AND status = 'active';

CREATE TABLE IF NOT EXISTS weighing_tolerance_template_band (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES weighing_tolerance_template(id) ON DELETE CASCADE,
    target_qty_min DECIMAL(12, 3) NOT NULL,
    target_qty_max DECIMAL(12, 3) NOT NULL,
    tolerance_qty DECIMAL(12, 3) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (target_qty_min <= target_qty_max),
    CHECK (tolerance_qty >= 0)
);

CREATE INDEX IF NOT EXISTS idx_wtt_band_template
    ON weighing_tolerance_template_band (template_id, sort_order, target_qty_min);

ALTER TABLE master_product
    ADD COLUMN IF NOT EXISTS weighing_tolerance_template_id UUID
    REFERENCES weighing_tolerance_template(id) ON DELETE SET NULL;

ALTER TABLE master_formulation
    ADD COLUMN IF NOT EXISTS weighing_tolerance_template_id UUID
    REFERENCES weighing_tolerance_template(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS update_weighing_tolerance_template_updated_at ON weighing_tolerance_template;
CREATE TRIGGER update_weighing_tolerance_template_updated_at
    BEFORE UPDATE ON weighing_tolerance_template
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_weighing_tolerance_template_band_updated_at ON weighing_tolerance_template_band;
CREATE TRIGGER update_weighing_tolerance_template_band_updated_at
    BEFORE UPDATE ON weighing_tolerance_template_band
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default template (approximates legacy ±3g for bulk; tighter bands for small targets)
INSERT INTO weighing_tolerance_template (code, name, description, status, is_default)
SELECT
    'TPL-DEFAULT',
    'Default Weighing Tolerance',
    'Default template seeded from legacy rules. Edit bands in Master Data.',
    'active',
    true
WHERE NOT EXISTS (SELECT 1 FROM weighing_tolerance_template WHERE code = 'TPL-DEFAULT');

INSERT INTO weighing_tolerance_template_band (template_id, target_qty_min, target_qty_max, tolerance_qty, sort_order)
SELECT t.id, b.min_qty, b.max_qty, b.tol_qty, b.ord
FROM weighing_tolerance_template t
CROSS JOIN (VALUES
    (0.001::decimal, 0.999::decimal, 0.1::decimal, 1),
    (1.0::decimal, 2.999::decimal, 0.15::decimal, 2),
    (3.0::decimal, 999999999.0::decimal, 3.0::decimal, 3)
) AS b(min_qty, max_qty, tol_qty, ord)
WHERE t.code = 'TPL-DEFAULT'
  AND NOT EXISTS (
    SELECT 1 FROM weighing_tolerance_template_band b2
    WHERE b2.template_id = t.id
  );
