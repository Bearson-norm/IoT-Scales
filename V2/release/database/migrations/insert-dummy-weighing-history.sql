-- Dummy Data: History Penimbangan untuk MO TEST/MO/001
-- SKU: CRYO-MENTHOL IP-CM0006
-- Quantity: 1000g
-- Status: Completed (semua ingredients sesuai target)

-- Step 1: Pastikan formulation dan ingredients ada
-- Jika formulation belum ada, buat terlebih dahulu
DO $$
DECLARE
    v_formulation_id UUID;
    v_user_id UUID;
    v_work_order_id UUID;
    v_ingredient_ids UUID[];
    v_ingredient_targets DECIMAL[];
    v_ingredient_tolerance_mins DECIMAL[];
    v_ingredient_tolerance_maxs DECIMAL[];
    v_ingredient_names TEXT[];
    v_ingredient_codes TEXT[];
    v_session_id UUID;
    v_ingredient_idx INTEGER;
    v_base_target DECIMAL;
    v_scaled_target DECIMAL;
    v_actual_mass DECIMAL;
    v_tolerance_min DECIMAL;
    v_tolerance_max DECIMAL;
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_end_time TIMESTAMP WITH TIME ZONE;
    v_product_id UUID;
    v_wp_count INTEGER;
    v_ws_count INTEGER;
