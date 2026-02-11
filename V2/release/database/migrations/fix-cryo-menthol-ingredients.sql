-- Fix CRYO-MENTHOL IP-CM0006 ingredients
-- This script will:
-- 1. Show all current ingredients
-- 2. Deactivate ingredients that are NOT MC-001 or MP-001
-- 3. Ensure only MC-001 (100g) and MP-001 (900g) are active

DO $$
DECLARE
    v_formulation_id UUID;
    v_mc001_product_id UUID;
    v_mp001_product_id UUID;
    v_deactivated_count INTEGER;
BEGIN
    -- Find formulation
    SELECT id INTO v_formulation_id
    FROM master_formulation
    WHERE formulation_code = 'CRYO-MENTHOL IP-CM0006'
       OR formulation_name ILIKE '%CRYO-MENTHOL%'
       OR sku = 'CRYO-MENTHOL IP-CM0006'
    LIMIT 1;
    
    IF v_formulation_id IS NULL THEN
        RAISE EXCEPTION 'Formulation CRYO-MENTHOL IP-CM0006 not found';
    END IF;
    
    RAISE NOTICE 'Found formulation: CRYO-MENTHOL IP-CM0006 (ID: %)', v_formulation_id;
    
    -- Find product IDs for MC-001 and MP-001
    SELECT id INTO v_mc001_product_id
    FROM master_product
    WHERE product_code = 'MC-001'
    LIMIT 1;
    
    SELECT id INTO v_mp001_product_id
    FROM master_product
    WHERE product_code = 'MP-001'
    LIMIT 1;
    
    IF v_mc001_product_id IS NULL THEN
        RAISE WARNING 'Product MC-001 not found';
    END IF;
    
    IF v_mp001_product_id IS NULL THEN
        RAISE WARNING 'Product MP-001 not found';
    END IF;
    
    -- Show current ingredients
    RAISE NOTICE 'Current ingredients for CRYO-MENTHOL IP-CM0006:';
    FOR rec IN (
        SELECT 
            mfi.id,
            mfi.product_id,
            mp.product_code,
            mp.product_name,
            mfi.target_mass,
            mfi.is_active,
            mfi.sequence_order
        FROM master_formulation_ingredients mfi
        LEFT JOIN master_product mp ON mfi.product_id = mp.id
        WHERE mfi.formulation_id = v_formulation_id
        ORDER BY COALESCE(mfi.sequence_order, 999999), mfi.created_at
    ) LOOP
        RAISE NOTICE '  - ID: %, Product: % (%), Target: %g, Active: %, Sequence: %',
            rec.id,
            rec.product_code,
            rec.product_name,
            rec.target_mass,
            rec.is_active,
            rec.sequence_order;
    END LOOP;
    
    -- Deactivate all ingredients that are NOT MC-001 or MP-001
    UPDATE master_formulation_ingredients
    SET is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE formulation_id = v_formulation_id
      AND product_id NOT IN (
          COALESCE(v_mc001_product_id, '00000000-0000-0000-0000-000000000000'::UUID),
          COALESCE(v_mp001_product_id, '00000000-0000-0000-0000-000000000000'::UUID)
      )
      AND is_active = true;
    
    GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;
    
    RAISE NOTICE 'Deactivated % ingredients that are not MC-001 or MP-001', v_deactivated_count;
    
    -- Ensure MC-001 and MP-001 are active and have correct target_mass
    IF v_mc001_product_id IS NOT NULL THEN
        INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order, is_active)
        VALUES (v_formulation_id, v_mc001_product_id, 100.0, 1, true)
        ON CONFLICT (formulation_id, product_id) DO UPDATE SET
            target_mass = 100.0,
            sequence_order = 1,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Ensured MC-001 (MENTHOLIC CRYSTALS) is active with target_mass = 100g';
    END IF;
    
    IF v_mp001_product_id IS NOT NULL THEN
        INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order, is_active)
        VALUES (v_formulation_id, v_mp001_product_id, 900.0, 2, true)
        ON CONFLICT (formulation_id, product_id) DO UPDATE SET
            target_mass = 900.0,
            sequence_order = 2,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Ensured MP-001 (MATERIAL PG SKPIC) is active with target_mass = 900g';
    END IF;
    
    -- Update formulation totals
    UPDATE master_formulation
    SET total_ingredients = (
        SELECT COUNT(*) FROM master_formulation_ingredients
        WHERE formulation_id = v_formulation_id
          AND COALESCE(is_active, true) = true
    ),
    total_mass = 1000.0
    WHERE id = v_formulation_id;
    
    RAISE NOTICE 'Updated formulation totals';
    
    -- Show final ingredients
    RAISE NOTICE 'Final active ingredients for CRYO-MENTHOL IP-CM0006:';
    FOR rec IN (
        SELECT 
            mfi.id,
            mfi.product_id,
            mp.product_code,
            mp.product_name,
            mfi.target_mass,
            mfi.is_active,
            mfi.sequence_order
        FROM master_formulation_ingredients mfi
        LEFT JOIN master_product mp ON mfi.product_id = mp.id
        WHERE mfi.formulation_id = v_formulation_id
          AND COALESCE(mfi.is_active, true) = true
        ORDER BY COALESCE(mfi.sequence_order, 999999), mfi.created_at
    ) LOOP
        RAISE NOTICE '  - ID: %, Product: % (%), Target: %g, Sequence: %',
            rec.id,
            rec.product_code,
            rec.product_name,
            rec.target_mass,
            rec.sequence_order;
    END LOOP;
    
    RAISE NOTICE '[SUCCESS] Fixed CRYO-MENTHOL IP-CM0006 ingredients';
END $$;

-- Verify the fix
SELECT 
    mf.formulation_code,
    mf.formulation_name,
    COUNT(*) FILTER (WHERE COALESCE(mfi.is_active, true) = true) as active_ingredients,
    COUNT(*) FILTER (WHERE COALESCE(mfi.is_active, true) = false) as inactive_ingredients,
    COUNT(*) as total_ingredients,
    COALESCE(SUM(mfi.target_mass) FILTER (WHERE COALESCE(mfi.is_active, true) = true), 0) as total_target_mass
FROM master_formulation mf
LEFT JOIN master_formulation_ingredients mfi ON mf.id = mfi.formulation_id
WHERE mf.formulation_code = 'CRYO-MENTHOL IP-CM0006'
GROUP BY mf.id, mf.formulation_code, mf.formulation_name;
