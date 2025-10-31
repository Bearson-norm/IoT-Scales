const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'FLB_MOWS',
  password: process.env.DB_PASSWORD || 'Admin123',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// API Routes
-February====================
// RS232 Scale Integration - Vibra Scale Configuration
// =========================
// Konfigurasi RS232 sesuai spesifikasi:
// - Baud rate: 9600
// - Data bits: 8
// - Stop bits: 2
// - Parity: none
// - Control lines: assert DTR/RTS saat open
// - Port Windows: dukung normalisasi COM10+ (\\\\.\\COM10)
// - Tidak menggunakan port jika sedang dipakai aplikasi lain
let scaleConfig = {
  enabled: false,
  model: 'vibra',
  port: process.env.SCALE_PORT || 'COM1',
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 2,
  timeoutMs: 3000,
  assertDTR: true,  // Assert DTR saat open port
  assertRTS: true   // Assert RTS saat open port
};

let SerialPortLib = null;
let activePort = null; // Track active port to prevent multiple opens
let lastReadTime = 0;
const MIN_READ_INTERVAL = 200; // Minimum 200ms between reads
let pendingRead = null; // Queue for concurrent requests

try {
  SerialPortLib = require('serialport');
} catch (_) {
  console.warn('⚠️  serialport module not installed. Scale integration disabled.');
}

// Normalize Windows COM port (COM10+ needs \\\\.\\ prefix)
function normalizePort(portPath) {
  if (process.platform === 'win32' && /^COM\d+$/i.test(portPath)) {
    const num = parseInt(portPath.replace(/COM/i, ''), 10);
    if (num >= 10) {
      return `\\\\.\\${portPath}`;
    }
  }
  return portPath;
}

// Parse Vibra format: '+000085.9 G S' -> { weight: 0.0859, unit: 'kg', stable: true }
// Format: (sign)(6 digit).(1 digit) spasi unit G/K spasi status S/I
// Example: '+000085.9 G S' (sign)(6 digit).(1 digit) space unit space status
function parseVibraData(rawData) {
  // Clean data: remove newlines, carriage returns, and trim
  const cleaned = rawData.replace(/[\r\n]/g, '').trim();
  
  // Match pattern: sign + 6 digits + dot + 1 digit + space + unit (G/K) + space + status (S/I)
  // Allow for multiple spaces between fields
  const match = cleaned.match(/^([+-])(\d{6})\.(\d)\s+([GK])\s+([SI])\s*$/);
  if (!match) return null;
  
  const [, sign, whole, decimal, unit, status] = match;
  const numericValue = parseFloat(`${sign}${whole}.${decimal}`);
  
  // Parsing rules:
  // - Jika unit G (gram), konversi ke kg: kg = nilai_g / 1000
  // - Jika unit K (kg), gunakan langsung
  let weightKg = numericValue;
  if (unit === 'G') {
    weightKg = numericValue / 1000; // gram to kg
  } // else unit === 'K', already in kg
  
  return {
    weight: weightKg,
    weightOriginal: numericValue,
    unit: 'kg',
    originalUnit: unit,
    stable: status === 'S',
    status: status === 'S' ? 'stable' : 'unstable',
    raw: cleaned
  };
}

app.get('/api/scale/config', (req, res) => {
  res.json({ 
    success: true, 
    data: scaleConfig, 
    serialAvailable: !!SerialPortLib,
    portActive: !!activePort
  });
});

app.post('/api/scale/config', async (req, res) => {
  try {
    const cfg = req.body || {};
    // Preserve fixed settings, only allow port change
    scaleConfig = { 
      ...scaleConfig, 
      port: cfg.port || scaleConfig.port,
      enabled: cfg.enabled !== undefined ? cfg.enabled : scaleConfig.enabled
    };
    
    // Close active port if port changed
    if (activePort && activePort.path !== normalizePort(scaleConfig.port)) {
      try {
        await new Promise((resolve) => {
          activePort.close(() => resolve());
        });
      } catch (_) {}
      activePort = null;
    }
    
    res.json({ success: true, data: scaleConfig });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Invalid config', details: error.message });
  }
});