BEGIN
    -- Get first user (operator) for created_by
    SELECT id INTO v_user_id FROM master_user WHERE role = 'operator' LIMIT 1;
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM master_user LIMIT 1;
    END IF;
    
    -- Find or create formulation for CRYO-MENTHOL IP-CM0006
    SELECT id INTO v_formulation_id 
    FROM master_formulation 
    WHERE formulation_code = 'CRYO-MENTHOL IP-CM0006' 
       OR formulation_name ILIKE '%CRYO-MENTHOL%' 
       OR sku = 'CRYO-MENTHOL IP-CM0006'
    LIMIT 1;
    
    -- If formulation doesn't exist, create it
    IF v_formulation_id IS NULL THEN
        -- Create formulation
        INSERT INTO master_formulation (formulation_code, formulation_name, sku, total_mass, total_ingredients, status)
        VALUES ('CRYO-MENTHOL IP-CM0006', 'CRYO-MENTHOL IP-CM0006', 'CRYO-MENTHOL IP-CM0006', 1000.0, 4, 'active')
        RETURNING id INTO v_formulation_id;
        
        RAISE NOTICE 'Created new formulation: CRYO-MENTHOL IP-CM0006 (ID: %)', v_formulation_id;
        
        -- Ingredient 1: SALTNIC (Nicotine Salt) - 60g
            SELECT id INTO v_product_id
            FROM master_product 
            WHERE (product_code ILIKE '%SALTNIC%' OR product_name ILIKE '%SALTNIC%' OR product_name ILIKE '%NICOTINE%')
              AND product_category = 'raw'
            LIMIT 1;
            
            IF v_product_id IS NULL THEN
                INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
                VALUES ('SALTNIC-001', 'SALTNIC A6H1007', 'raw', 'high', 'active')
                RETURNING id INTO v_product_id;
            END IF;
            
            INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order, is_active)
            VALUES (v_formulation_id, v_product_id, 60.0, 1, true)
            ON CONFLICT (formulation_id, product_id) DO NOTHING;
            
            -- Ingredient 2: PROPYLENE GLYCOL (PG) - 200g
            SELECT id INTO v_product_id
            FROM master_product 
            WHERE (product_code ILIKE '%PG%' OR product_name ILIKE '%PROPYLENE%' OR product_name ILIKE '%GLYCOL%')
              AND product_category = 'raw'
            LIMIT 1;
            
            IF v_product_id IS NULL THEN
                INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
                VALUES ('PG-001', 'PROPYLENE GLYCOL (PG)', 'raw', 'standard', 'active')
                RETURNING id INTO v_product_id;
            END IF;
            
            INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order, is_active)
            VALUES (v_formulation_id, v_product_id, 200.0, 2, true)
            ON CONFLICT (formulation_id, product_id) DO NOTHING;
            
            -- Ingredient 3: VEGETABLE GLYCERIN (VG) - 640g
            SELECT id INTO v_product_id
            FROM master_product 
            WHERE (product_code ILIKE '%VG%' OR product_name ILIKE '%GLYCERIN%' OR product_name ILIKE '%VEGETABLE%')
              AND product_category = 'raw'
            LIMIT 1;
            
            IF v_product_id IS NULL THEN
                INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
                VALUES ('VG-001', 'VEGETABLE GLYCERIN (VG)', 'raw', 'standard', 'active')
                RETURNING id INTO v_product_id;
            END IF;
            
            INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order, is_active)
            VALUES (v_formulation_id, v_product_id, 640.0, 3, true)
            ON CONFLICT (formulation_id, product_id) DO NOTHING;
            
            -- Ingredient 4: MENTHOL FLAVOR - 100g
            SELECT id INTO v_product_id
            FROM master_product 
            WHERE (product_code ILIKE '%MENTHOL%' OR product_name ILIKE '%MENTHOL%' OR product_name ILIKE '%FLAVOR%')
              AND product_category = 'raw'
            LIMIT 1;
            
            IF v_product_id IS NULL THEN
                INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
                VALUES ('MENTHOL-001', 'MENTHOL FLAVOR', 'raw', 'high', 'active')
                RETURNING id INTO v_product_id;
            END IF;
            
            INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order, is_active)
            VALUES (v_formulation_id, v_product_id, 100.0, 4, true)
            ON CONFLICT (formulation_id, product_id) DO NOTHING;
        
        -- Update total_ingredients count
        UPDATE master_formulation 
        SET total_ingredients = (
            SELECT COUNT(*) FROM master_formulation_ingredients WHERE formulation_id = v_formulation_id
        )
        WHERE id = v_formulation_id;
    ELSE
        RAISE NOTICE 'Using existing formulation: CRYO-MENTHOL IP-CM0006 (ID: %)', v_formulation_id;
        
        -- Ensure all required ingredients exist (create if missing)
        -- Ingredient 1: SALTNIC (Nicotine Salt) - 60g
        SELECT id INTO v_product_id
        FROM master_product 
        WHERE (product_code ILIKE '%SALTNIC%' OR product_name ILIKE '%SALTNIC%' OR product_name ILIKE '%NICOTINE%')
          AND product_category = 'raw'
        LIMIT 1;
        
        IF v_product_id IS NULL THEN
            INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
            VALUES ('SALTNIC-001', 'SALTNIC A6H1007', 'raw', 'high', 'active')
            RETURNING id INTO v_product_id;
        END IF;
        
        INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order, is_active)
        VALUES (v_formulation_id, v_product_id, 60.0, 1, true)
        ON CONFLICT (formulation_id, product_id) DO UPDATE SET
            target_mass = 60.0,
            sequence_order = 1,
            is_active = true;
        
        -- Ingredient 2: PROPYLENE GLYCOL (PG) - 200g
        SELECT id INTO v_product_id
        FROM master_product 
        WHERE (product_code ILIKE '%PG%' OR product_name ILIKE '%PROPYLENE%' OR product_name ILIKE '%GLYCOL%')
          AND product_category = 'raw'
        LIMIT 1;
        
        IF v_product_id IS NULL THEN
            INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
            VALUES ('PG-001', 'PROPYLENE GLYCOL (PG)', 'raw', 'standard', 'active')
            RETURNING id INTO v_product_id;
        END IF;
        
        INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order, is_active)
        VALUES (v_formulation_id, v_product_id, 200.0, 2, true)
        ON CONFLICT (formulation_id, product_id) DO UPDATE SET
            target_mass = 200.0,
            sequence_order = 2,
            is_active = true;
        
        -- Ingredient 3: VEGETABLE GLYCERIN (VG) - 640g
        SELECT id INTO v_product_id
        FROM master_product 
        WHERE (product_code ILIKE '%VG%' OR product_name ILIKE '%GLYCERIN%' OR product_name ILIKE '%VEGETABLE%')
          AND product_category = 'raw'
        LIMIT 1;
        
        IF v_product_id IS NULL THEN
            INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
            VALUES ('VG-001', 'VEGETABLE GLYCERIN (VG)', 'raw', 'standard', 'active')
            RETURNING id INTO v_product_id;
        END IF;
        
        INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order, is_active)
        VALUES (v_formulation_id, v_product_id, 640.0, 3, true)
        ON CONFLICT (formulation_id, product_id) DO UPDATE SET
            target_mass = 640.0,
            sequence_order = 3,
            is_active = true;
        
        -- Ingredient 4: MENTHOL FLAVOR - 100g
        SELECT id INTO v_product_id
        FROM master_product 
        WHERE (product_code ILIKE '%MENTHOL%' OR product_name ILIKE '%MENTHOL%' OR product_name ILIKE '%FLAVOR%')
          AND product_category = 'raw'
        LIMIT 1;
        
        IF v_product_id IS NULL THEN
            INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
            VALUES ('MENTHOL-001', 'MENTHOL FLAVOR', 'raw', 'high', 'active')
            RETURNING id INTO v_product_id;
        END IF;
        
        INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order, is_active)
        VALUES (v_formulation_id, v_product_id, 100.0, 4, true)
        ON CONFLICT (formulation_id, product_id) DO UPDATE SET
            target_mass = 100.0,
            sequence_order = 4,
            is_active = true;
        
        -- Deactivate ingredients that are NOT in our required list
        -- Required ingredients: SALTNIC, PG, VG, MENTHOL
        UPDATE master_formulation_ingredients
        SET is_active = false
        WHERE formulation_id = v_formulation_id
          AND id NOT IN (
              SELECT mfi.id
              FROM master_formulation_ingredients mfi
              JOIN master_product mp ON mfi.product_id = mp.id
              WHERE mfi.formulation_id = v_formulation_id
                AND (
                    (mp.product_code ILIKE '%SALTNIC%' OR mp.product_name ILIKE '%SALTNIC%' OR mp.product_name ILIKE '%NICOTINE%')
                    OR (mp.product_code ILIKE '%PG-001%' OR mp.product_name ILIKE '%PROPYLENE GLYCOL%')
                    OR (mp.product_code ILIKE '%VG-001%' OR mp.product_name ILIKE '%VEGETABLE GLYCERIN%')
                    OR (mp.product_code ILIKE '%MENTHOL-001%' OR (mp.product_name ILIKE '%MENTHOL%' AND mp.product_name ILIKE '%FLAVOR%'))
                )
          );
        
        -- Update total_ingredients count
        UPDATE master_formulation 
        SET total_ingredients = (
            SELECT COUNT(*) FROM master_formulation_ingredients 
            WHERE formulation_id = v_formulation_id 
              AND COALESCE(is_active, true) = true
        ),
        total_mass = 1000.0
        WHERE id = v_formulation_id;
        
        RAISE NOTICE 'Ensured all required ingredients exist for formulation and deactivated unwanted ones';
    END IF;
    
    -- Step 2: Create work order
    DELETE FROM work_orders WHERE work_order_number = 'TEST/MO/001';
    
    v_start_time := CURRENT_TIMESTAMP - INTERVAL '2 hours';
    v_end_time := CURRENT_TIMESTAMP - INTERVAL '30 minutes';
    
    INSERT INTO work_orders (
        work_order_number,
        formulation_id,
        planned_quantity,
        actual_quantity,
        status,
        created_by,
        started_at,
        completed_at,
        created_at,
        updated_at
    )
    VALUES (
        'TEST/MO/001',
        v_formulation_id,
        1000.0,
        1000.0,
        'completed',
        v_user_id,
        v_start_time,
        v_end_time,
        v_start_time,
        v_end_time
    )
    RETURNING id INTO v_work_order_id;
    
    RAISE NOTICE 'Created work order: TEST/MO/001 (ID: %)', v_work_order_id;
    
    -- Step 3: Get all ingredients for this formulation with their details
    -- Use subquery to get ordered data first, then aggregate
    SELECT 
        ARRAY_AGG(ordered_ingredients.id),
        ARRAY_AGG(ordered_ingredients.target_mass),
        ARRAY_AGG(COALESCE(ordered_ingredients.target_mass * 0.95, ordered_ingredients.target_mass - 5)), -- tolerance_min (5% or 5g)
        ARRAY_AGG(COALESCE(ordered_ingredients.target_mass * 1.05, ordered_ingredients.target_mass + 5)), -- tolerance_max (5% or 5g)
        ARRAY_AGG(ordered_ingredients.product_name),
        ARRAY_AGG(ordered_ingredients.product_code)
    INTO 
        v_ingredient_ids,
        v_ingredient_targets,
        v_ingredient_tolerance_mins,
        v_ingredient_tolerance_maxs,
        v_ingredient_names,
        v_ingredient_codes
    FROM (
        SELECT 
            mfi.id,
            mfi.target_mass,
            mp.product_name,
            mp.product_code
        FROM master_formulation_ingredients mfi
        JOIN master_product mp ON mfi.product_id = mp.id
        WHERE mfi.formulation_id = v_formulation_id
          AND COALESCE(mfi.is_active, true) = true
        ORDER BY COALESCE(mfi.sequence_order, 999999), mfi.created_at
    ) AS ordered_ingredients;
    
    -- Check if ingredients were found
    IF v_ingredient_ids IS NULL OR array_length(v_ingredient_ids, 1) IS NULL OR array_length(v_ingredient_ids, 1) = 0 THEN
        RAISE EXCEPTION 'No active ingredients found for formulation ID: %. Please ensure formulation has ingredients.', v_formulation_id;
    END IF;
    
    RAISE NOTICE 'Found % ingredients for formulation', array_length(v_ingredient_ids, 1);
    
    -- Log ingredient details
    FOR v_ingredient_idx IN 1..array_length(v_ingredient_ids, 1) LOOP
        RAISE NOTICE 'Ingredient %: % (%) - Target: %g', 
            v_ingredient_idx,
            v_ingredient_names[v_ingredient_idx],
            v_ingredient_codes[v_ingredient_idx],
            v_ingredient_targets[v_ingredient_idx];
    END LOOP;
    
    -- Step 4: Create weighing_progress and weighing_sessions for each ingredient
    FOR v_ingredient_idx IN 1..array_length(v_ingredient_ids, 1) LOOP
        v_base_target := v_ingredient_targets[v_ingredient_idx];
        v_scaled_target := v_base_target; -- Quantity is 1000g, same as base, so no scaling needed
        v_tolerance_min := v_ingredient_tolerance_mins[v_ingredient_idx];
        v_tolerance_max := v_ingredient_tolerance_maxs[v_ingredient_idx];
        
        -- Actual mass is exactly at target (perfect weighing)
        v_actual_mass := v_scaled_target;
        
        -- Calculate session times (spread over 2 hours)
        v_start_time := CURRENT_TIMESTAMP - INTERVAL '2 hours' + (v_ingredient_idx * INTERVAL '25 minutes');
        v_end_time := v_start_time + INTERVAL '15 minutes';
        
        -- Create weighing_progress
        INSERT INTO weighing_progress (
            work_order_id,
            ingredient_id,
            target_mass,
            actual_mass,
            status,
            tolerance_min,
            tolerance_max,
            created_at,
            updated_at,
            completed_at
        )
        VALUES (
            v_work_order_id,
            v_ingredient_ids[v_ingredient_idx],
            v_scaled_target,
            v_actual_mass,
            'completed',
            v_tolerance_min,
            v_tolerance_max,
            v_start_time,
            v_end_time,
            v_end_time
        )
        ON CONFLICT (work_order_id, ingredient_id) 
        DO UPDATE SET
            target_mass = EXCLUDED.target_mass,
            actual_mass = EXCLUDED.actual_mass,
            status = 'completed',
            tolerance_min = EXCLUDED.tolerance_min,
            tolerance_max = EXCLUDED.tolerance_max,
            completed_at = EXCLUDED.completed_at,
            updated_at = EXCLUDED.updated_at;
        
        -- Create weighing_sessions (1 session per ingredient, completed)
        INSERT INTO weighing_sessions (
            work_order_id,
            session_number,
            ingredient_id,
            target_mass,
            actual_mass,
            accumulated_mass,
            status,
            tolerance_min,
            tolerance_max,
            weighed_by,
            session_started_at,
            session_completed_at,
            created_at
        )
        VALUES (
            v_work_order_id,
            v_ingredient_idx,
            v_ingredient_ids[v_ingredient_idx],
            v_scaled_target,
            v_actual_mass,
            v_actual_mass,
            'completed',
            v_tolerance_min,
            v_tolerance_max,
            v_user_id,
            v_start_time,
            v_end_time,
            v_start_time
        )
        RETURNING id INTO v_session_id;
        
        RAISE NOTICE 'Created weighing data for ingredient %: % (Target: %g, Actual: %g)',
            v_ingredient_idx,
            v_ingredient_names[v_ingredient_idx],
            v_scaled_target,
            v_actual_mass;
    END LOOP;
    
    -- Verify data was created
    SELECT COUNT(*) INTO v_wp_count
    FROM weighing_progress
    WHERE work_order_id = v_work_order_id;
    
    SELECT COUNT(*) INTO v_ws_count
    FROM weighing_sessions
    WHERE work_order_id = v_work_order_id;
    
    RAISE NOTICE '[SUCCESS] Dummy data created successfully!';
    RAISE NOTICE '   Work Order: TEST/MO/001 (ID: %)', v_work_order_id;
    RAISE NOTICE '   SKU: CRYO-MENTHOL IP-CM0006';
    RAISE NOTICE '   Quantity: 1000g';
    RAISE NOTICE '   Status: Completed';
    RAISE NOTICE '   Total Ingredients: %', array_length(v_ingredient_ids, 1);
    RAISE NOTICE '   Weighing Progress Records: %', v_wp_count;
    RAISE NOTICE '   Weighing Sessions Records: %', v_ws_count;
    
    IF v_wp_count = 0 THEN
        RAISE WARNING '[WARNING] No weighing_progress records created!';
    END IF;
    
    IF v_ws_count = 0 THEN
        RAISE WARNING '[WARNING] No weighing_sessions records created!';
    END IF;
    
END $$;

-- Verify the data was created
SELECT 
    wo.work_order_number as mo_number,
    mf.formulation_name as sku_name,
    mf.formulation_code as sku_code,
    wo.planned_quantity,
    wo.actual_quantity,
    wo.status,
    wo.started_at,
    wo.completed_at,
    COUNT(DISTINCT wp.id) as total_ingredients,
    COUNT(DISTINCT CASE WHEN wp.status = 'completed' THEN wp.id END) as completed_ingredients,
    COALESCE(SUM(wp.target_mass), 0) as total_target,
    COALESCE(SUM(wp.actual_mass), 0) as total_actual,
    COUNT(DISTINCT ws.id) as total_sessions
FROM work_orders wo
JOIN master_formulation mf ON wo.formulation_id = mf.id
LEFT JOIN weighing_progress wp ON wo.id = wp.work_order_id
LEFT JOIN weighing_sessions ws ON wo.id = ws.work_order_id
WHERE wo.work_order_number = 'TEST/MO/001'
GROUP BY wo.work_order_number, mf.formulation_name, mf.formulation_code, wo.planned_quantity, wo.actual_quantity, wo.status, wo.started_at, wo.completed_at;