app.get('/api/scale/ports', async (req, res) => {
  try {
    if (!SerialPortLib) return res.json({ success: true, data: [] });
    const { SerialPort } = SerialPortLib;
    const ports = await SerialPort.list();
    res.json({ 
      success: true, 
      data: ports.map(p => ({ 
        path: p.path, 
        manufacturer: p.manufacturer || '',
        normalized: normalizePort(p.path)
      })) 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list ports', details: error.message });
  }
});

app.get('/api/scale/read', async (req, res) => {
  if (!SerialPortLib) {
    return res.status(501).json({ success: false, error: 'Serialport module not available' });
  }
  
  // Throttle requests to prevent too many concurrent opens
  const now = Date.now();
  if (now - lastReadTime < MIN_READ_INTERVAL) {
    return res.status(429).json({ 
      success: false, 
      error: 'Too many requests. Please wait before reading again.' 
    });
  }
ється
  try {
    const { SerialPort } = SerialPortLib;
    const normalizedPort = normalizePort(scaleConfig.port);
    
    // If active port is different or closed, allow new connection
    if (activePort && activePort.path === normalizedPort && activePort.isOpen) {
      // Port already open, try to read from it instead of opening new
      return res.status(409).json({ 
        success: false, 
        error: 'Port is busy. Close existing connection first.' 
      });
    }
    
    // Close any existing port before opening new one
    if (activePort && activePort.isOpen) {
      try {
        await new Promise((resolve) => {
          activePort.close(() => resolve());
        });
      } catch (_) {}
      activePort = null;
    }
    
    lastReadTime = Date.now();
    
    let port = null;
    const chunks = [];
    let resolved = false;
    let timeoutId = null;
    
    const cleanup = () => {
      try {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (port) {
          // Close port asynchronously in background
          if (port.isOpen) {
            port.close((err) => {
              if (err) console.error('Port close error:', err);
            });
          }
          if (activePort === port) activePort = null;
          port = null;
        }
      } catch (_) {}
    };
    
    const finalize = (ok, payload) => {
      if (resolved) return; // Prevent double response
      resolved = true;
      
      // Send response immediately (synchronous)
      if (!res.headersSent) {
        try {
          if (ok) {
            res.json({ success: true, timestamp: new Date().toISOString(), ...payload });
          } else {
            res.status(504).json({ success: false, timestamp: new Date().toISOString(), ...payload });
          }
        } catch (err) {
          console.error('Response send error:', err.message);
        }
      }
      
      // Cleanup in background (async)
      cleanup();
    };
    
    port = new SerialPort({
      path: normalizedPort,
      baudRate: scaleConfig.baudRate,
      dataBits: scaleConfig.dataBits,
      parity: scaleConfig.parity,
      stopBits: scaleConfig.stopBits,
      autoOpen: false
    });
    
    activePort = port;
    
    port.on('data', (data) => {
      if (resolved) return;
      const text = data.toString();
      chunks.push(text);
      const fullBuffer = chunks.join('');
      
      // Try parsing Vibra format
      // Data may come in chunks, so we try to parse the accumulated buffer
      const parsed = parseVibraData(fullBuffer);
      if (parsed) {
        finalize(true, parsed);
      } else if (fullBuffer.length > 50) {
        // Buffer too long, might be corrupted or incomplete
        // Try to find a complete line by looking for newline or checking if we have enough characters
        const lines = fullBuffer.split(/[\r\n]/);
        for (const line of lines) {
          const lineParsed = parseVibraData(line);
          if (lineParsed) {
            finalize(true, lineParsed);
            return;
          }
        }
        // If no valid line found and buffer too long, report error
        finalize(false, { error: 'Invalid data format', raw: fullBuffer.slice(0, 100) });
      }
    });
    
    port.on('error', (err) => {
      if (resolved) return;
      if (err.message && err.message.includes('cannot open')) {
        finalize(false, { error: `Port ${scaleConfig.port} is busy or not available. Close other applications using this port.` });
      } else {
        finalize(false, { error: err.message || 'Port error' });
      }
    });
    
    port.open((err) => {
      if (resolved) return;
      
      if (err) {
        finalize(false, { 
          error: err.message && err.message.includes('cannot open')
            ? `Port ${scaleConfig.port} is busy or not available. Close other applications using this port.`
            : `Failed to open port: ${err.message}`
        });
        return;
      }
      
      // Assert DTR/RTS after opening
      try {
        if (scaleConfig.assertDTR) port.set({ dtr: true });
        if (scaleConfig.assertRTS) port.set({ rts: true });
      } catch (setErr) {
        console.warn('Failed to set DTR/RTS:', setErr.message);
      }
    });
    
    // Set timeout (will be cleared in cleanup if response sent earlier)
    timeoutId = setTimeout(() => {
      if (!resolved) {
        finalize(false, { error: 'Timeout: No data received from scale' });
      }
    }, scaleConfig.timeoutMs);
  } catch (error) {
    // Ensure response is sent even if error occurs before port setup
    if (!res.headersSent) {
      try {
        res.status(500).json({ success: false, error: 'Failed to read scale', details: error.message });
      } catch (err) {
        console.error('Error sending error response:', err.message);
      }
    }
  }
});


// Health check endpoint for Docker
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Search formulations endpoint
app.get('/api/formulations/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
        message: 'Query too short'
      });
    }

    const query = `
      SELECT 
        id,
        formulation_code,
        formulation_name,
        sku,
        total_mass,
        total_ingredients,
        status
      FROM master_formulation 
      WHERE 
        formulation_name ILIKE $1 
        OR formulation_code ILIKE $1
        OR sku ILIKE $1
      ORDER BY formulation_name
      LIMIT 10
    `;
    
    const result = await pool.query(query, [`%${q}%`]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error searching formulations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search formulations',
      details: error.message
    });
  }
});

// Get formulation ingredients endpoint
app.get('/api/formulations/:id/ingredients', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        mfi.id,
        mfi.target_mass,
        mp.product_code,
        mp.product_name,
        mp.product_category,
        mp.type_tolerance,
        mp.status as product_status
      FROM master_formulation_ingredients mfi
      JOIN master_product mp ON mfi.product_id = mp.id
      WHERE mfi.formulation_id = $1
      ORDER BY mfi.target_mass DESC
    `;
    
    const result = await pool.query(query, [id]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching formulation ingredients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formulation ingredients',
      details: error.message
    });
  }
});

// Save weighing progress endpoint
app.post('/api/weighing/save-progress', async (req, res) => {
  try {
    const { moNumber, formulationId, ingredients, progress } = req.body;
    
    // Start transaction
    await pool.query('BEGIN');
    
    // Create or update work order
    const workOrderQuery = `
      INSERT INTO work_orders (work_order_number, formulation_id, planned_quantity, status, created_by, created_at)
      VALUES ($1, $2, $3, 'in_progress', NULL, CURRENT_TIMESTAMP)
      ON CONFLICT (work_order_number) 
      DO UPDATE SET 
        status = 'in_progress',
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    const workOrderResult = await pool.query(workOrderQuery, [
      moNumber, 
      formulationId, 
      progress.totalQuantity || 1
    ]);
    
    const workOrderId = workOrderResult.rows[0].id;
    
    // Save weighing progress for each ingredient
    for (const ingredient of ingredients) {
      const progressQuery = `
        INSERT INTO weighing_progress (
          work_order_id, 
          ingredient_id, 
          target_mass, 
          actual_mass, 
          status, 
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (work_order_id, ingredient_id)
        DO UPDATE SET 
          actual_mass = $4,
          status = $5,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await pool.query(progressQuery, [
        workOrderId,
        ingredient.id, // should be UUID of master_formulation_ingredients.id
        ingredient.targetWeight || ingredient.target_mass || 0,
        ingredient.currentWeight || ingredient.actualWeight || 0,
        ingredient.status || 'pending'
      ]);
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Weighing progress saved successfully',
      workOrderId: workOrderId
    });
  } catch (error) {
    // Rollback transaction
    await pool.query('ROLLBACK');
    
    console.error('Error saving weighing progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save weighing progress',
      details: error.message
    });
  }
});

// Complete weighing endpoint
app.post('/api/weighing/complete', async (req, res) => {
  try {
    const { moNumber, ingredients } = req.body;
    
    // Start transaction
    await pool.query('BEGIN');
    
    // Update work order status to completed
    const workOrderQuery = `
      UPDATE work_orders 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE work_order_number = $1
      RETURNING id
    `;
    
    const workOrderResult = await pool.query(workOrderQuery, [moNumber]);
    
    if (workOrderResult.rows.length === 0) {
      throw new Error('Work order not found');
    }
    
    const workOrderId = workOrderResult.rows[0].id;
    
    // Update final weighing progress
    for (const ingredient of ingredients) {
      const progressQuery = `
        UPDATE weighing_progress 
        SET 
          actual_mass = $3,
          status = $4,
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE work_order_id = $1 AND ingredient_id = $2
      `;
      
      await pool.query(progressQuery, [
        workOrderId,
        ingredient.id,
        ingredient.actualWeight || 0,
        'completed'
      ]);
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Weighing completed successfully',
      workOrderId: workOrderId
    });
  } catch (error) {
    // Rollback transaction
    await pool.query('ROLLBACK');
    
    console.error('Error completing weighing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete weighing',
      details: error.message
    });
  }
});

// Production history list
app.get('/api/history', async (req, res) => {
  try {
    const query = `
      SELECT 
        wo.id,
        wo.work_order_number as work_order,
        wo.formulation_id,
        mf.formulation_name,
        mf.formulation_code as sku,
        wo.planned_quantity as total_weight,
        wo.status,
        wo.created_at as start_time,
        wo.completed_at as end_time
      FROM work_orders wo
      LEFT JOIN master_formulation mf ON wo.formulation_id = mf.id
      ORDER BY wo.created_at DESC
      LIMIT 200
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history', details: error.message });
  }
});

// Work order details and progress
app.get('/api/work-orders/:mo', async (req, res) => {
  try {
    const { mo } = req.params;
    const woResult = await pool.query(
      `SELECT id, work_order_number, formulation_id, planned_quantity, status, created_at, completed_at 
       FROM work_orders WHERE work_order_number = $1`,
      [mo]
    );
    if (woResult.rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    const wo = woResult.rows[0];
    const ingResult = await pool.query(
      `SELECT 
         mfi.id as ingredient_id,
         mfi.target_mass,
         mp.product_code,
         mp.product_name,
         COALESCE(wp.actual_mass, 0) as actual_mass,
         COALESCE(wp.status, 'pending') as status
       FROM master_formulation_ingredients mfi
       JOIN master_product mp ON mfi.product_id = mp.id
       LEFT JOIN weighing_progress wp ON wp.work_order_id = $1 AND wp.ingredient_id = mfi.id
       WHERE mfi.formulation_id = $2
       ORDER BY mfi.target_mass DESC`,
      [wo.id, wo.formulation_id]
    );
    res.json({ success: true, data: { workOrder: wo, ingredients: ingResult.rows } });
  } catch (error) {
    console.error('Error fetching work order detail:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch work order', details: error.message });
  }
});

// Get all products (SFG/Mixing data from formulations)
app.get('/api/products', async (req, res) => {
  try {
    const query = `
      SELECT 
        mf.id,
        mf.formulation_code as product_code,
        mf.formulation_name as product_name,
        'sfg' as product_category,
        'standard' as type_tolerance,
        mf.status,
        mf.created_at,
        mf.updated_at,
        NULL as tolerance_grouping_code,
        NULL as tolerance_grouping_name
      FROM master_formulation mf
      ORDER BY mf.formulation_name
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      category: 'sfg'
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      details: error.message
    });
  }
});

// Get all ingredients (Raw Materials)
app.get('/api/ingredients', async (req, res) => {
  try {
    const query = `
      SELECT 
        mi.id,
        mi.ingredient_code,
        mi.ingredient_name,
        mi.category,
        mi.type_tolerance,
        mi.unit,
        mi.status,
        mi.created_at,
        mi.updated_at,
        mtg.code as tolerance_grouping_code,
        mtg.name as tolerance_grouping_name
      FROM master_ingredients mi
      LEFT JOIN master_tolerance_grouping mtg ON mi.tolerance_grouping_id = mtg.id
      ORDER BY mi.ingredient_name
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredients',
      details: error.message
    });
  }
});

// Get all formulations
app.get('/api/formulations', async (req, res) => {
  try {
    const query = `
      SELECT 
        mf.id,
        mf.formulation_code,
        mf.formulation_name,
        mf.sku as sku_code,
        mf.total_mass,
        mf.total_ingredients,
        mf.status,
        mf.created_at,
        mf.updated_at
      FROM master_formulation mf
      ORDER BY mf.formulation_name
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching formulations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formulations',
      details: error.message
    });
  }
});

// Get formulation ingredients
app.get('/api/formulations/:id/ingredients', async (req, res) => {
  try {
    const formulationId = req.params.id;
    const query = `
      SELECT 
        mfi.id,
        mfi.target_mass,
        mfi.created_at,
        mfi.updated_at,
        mp.product_code as ingredient_code,
        mp.product_name as ingredient_name,
        mp.product_category as category,
        mp.type_tolerance,
        mtg.name as tolerance_grouping_name
      FROM master_formulation_ingredients mfi
      JOIN master_product mp ON mfi.product_id = mp.id
      LEFT JOIN master_tolerance_grouping mtg ON mp.tolerance_grouping_id = mtg.id
      WHERE mfi.formulation_id = $1 AND mp.product_category = 'raw'
      ORDER BY mfi.created_at
    `;
    
    const result = await pool.query(query, [formulationId]);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching formulation ingredients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formulation ingredients',
      details: error.message
    });
  }
});

// Get tolerance groupings
app.get('/api/tolerance-groupings', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        code,
        name,
        description,
        min_tolerance,
        max_tolerance,
        unit,
        status,
        created_at,
        updated_at
      FROM master_tolerance_grouping
      ORDER BY name
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching tolerance groupings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tolerance groupings',
      details: error.message
    });
  }
});

// Create new product
app.post('/api/products', async (req, res) => {
  try {
    const { productCode, productName, productCategory, typeTolerance, toleranceGroupingId, status } = req.body;
    
    const query = `
      INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, tolerance_grouping_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [productCode, productName, productCategory, typeTolerance, toleranceGroupingId, status]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      details: error.message
    });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const { productCode, productName, productCategory, typeTolerance, toleranceGroupingId, status } = req.body;
    
    const query = `
      UPDATE master_product 
      SET product_code = $1, product_name = $2, product_category = $3, type_tolerance = $4, tolerance_grouping_id = $5, status = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const result = await pool.query(query, [productCode, productName, productCategory, typeTolerance, toleranceGroupingId, status, productId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      details: error.message
    });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    const query = 'DELETE FROM master_product WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [productId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      details: error.message
    });
  }
});

// Create new formulation
app.post('/api/formulations', async (req, res) => {
  try {
    const { formulationCode, formulationName, sku, totalMass, totalIngredients, status } = req.body;
    
    const query = `
      INSERT INTO master_formulation (formulation_code, formulation_name, sku, total_mass, total_ingredients, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [formulationCode, formulationName, sku, totalMass || 0, totalIngredients || 0, status || 'active']);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Formulation created successfully'
    });
  } catch (error) {
    console.error('Error creating formulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create formulation',
      details: error.message
    });
  }
});

// Update formulation
app.put('/api/formulations/:id', async (req, res) => {
  try {
    const formulationId = req.params.id;
    const { formulationCode, formulationName, sku, totalMass, totalIngredients, status } = req.body;
    
    const query = `
      UPDATE master_formulation 
      SET formulation_code = $1, formulation_name = $2, sku = $3, total_mass = $4, total_ingredients = $5, status = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const result = await pool.query(query, [formulationCode, formulationName, sku, totalMass, totalIngredients, status, formulationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Formulation not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Formulation updated successfully'
    });
  } catch (error) {
    console.error('Error updating formulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update formulation',
      details: error.message
    });
  }
});

// Delete formulation
app.delete('/api/formulations/:id', async (req, res) => {
  try {
    const formulationId = req.params.id;
    
    const query = 'DELETE FROM master_formulation WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [formulationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Formulation not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Formulation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting formulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete formulation',
      details: error.message
    });
  }
});

// Create new ingredient
app.post('/api/ingredients', async (req, res) => {
  try {
    const { ingredientCode, ingredientName, category, typeTolerance, toleranceGroupingId, unit, status } = req.body;
    
    const query = `
      INSERT INTO master_ingredients (ingredient_code, ingredient_name, category, type_tolerance, tolerance_grouping_id, unit, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(query, [ingredientCode, ingredientName, category, typeTolerance, toleranceGroupingId, unit, status]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Ingredient created successfully'
    });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ingredient',
      details: error.message
    });
  }
});

// Update ingredient
app.put('/api/ingredients/:id', async (req, res) => {
  try {
    const ingredientId = req.params.id;
    const { ingredientCode, ingredientName, category, typeTolerance, toleranceGroupingId, unit, status } = req.body;
    
    const query = `
      UPDATE master_ingredients 
      SET ingredient_code = $1, ingredient_name = $2, category = $3, type_tolerance = $4, tolerance_grouping_id = $5, unit = $6, status = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    
    const result = await pool.query(query, [ingredientCode, ingredientName, category, typeTolerance, toleranceGroupingId, unit, status, ingredientId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Ingredient updated successfully'
    });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ingredient',
      details: error.message
    });
  }
});

// Delete ingredient
app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    const ingredientId = req.params.id;
    
    const query = 'DELETE FROM master_ingredients WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [ingredientId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Ingredient deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete ingredient',
      details: error.message
    });
  }
});

// Preview import endpoint
app.post('/api/preview-import', async (req, res) => {
  const multer = require('multer');
  const upload = multer({ dest: 'uploads/' });
  
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: 'File upload failed',
        details: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const fs = require('fs');
    const path = require('path');
    const csv = require('csv-parser');

    const fullRefresh = req.body.fullRefresh === 'true';
    let logId = null; // Declare logId outside try block for error handling

    try {
      const filename = req.file.originalname;
      const filepath = req.file.path;
      
      console.log(`🔍 Previewing import from: ${filename}`);
      console.log(`🔄 Full Refresh Mode: ${fullRefresh ? 'ENABLED' : 'DISABLED'}`);
      
      // Read and parse CSV
      const csvData = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filepath)
          .pipe(csv())
          .on('data', (row) => csvData.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
      
      console.log(`📊 Parsed ${csvData.length} records from CSV`);
      
      // Track changes for preview (without modifying database)
      const preview = {
        total_records: csvData.length,
        new_products: 0,
        updated_products: 0,
        new_formulations: 0,
        new_ingredients: 0,
        full_refresh: fullRefresh,
        changes: []
      };
      
      // Process products and formulations
      const productsMap = new Map();
      const formulationsMap = new Map();
      const formulationIngredients = [];
      
      // Parse CSV data
      for (const row of csvData) {
        const formulationCode = row.formulationCode;
        const formulationName = row.formulationName;
        const productCode = row.productCode;
        const productName = row.productName;
        const targetMass = parseFloat(row.targetMass) || 0;
        
        // Track unique products
        if (!productsMap.has(productCode)) {
          productsMap.set(productCode, {
            code: productCode,
            name: productName,
            category: 'raw',
            type_tolerance: 'standard'
          });
        }
        
        // Track unique formulations
        if (!formulationsMap.has(formulationCode)) {
          formulationsMap.set(formulationCode, {
            code: formulationCode,
            name: formulationName
          });
        }
        
        // Track formulation ingredients
        formulationIngredients.push({
          formulationCode,
          productCode,
          targetMass
        });
      }
      
      // Check existing products (preview only)
      for (const [code, product] of productsMap) {
        const existing = await pool.query(
          'SELECT id, product_name FROM master_product WHERE product_code = $1',
          [code]
        );
        
        if (fullRefresh) {
          // In full refresh mode, all will be new
          preview.new_products++;
          preview.changes.push({
            type: 'new',
            table: 'master_product',
            description: `Will add new product ${code}: ${product.name}`,
            new_value: product.name,
            note: 'Existing products will be DELETED in full refresh mode'
          });
        } else {
          // Normal mode: check if exists
          if (existing.rows.length > 0) {
            const existingProduct = existing.rows[0];
            if (existingProduct.product_name !== product.name) {
              preview.updated_products++;
              preview.changes.push({
                type: 'updated',
                table: 'master_product',
                description: `Updated product ${code}`,
                old_value: existingProduct.product_name,
                new_value: product.name
              });
            }
          } else {
            preview.new_products++;
            preview.changes.push({
              type: 'new',
              table: 'master_product',
              description: `Added new product ${code}: ${product.name}`,
              new_value: product.name
            });
          }
        }
      }
      
      // Check existing formulations (preview only)
      for (const [code, formulation] of formulationsMap) {
        const existing = await pool.query(
          'SELECT id FROM master_formulation WHERE formulation_code = $1',
          [code]
        );
        
        if (existing.rows.length === 0) {
          // Insert new formulation
          preview.new_formulations++;
          preview.changes.push({
            type: 'new',
            table: 'master_formulation',
            description: `Added new formulation ${code}`,
            new_value: formulation.name
          });
        }
      }
      
      // Get all formulations and products for linking (preview only)
      const { rows: formulations } = await pool.query('SELECT id, formulation_code FROM master_formulation');
      const { rows: products } = await pool.query('SELECT id, product_code FROM master_product WHERE product_category = $1', ['raw']);
      
      const formulationMap = new Map(formulations.map(f => [f.formulation_code, f.id]));
      const productMap = new Map(products.map(p => [p.product_code, p.id]));
      
      // Count formulation ingredients (preview only)
      let successfulIngredients = 0;
      
      for (const fi of formulationIngredients) {
        const formulationId = formulationMap.get(fi.formulationCode);
        const productId = productMap.get(fi.productCode);
        
        if (formulationId && productId) {
          successfulIngredients++;
        }
      }
      
      preview.new_ingredients = successfulIngredients;
      
      // Clean up uploaded file
      fs.unlinkSync(filepath);
      
      console.log(`✅ Preview completed successfully`);
      console.log(`📊 Preview Summary: ${preview.new_products} new products, ${preview.updated_products} updated products, ${preview.new_formulations} new formulations, ${successfulIngredients} ingredients`);
      
      res.json({
        success: true,
        message: 'Preview completed successfully',
        preview: preview,
        filename: filename
      });
      
    } catch (error) {
      console.error('❌ Preview failed:', error);
      
      // Clean up uploaded file
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Preview failed',
        details: error.message
      });
    }
  });
});

// Import database endpoint
app.post('/api/import-database', async (req, res) => {
  const multer = require('multer');
  const upload = multer({ dest: 'uploads/' });
  
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: 'File upload failed',
        details: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const fs = require('fs');
    const path = require('path');
    const csv = require('csv-parser');

    const fullRefresh = req.body.fullRefresh === 'true';
    let logId = null; // Declare logId outside try block for error handling

    try {
      const filename = req.file.originalname;
      const filepath = req.file.path;
      
      console.log(`🔄 Starting database import from: ${filename}`);
      console.log(`🔄 Full Refresh Mode: ${fullRefresh ? 'ENABLED' : 'DISABLED'}`);
      
      // Start transaction
      await pool.query('BEGIN');

      // Full Refresh: Delete existing data before import
      if (fullRefresh) {
        console.log('🗑️  Full Refresh: Deleting existing data...');
        await pool.query('DELETE FROM master_formulation_ingredients');
        console.log('✅ Deleted master_formulation_ingredients');
        await pool.query('DELETE FROM master_formulation');
        console.log('✅ Deleted master_formulation');
        await pool.query("DELETE FROM master_product WHERE product_category = 'raw'");
        console.log('✅ Deleted master_product (raw only)');
      }
      
      // Create import log entry
      const logResult = await pool.query(
        `INSERT INTO import_logs (import_type, source_type, source_name, status, imported_by, started_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING id`,
        ['master_formulation', 'file', filename, 'in_progress', null]
      );
      
      logId = logResult.rows[0].id;
      
      // Read and parse CSV
      const csvData = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filepath)
          .pipe(csv())
          .on('data', (row) => csvData.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
      
      console.log(`📊 Parsed ${csvData.length} records from CSV`);
      
      // Track changes for comparison
      const comparison = {
        total_records: csvData.length,
        new_products: 0,
        updated_products: 0,
        new_formulations: 0,
        new_ingredients: 0,
        changes: []
      };
      
      // Process products and formulations
      const productsMap = new Map();
      const formulationsMap = new Map();
      const formulationIngredients = [];
      
      // Parse CSV data
      for (const row of csvData) {
        const formulationCode = row.formulationCode;
        const formulationName = row.formulationName;
        const productCode = row.productCode;
        const productName = row.productName;
        const targetMass = parseFloat(row.targetMass) || 0;
        
        // Track unique products
        if (!productsMap.has(productCode)) {
          productsMap.set(productCode, {
            code: productCode,
            name: productName,
            category: 'raw',
            type_tolerance: 'standard'
          });
        }
        
        // Track unique formulations
        if (!formulationsMap.has(formulationCode)) {
          formulationsMap.set(formulationCode, {
            code: formulationCode,
            name: formulationName
          });
        }
        
        // Track formulation ingredients
        formulationIngredients.push({
          formulationCode,
          productCode,
          targetMass
        });
      }
      
      // Process products
      for (const [code, product] of productsMap) {
        if (fullRefresh) {
          // Full refresh: always insert new
          await pool.query(
            `INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
             VALUES ($1, $2, $3, $4, 'active')`,
            [product.code, product.name, product.category, product.type_tolerance]
          );
          
          comparison.new_products++;
          comparison.changes.push({
            type: 'new',
            table: 'master_product',
            description: `Added new product ${code}: ${product.name}`,
            new_value: product.name
          });
        } else {
          // Normal mode: check if exists
          const existing = await pool.query(
            'SELECT id, product_name FROM master_product WHERE product_code = $1',
            [code]
          );
          
          if (existing.rows.length > 0) {
            // Update existing product if name changed
            const existingProduct = existing.rows[0];
            if (existingProduct.product_name !== product.name) {
              await pool.query(
                `UPDATE master_product 
                 SET product_name = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE product_code = $2`,
                [product.name, code]
              );
              
              comparison.updated_products++;
              comparison.changes.push({
                type: 'updated',
                table: 'master_product',
                description: `Updated product ${code}`,
                old_value: existingProduct.product_name,
                new_value: product.name
              });
            }
          } else {
            // Insert new product
            await pool.query(
              `INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
               VALUES ($1, $2, $3, $4, 'active')`,
              [product.code, product.name, product.category, product.type_tolerance]
            );
            
            comparison.new_products++;
            comparison.changes.push({
              type: 'new',
              table: 'master_product',
              description: `Added new product ${code}: ${product.name}`,
              new_value: product.name
            });
          }
        }
      }
      
      // Process formulations
      for (const [code, formulation] of formulationsMap) {
        if (fullRefresh) {
          // Full refresh: always insert new
          await pool.query(
            `INSERT INTO master_formulation (formulation_code, formulation_name, sku, total_mass, total_ingredients, status)
             VALUES ($1, $2, $3, 0, 0, 'active')`,
            [formulation.code, formulation.name, formulation.code]
          );
          
          comparison.new_formulations++;
          comparison.changes.push({
            type: 'new',
            table: 'master_formulation',
            description: `Added new formulation ${code}`,
            new_value: formulation.name
          });
        } else {
          // Normal mode: check if exists
          const existing = await pool.query(
            'SELECT id FROM master_formulation WHERE formulation_code = $1',
            [code]
          );
          
          if (existing.rows.length === 0) {
            // Insert new formulation
            await pool.query(
              `INSERT INTO master_formulation (formulation_code, formulation_name, sku, total_mass, total_ingredients, status)
               VALUES ($1, $2, $3, 0, 0, 'active')`,
              [formulation.code, formulation.name, formulation.code]
            );
            
            comparison.new_formulations++;
            comparison.changes.push({
              type: 'new',
              table: 'master_formulation',
              description: `Added new formulation ${code}`,
              new_value: formulation.name
            });
          }
        }
      }
      
      // Get all formulations and products for linking
      const { rows: formulations } = await pool.query('SELECT id, formulation_code FROM master_formulation');
      const { rows: products } = await pool.query('SELECT id, product_code FROM master_product WHERE product_category = $1', ['raw']);
      
      const formulationMap = new Map(formulations.map(f => [f.formulation_code, f.id]));
      const productMap = new Map(products.map(p => [p.product_code, p.id]));
      
      // Process formulation ingredients
      let successfulIngredients = 0;
      let failedIngredients = 0;
      
      for (const fi of formulationIngredients) {
        const formulationId = formulationMap.get(fi.formulationCode);
        const productId = productMap.get(fi.productCode);
        
        if (formulationId && productId) {
          try {
            await pool.query(
              `INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass)
               VALUES ($1, $2, $3)
               ON CONFLICT (formulation_id, product_id) DO UPDATE
               SET target_mass = EXCLUDED.target_mass, updated_at = CURRENT_TIMESTAMP`,
              [formulationId, productId, fi.targetMass]
            );
            successfulIngredients++;
          } catch (err) {
            console.error(`Error inserting ingredient for ${fi.formulationCode}: ${fi.productCode}:`, err.message);
            failedIngredients++;
          }
        } else {
          failedIngredients++;
        }
      }
      
      comparison.new_ingredients = successfulIngredients;
      
      // Update total_ingredients and total_mass for each formulation
      for (const [code, formulation] of formulationsMap) {
        const formulationId = formulationMap.get(code);
        if (formulationId) {
          // Count ingredients for this formulation
          const countResult = await pool.query(
            'SELECT COUNT(*) as count, COALESCE(SUM(target_mass), 0) as total FROM master_formulation_ingredients WHERE formulation_id = $1',
            [formulationId]
          );
          
          const ingredientCount = parseInt(countResult.rows[0].count) || 0;
          const totalMass = parseFloat(countResult.rows[0].total) || 0;
          
          // Update total_ingredients and total_mass
          await pool.query(
            'UPDATE master_formulation SET total_ingredients = $1, total_mass = $2 WHERE id = $3',
            [ingredientCount, totalMass, formulationId]
          );
          
          console.log(`✅ Updated formulation ${code}: total_ingredients = ${ingredientCount}, total_mass = ${totalMass}`);
        }
      }
      
      // Update import log
      await pool.query(
        `UPDATE import_logs 
         SET status = 'completed', total_records = $1, successful_records = $2, failed_records = $3, completed_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [csvData.length, successfulIngredients, failedIngredients, logId]
      );
      
      // Commit transaction
      await pool.query('COMMIT');
      
      // Clean up uploaded file
      fs.unlinkSync(filepath);
      
      console.log(`✅ Database import completed successfully`);
      console.log(`📊 Summary: ${comparison.new_products} new products, ${comparison.updated_products} updated products, ${comparison.new_formulations} new formulations, ${successfulIngredients} ingredients`);
      
      res.json({
        success: true,
        message: 'Database imported successfully',
        comparison: comparison,
        filename: filename
      });
      
    } catch (error) {
      // Rollback transaction
      await pool.query('ROLLBACK');
      
      console.error('❌ Database import failed:', error);
      
      // Update import log with error
      if (logId) {
        await pool.query(
          `UPDATE import_logs 
           SET status = 'failed', error_details = $1, completed_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [error.message, logId]
        );
      }
      
      // Clean up uploaded file
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Database import failed',
        details: error.message
      });
    }
  });
});

// Get import logs endpoint
app.get('/api/import-logs', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        import_type,
        source_type,
        source_name,
        total_records,
        successful_records,
        failed_records,
        error_details,
        status,
        started_at,
        completed_at,
        created_at
      FROM import_logs
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching import logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch import logs',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await pool.end();
  process.exit(0);
});

module.exports = app;

