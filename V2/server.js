const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Determine directories path (handle packaged executable)
let distDir;
let uploadsDir;

if (process.pkg) {
  // When packaged, __dirname points to executable location
  // dist and uploads folders are copied external to executable
  const exeDir = path.dirname(process.execPath);
  distDir = path.join(exeDir, 'dist');
  uploadsDir = path.join(exeDir, 'uploads');
  
  // Verify directories exist, if not try __dirname (fallback)
  if (!fs.existsSync(distDir)) {
    distDir = path.join(__dirname, 'dist');
  }
  if (!fs.existsSync(uploadsDir)) {
    uploadsDir = path.join(__dirname, 'uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } else {
    // Ensure uploads directory exists in release folder
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }
} else {
  // Normal development mode
  distDir = path.join(__dirname, 'dist');
  uploadsDir = path.join(__dirname, 'uploads');
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for large payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Error handler middleware for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ JSON parsing error:', err.message);
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      details: err.message
    });
  }
  next();
});

app.use(express.static(distDir));

// Database connection
// For standalone executable, default to localhost
// For Docker, use environment variable DB_HOST=postgres
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'FLB_MOWS',
  password: process.env.DB_PASSWORD || 'Admin123',
  port: process.env.DB_PORT || 5432,
});

// Test database connection and initialize if needed
let dbInitialized = false;

async function initializeDatabase() {
  if (dbInitialized) return true;
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL database');
    
    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('master_product', 'master_formulation', 'work_orders', 'import_logs')
    `);
    
    if (tablesCheck.rows[0].count < 4) {
      console.warn('⚠️  Database tables not found. Please run database setup:');
      console.warn('   1. Run setup-database.bat (Windows)');
      console.warn('   2. Or manually: psql -U postgres -d FLB_MOWS -f database/schema.sql');
      return false;
    }
    
    dbInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('   Please ensure:');
    console.error('   1. PostgreSQL is running');
    console.error('   2. Database FLB_MOWS exists');
    console.error('   3. Connection settings are correct');
    console.error('   Host:', process.env.DB_HOST || 'localhost');
    console.error('   Port:', process.env.DB_PORT || 5432);
    console.error('   Database:', process.env.DB_NAME || 'FLB_MOWS');
    return false;
  }
}

// Initialize database on startup
initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connection pool ready');
});

pool.on('error', (err) => {
  console.error('❌ Database connection pool error:', err);
  dbInitialized = false;
});

// API Routes
// =========================
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

// Fix module path resolution for packaged executable
// When packaged with pkg, __dirname points to executable location
// CRITICAL: This must run BEFORE any require of serialport or @serialport modules
if (process.pkg) {
  // For packaged executable, add node_modules path relative to executable
  const path = require('path');
  const fs = require('fs');
  const exeDir = path.dirname(process.execPath);
  const nodeModulesPath = path.join(exeDir, 'node_modules');
  
  // Add to module search path if node_modules exists
  if (fs.existsSync(nodeModulesPath)) {
    // Method 1: Add to module.paths (affects require resolution)
    const Module = require('module');
    
    // Add external node_modules to the front of module search paths
    const originalPaths = Module._nodeModulePaths;
    Module._nodeModulePaths = function(from) {
      const paths = originalPaths ? originalPaths.call(this, from) : [];
      // Insert external node_modules at the beginning (highest priority)
      if (fs.existsSync(nodeModulesPath)) {
        paths.unshift(nodeModulesPath);
      }
      return paths;
    };
    
    // Method 2: Override module resolution to FORCE external resolution for serialport
    const originalResolveFilename = Module._resolveFilename;
    Module._resolveFilename = function(request, parent, isMain, options) {
      const moduleName = request;
      
      // FORCE external resolution for serialport and @serialport packages
      // This prevents pkg from trying to load them from snapshot
      if (moduleName === 'serialport' || moduleName.startsWith('@serialport/')) {
        let modulePath;
        
        if (moduleName.startsWith('@')) {
          const [scope, name] = moduleName.split('/');
          modulePath = path.join(nodeModulesPath, scope, name);
        } else {
          modulePath = path.join(nodeModulesPath, moduleName);
        }
        
        // Check if external module exists FIRST
        if (fs.existsSync(modulePath)) {
          console.log(`[Module Resolution] Forcing external resolution for: ${moduleName} -> ${modulePath}`);
          try {
            // Try manual resolution first (more reliable for external modules)
            const packagePath = path.join(modulePath, 'package.json');
            if (fs.existsSync(packagePath)) {
              const pkgJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
              // Try different possible main files
              const possibleMains = [
                pkgJson.main,
                pkgJson.exports && pkgJson.exports['.'] && (pkgJson.exports['.'].require || pkgJson.exports['.'].default || pkgJson.exports['.']),
                'index.js',
                'dist/index.js',
                'lib/index.js'
              ].filter(Boolean);
              
              for (const mainFile of possibleMains) {
                if (mainFile) {
                  const mainPath = path.join(modulePath, mainFile);
                  if (fs.existsSync(mainPath)) {
                    const resolved = path.resolve(mainPath);
                    // Verify the file exists before returning
                    if (fs.existsSync(resolved)) {
                      console.log(`[Module Resolution] Resolved ${moduleName} to: ${resolved}`);
                      return resolved;
                    }
                  }
                }
              }
            }
            
            // If no package.json or main entry found, try common patterns
            const commonPaths = [
              path.join(modulePath, 'index.js'),
              path.join(modulePath, 'dist', 'index.js'),
              path.join(modulePath, 'lib', 'index.js')
            ];
            
            for (const tryPath of commonPaths) {
              if (fs.existsSync(tryPath)) {
                return path.resolve(tryPath);
              }
            }
            
            // Final fallback: return the module directory (Node will look for index.js)
            return path.resolve(modulePath);
          } catch (e) {
            // Log for debugging
            console.warn(`[Module Resolution] Error resolving ${moduleName} from external:`, e.message);
            // Continue to try original resolver as fallback
          }
        }
      }
      
      // For other modules, use original resolver
      // It will check module.paths which now includes our external node_modules
      try {
        return originalResolveFilename.call(this, request, parent, isMain, options);
      } catch (err) {
        // If module not found in standard paths, try node_modules relative to executable
        let modulePath;
        
        if (moduleName.startsWith('@')) {
          const [scope, name] = moduleName.split('/');
          modulePath = path.join(nodeModulesPath, scope, name);
        } else {
          modulePath = path.join(nodeModulesPath, moduleName);
        }
        
        if (fs.existsSync(modulePath)) {
          try {
            return originalResolveFilename.call(this, path.resolve(modulePath), parent, isMain, options);
          } catch (e) {
            throw err;
          }
        }
        throw err;
      }
    };
    
    console.log(`[Module Resolution] External node_modules path added: ${nodeModulesPath}`);
  } else {
    console.warn(`[Module Resolution] External node_modules not found at: ${nodeModulesPath}`);
  }
}

try {
  SerialPortLib = require('serialport');
} catch (err) {
  console.warn('⚠️  serialport module not installed. Scale integration disabled.');
  console.warn('   Error:', err.message);
  // If packaged and serialport not found, try direct path
  if (process.pkg) {
    try {
      const path = require('path');
      const fs = require('fs');
      const exeDir = path.dirname(process.execPath);
      const serialportPath = path.join(exeDir, 'node_modules', 'serialport');
      
      // Check if serialport exists
      if (fs.existsSync(serialportPath)) {
        // Try to load package.json to find main entry
        const packagePath = path.join(serialportPath, 'package.json');
        if (fs.existsSync(packagePath)) {
          const pkg = require(packagePath);
          const mainFile = pkg.main || 'index.js';
          const mainPath = path.join(serialportPath, mainFile);
          if (fs.existsSync(mainPath)) {
            SerialPortLib = require(mainPath);
            console.log('✅ Found serialport in executable directory');
          } else {
            // Fallback: try require the directory itself
            SerialPortLib = require(serialportPath);
            console.log('✅ Found serialport in executable directory (fallback)');
          }
        } else {
          SerialPortLib = require(serialportPath);
          console.log('✅ Found serialport in executable directory');
        }
      }
    } catch (e) {
      console.warn('   Serialport not found in executable directory either');
      console.warn('   Details:', e.message);
    }
  }
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
  console.log('📥 Received GET request to /api/scale/read');
  
  if (!SerialPortLib) {
    console.error('❌ SerialPortLib is not available');
    return res.status(501).json({ success: false, error: 'Serialport module not available' });
  }
  
  // Validate port configuration
  if (!scaleConfig.port) {
    console.error('❌ Scale port not configured');
    return res.status(400).json({ success: false, error: 'Scale port not configured. Please set the port in Settings.' });
  }
  
  // Throttle requests to prevent too many concurrent opens
  const now = Date.now();
  if (now - lastReadTime < MIN_READ_INTERVAL) {
    return res.status(429).json({ 
      success: false, 
      error: 'Too many requests. Please wait before reading again.' 
    });
  }
  
  lastReadTime = now;
  
  try {
    const { SerialPort } = SerialPortLib;
    const normalizedPort = normalizePort(scaleConfig.port);
    
    console.log(`🔌 Reading scale from port: ${scaleConfig.port} (normalized: ${normalizedPort})`);
    
    // Check if we can reuse existing port (keep port open for persistent connection)
    let port = activePort;
    let shouldReusePort = false;
    
    if (port && port.path === normalizedPort && port.isOpen) {
      console.log('✅ Reusing existing open port');
      shouldReusePort = true;
      // Remove old listeners to avoid conflicts
      port.removeAllListeners('data');
      port.removeAllListeners('error');
      // Send poll command to trigger data (adapted from Hardware implementation)
      try {
        port.write('\r');
        port.write('P\r');
      } catch (writeErr) {
        console.warn('⚠️  Failed to write poll command:', writeErr.message);
      }
    } else {
      // Only close existing port if it's for a different port
      if (activePort && activePort.isOpen && activePort.path !== normalizedPort) {
        console.log('🔄 Closing existing port (different port requested)');
        try {
          await new Promise((resolve) => {
            activePort.close(() => resolve());
          });
        } catch (_) {}
        activePort = null;
        port = null;
      } else if (activePort && !activePort.isOpen) {
        // Port was closed, reset reference
        console.log('🔄 Existing port was closed, will open new one');
        activePort = null;
        port = null;
      }
    }
    
    let rawBuffer = ''; // Buffer for incomplete data (adapted from Hardware)
    const chunks = [];
    let resolved = false;
    let timeoutId = null;
    
    const cleanup = () => {
      try {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Keep port open for persistent connection (adapted from Hardware implementation)
        // Only remove listeners, don't close the port
        // Port will be reused for next request or closed on explicit disconnect
        if (port) {
          port.removeAllListeners('data');
          port.removeAllListeners('error');
          console.log('🧹 Cleanup: removed event listeners (port kept open for reuse)');
        }
      } catch (err) {
        console.error('Error in cleanup:', err);
      }
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
    
    
    // Smart parser adapted from Hardware/src/server.js
    const parseWeightSmart = (raw) => {
      // Vibra format: "+000085.9 G S" (sign)(6 digits).(1 digit) space UNIT space STATUS
      const vibra = raw.match(/^\s*([+\-]?)\s*(\d{6}\.\d)\s+([GKgk])\s+([SsIi])/);
      if (vibra) {
        const sign = vibra[1] === '-' ? -1 : 1;
        const value = parseFloat(vibra[2]);
        const unit = vibra[3].toUpperCase();
        let kg = value * sign;
        if (unit === 'G') kg = kg / 1000;
        const status = vibra[4].toUpperCase();
        return { weight: kg, unit: 'kg', originalUnit: unit, stable: status === 'S' };
      }
      
      // Fallback: try standard parseVibraData
      const parsed = parseVibraData(raw);
      if (parsed) return parsed;
      
      // Fallback: signed decimal with optional unit
      const mDec = raw.match(/([+\-]?\d+\.\d+)\s*([gkGKgK])?/);
      if (mDec && mDec[1]) {
        const val = parseFloat(mDec[1]);
        const unit = (mDec[2] || 'K').toUpperCase();
        const weight = unit === 'G' ? val / 1000 : val;
        return { weight, unit: 'kg', originalUnit: unit, stable: true };
      }
      
      return null;
    };
    
    const dataHandler = (chunk) => {
      if (resolved) return;
      
      // Process data chunks (adapted from Hardware implementation)
      const str = chunk.toString('ascii');
      console.log(`📊 Received data chunk: "${str}"`);
      
      rawBuffer += str;
      chunks.push(str);
      
      // Process complete lines (adapted from Hardware)
      const parts = rawBuffer.split(/\r?\n/);
      rawBuffer = parts.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const parsed = parseWeightSmart(trimmed);
        if (parsed) {
          console.log(`✅ Parsed weight: ${parsed.weight} ${parsed.unit}, stable: ${parsed.stable}`);
          finalize(true, parsed);
          return;
        }
      }
      
      // If buffer getting too long, try parsing accumulated buffer
      if (rawBuffer.length > 50) {
        const fullBuffer = chunks.join('');
        const parsed = parseWeightSmart(fullBuffer);
        if (parsed) {
          console.log(`✅ Parsed weight from buffer: ${parsed.weight} ${parsed.unit}`);
          finalize(true, parsed);
          return;
        }
        // Buffer too long, might be corrupted
        console.warn(`⚠️  Invalid data format, buffer length: ${rawBuffer.length}`);
        finalize(false, { error: 'Invalid data format', raw: rawBuffer.slice(0, 100) });
      }
    };
    
    // If reusing port, add handler immediately; otherwise wait for port to open
    if (shouldReusePort) {
      port.on('data', dataHandler);
    }
    
    const errorHandler = (err) => {
      if (resolved) return;
      console.error('❌ Port error:', err.message);
      if (err.message && err.message.includes('cannot open')) {
        finalize(false, { error: `Port ${scaleConfig.port} is busy or not available. Close other applications using this port.` });
      } else {
        finalize(false, { error: err.message || 'Port error' });
      }
    };
    
    // If reusing port, check if data is already available or setup error handler
    if (shouldReusePort) {
      port.on('error', errorHandler);
      // Port is already open, data handler is set, we can wait for data
      console.log('⏳ Waiting for data from existing port...');
    } else {
      // Create new port
      port = new SerialPort({
        path: normalizedPort,
        baudRate: scaleConfig.baudRate,
        dataBits: scaleConfig.dataBits,
        parity: scaleConfig.parity,
        stopBits: scaleConfig.stopBits,
        autoOpen: false,
        rtscts: false,
        xon: false,
        xoff: false,
        xany: false
      });
      
      activePort = port;
      
      port.on('data', dataHandler);
      port.on('error', errorHandler);
      
      port.open((err) => {
        if (resolved) return;
        
        if (err) {
          console.error('❌ Failed to open port:', err.message);
          finalize(false, { 
            error: err.message && err.message.includes('cannot open')
              ? `Port ${scaleConfig.port} is busy or not available. Close other applications using this port.`
              : `Failed to open port: ${err.message}`
          });
          return;
        }
        
        console.log('✅ Port opened successfully');
        
        // Assert DTR/RTS after opening (adapted from Hardware)
        try {
          port.set({ dtr: true, rts: true });
          console.log('✅ DTR/RTS set successfully');
        } catch (setErr) {
          console.warn('⚠️  Failed to set DTR/RTS:', setErr.message);
        }
        
        // Send poll/query commands to trigger data (adapted from Hardware)
        try {
          port.write('\r');
          port.write('P\r');
          port.write('Q\r');
        } catch (writeErr) {
          console.warn('⚠️  Failed to write trigger commands:', writeErr.message);
        }
      });
    }
    
    // Set timeout (will be cleared in cleanup if response sent earlier)
    timeoutId = setTimeout(() => {
      if (!resolved) {
        console.warn(`⏱️  Timeout after ${scaleConfig.timeoutMs}ms - no data received`);
        finalize(false, { error: `Timeout: No data received from scale after ${scaleConfig.timeoutMs}ms` });
      }
    }, scaleConfig.timeoutMs);
  } catch (error) {
    console.error('❌ Unexpected error in /api/scale/read:', error);
    console.error('Error stack:', error.stack);
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

// Get formulation ingredients endpoint (unified - used by both UI and weighing)
app.get('/api/formulations/:id/ingredients', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if there are any ingredients at all
    const countQuery = await pool.query(
      'SELECT COUNT(*) as count FROM master_formulation_ingredients WHERE formulation_id = $1',
      [id]
    );
    const totalIngredients = parseInt(countQuery.rows[0].count) || 0;
    
    console.log(`📋 Fetching ingredients for formulation ${id}, total ingredients in DB: ${totalIngredients}`);
    
    const query = `
      SELECT 
        mfi.id,
        mfi.product_id,
        mfi.target_mass,
        mfi.created_at,
        mfi.updated_at,
        mp.product_code as ingredient_code,
        mp.product_code,
        mp.product_name as ingredient_name,
        mp.product_name,
        mp.product_category as category,
        mp.product_category,
        mp.type_tolerance,
        mp.status as product_status,
        mtg.name as tolerance_grouping_name,
        mtg.code as tolerance_grouping_code
      FROM master_formulation_ingredients mfi
      LEFT JOIN master_product mp ON mfi.product_id = mp.id
      LEFT JOIN master_tolerance_grouping mtg ON mp.tolerance_grouping_id = mtg.id
      WHERE mfi.formulation_id = $1
      ORDER BY mfi.target_mass DESC
    `;
    
    const result = await pool.query(query, [id]);
    
    console.log(`✅ Found ${result.rows.length} ingredients with product data`);
    
    // Log ingredients that don't have matching products
    const missingProducts = result.rows.filter(row => !row.ingredient_code);
    if (missingProducts.length > 0) {
      console.warn(`⚠️  ${missingProducts.length} ingredients have missing product references:`);
      missingProducts.forEach(row => {
        console.warn(`   - Ingredient ID: ${row.id}, Product ID: ${row.product_id}`);
      });
    }
    
    // Log sample data for debugging
    if (result.rows.length > 0) {
      console.log('📋 Sample ingredient data:', JSON.stringify(result.rows[0], null, 2));
    }
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      totalInDB: totalIngredients,
      missingProducts: missingProducts.length
    });
  } catch (error) {
    console.error('Error fetching formulation ingredients:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formulation ingredients',
      details: error.message
    });
  }
});

// Save weighing progress endpoint
app.post('/api/weighing/save-progress', async (req, res) => {
  console.log(`📥 Received POST request to /api/weighing/save-progress`);
  console.log(`   Body keys:`, Object.keys(req.body || {}));
  
  // Ensure we always send a response, even on error
  let transactionStarted = false;
  
  try {
    // Check database connection first
    if (!pool) {
      console.error('❌ Database pool is not initialized');
      return res.status(500).json({ 
        success: false, 
        error: 'Database connection pool is not initialized'
      });
    }
    
    // Ensure database is initialized
    let dbReady = false;
    try {
      dbReady = await initializeDatabase();
    } catch (dbError) {
      console.error('❌ Database initialization error:', dbError);
      return res.status(503).json({ 
        success: false, 
        error: 'Database initialization failed',
        details: dbError.message
      });
    }
    
    if (!dbReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not initialized',
        message: 'Please run setup-database.bat to initialize the database'
      });
    }
    
    const { moNumber, formulationId, ingredients, progress } = req.body;
    
    // Validate required fields
    if (!moNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: moNumber'
      });
    }
    
    if (!formulationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: formulationId'
      });
    }
    
    // Validate ingredients
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid ingredients array'
      });
    }
    
    console.log(`💾 Saving weighing progress for MO: ${moNumber}, Formulation: ${formulationId}`);
    console.log(`   Ingredients count: ${ingredients.length}`);
    
    // Start transaction
    try {
      await pool.query('BEGIN');
      transactionStarted = true;
    } catch (beginError) {
      console.error('❌ Error starting transaction:', beginError);
      return res.status(500).json({
        success: false,
        error: 'Failed to start database transaction',
        details: beginError.message
      });
    }
    
    // Get a default user for created_by (required field)
    let createdBy = null;
    try {
      const userResult = await pool.query('SELECT id FROM master_user ORDER BY created_at ASC LIMIT 1');
      if (userResult.rows.length > 0) {
        createdBy = userResult.rows[0].id;
      } else {
        throw new Error('No users found in master_user table. Please create a user first.');
      }
    } catch (userError) {
      console.error('❌ Error getting user for work order:', userError.message);
      throw new Error(`Cannot create work order: ${userError.message}. Please ensure at least one user exists in master_user table.`);
    }
    
    if (!createdBy) {
      throw new Error('Cannot proceed: created_by is required for work_orders table');
    }
    
    // Create or update work order
    const workOrderQuery = `
      INSERT INTO work_orders (work_order_number, formulation_id, planned_quantity, status, created_by, created_at)
      VALUES ($1, $2, $3, 'in_progress', $4, CURRENT_TIMESTAMP)
      ON CONFLICT (work_order_number) 
      DO UPDATE SET 
        status = 'in_progress',
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    const workOrderResult = await pool.query(workOrderQuery, [
      moNumber, 
      formulationId, 
      progress?.totalQuantity || 1,
      createdBy
    ]);
    
    const workOrderId = workOrderResult.rows[0].id;
    
    // Save weighing progress for each ingredient
    for (const ingredient of ingredients) {
      // Validate ingredient has required fields
      if (!ingredient.id) {
        console.warn(`⚠️  Skipping ingredient without ID:`, ingredient);
        continue;
      }
      const progressQuery = `
        INSERT INTO weighing_progress (
          work_order_id, 
          ingredient_id, 
          target_mass, 
          actual_mass, 
          status,
          tolerance_min,
          tolerance_max,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (work_order_id, ingredient_id)
        DO UPDATE SET 
          actual_mass = $4,
          status = $5,
          tolerance_min = COALESCE($6, weighing_progress.tolerance_min),
          tolerance_max = COALESCE($7, weighing_progress.tolerance_max),
          updated_at = CURRENT_TIMESTAMP,
          -- Set completed_at if status is completed
          completed_at = CASE 
            WHEN $5 = 'completed' THEN COALESCE(weighing_progress.completed_at, CURRENT_TIMESTAMP)
            ELSE weighing_progress.completed_at
          END
      `;
      
      // Calculate tolerance range (default ±3g)
      const targetMass = parseFloat(ingredient.targetWeight || ingredient.target_mass || 0);
      const tolerance = 3; // Default tolerance in grams
      const toleranceMin = targetMass - tolerance;
      const toleranceMax = targetMass + tolerance;
      
      try {
        // Get existing actual_mass to accumulate (if exists)
        const existingCheck = await pool.query(
          'SELECT actual_mass FROM weighing_progress WHERE work_order_id = $1 AND ingredient_id = $2',
          [workOrderId, ingredient.id]
        );
        
        const existingMass = existingCheck.rows.length > 0 
          ? parseFloat(existingCheck.rows[0].actual_mass || 0) 
          : 0;
        
        const newMass = parseFloat(ingredient.currentWeight || ingredient.actualWeight || 0);
        const accumulatedMass = existingMass + newMass; // Accumulate with previous weight
        
        // Auto-complete logic: if accumulated weight >= target weight, set status to 'completed'
        let ingredientStatus = ingredient.status || 'pending';
        if (accumulatedMass >= targetMass && ingredientStatus !== 'completed') {
          ingredientStatus = 'completed';
          console.log(`✅ Ingredient ${ingredient.id} auto-completed: ${accumulatedMass}g >= ${targetMass}g (target)`);
        } else if (accumulatedMass > 0 && ingredientStatus === 'pending') {
          // If has weight but not completed, set to 'weighing'
          ingredientStatus = 'weighing';
        }
        
        console.log(`📊 Ingredient ${ingredient.id}: existing=${existingMass}g, new=${newMass}g, accumulated=${accumulatedMass}g, status=${ingredientStatus}`);
        
        await pool.query(progressQuery, [
          workOrderId,
          ingredient.id, // should be UUID of master_formulation_ingredients.id
          targetMass,
          accumulatedMass, // Use accumulated weight
          ingredientStatus, // Use auto-determined status
          toleranceMin, // tolerance_min
          toleranceMax  // tolerance_max
        ]);
        
        // Create weighing session record for tracking
        try {
          // Get session number (count existing sessions for this ingredient + 1)
          const sessionCountResult = await pool.query(
            'SELECT COUNT(*) as count FROM weighing_sessions WHERE work_order_id = $1 AND ingredient_id = $2',
            [workOrderId, ingredient.id]
          );
          const sessionNumber = parseInt(sessionCountResult.rows[0].count) + 1;
          
          // Get current user (if available from request)
          let weighedByUserId = null;
          try {
            const userResult = await pool.query('SELECT id FROM master_user LIMIT 1');
            if (userResult.rows.length > 0) {
              weighedByUserId = userResult.rows[0].id;
            }
          } catch (e) {
            // Ignore if user not found
          }
          
          const sessionQuery = `
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
              session_completed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
          `;
          
          await pool.query(sessionQuery, [
            workOrderId,
            sessionNumber,
            ingredient.id,
            targetMass,
            newMass, // Actual mass for this session (new reading)
            accumulatedMass, // Total accumulated mass
            ingredientStatus,
            toleranceMin,
            toleranceMax,
            weighedByUserId
          ]);
          
          console.log(`📝 Created weighing session #${sessionNumber} for ingredient ${ingredient.id}`);
        } catch (sessionError) {
          console.warn(`⚠️  Could not create weighing session:`, sessionError.message);
          // Continue even if session creation fails
        }
      } catch (ingredientError) {
        console.error(`❌ Error saving ingredient ${ingredient.id}:`, ingredientError.message);
        // Continue with other ingredients even if one fails
      }
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
    console.log(`✅ Weighing progress saved successfully for MO: ${moNumber}, Work Order ID: ${workOrderId}`);
    
    res.json({
      success: true,
      message: 'Weighing progress saved successfully',
      workOrderId: workOrderId
    });
  } catch (error) {
    // Rollback transaction if it was started
    if (transactionStarted) {
      try {
        await pool.query('ROLLBACK');
        console.log('✅ Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Error during rollback:', rollbackError);
      }
    }
    
    console.error('❌ Error saving weighing progress:', error);
    console.error('Error stack:', error.stack);
    
    // Ensure we send a response even if there's an error
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to save weighing progress',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      console.error('⚠️  Response already sent, cannot send error response');
    }
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

// Production history list with detailed weighing information
app.get('/api/history', async (req, res) => {
  try {
    // Check database connection first
    if (!pool) {
      throw new Error('Database connection pool is not initialized');
    }
    
    // Ensure database is initialized
    const dbReady = await initializeDatabase();
    if (!dbReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not initialized',
        message: 'Please run setup-database.bat to initialize the database'
      });
    }
    
    // Debug: Check if work_orders table exists and has data
    try {
      const countResult = await pool.query('SELECT COUNT(*) as count FROM work_orders');
      console.log(`📊 Total work orders in database: ${countResult.rows[0].count}`);
    } catch (countError) {
      console.error('❌ Error counting work orders:', countError.message);
    }
    
    // Fetch work orders with formulation details
    const woQuery = `
      SELECT 
        wo.id,
        wo.work_order_number as work_order,
        wo.formulation_id,
        COALESCE(mf.formulation_name, 'Unknown') as formulation_name,
        COALESCE(mf.formulation_code, '') as sku,
        wo.planned_quantity,
        wo.status,
        wo.created_at as production_date,
        wo.completed_at as end_time,
        COALESCE(mu.username, mu.name, 'Unknown') as operator_name,
        mu.name as operator_full_name
      FROM work_orders wo
      LEFT JOIN master_formulation mf ON wo.formulation_id = mf.id
      LEFT JOIN master_user mu ON wo.created_by = mu.id
      ORDER BY wo.created_at DESC
      LIMIT 200
    `;
    
    console.log('📋 Fetching work orders...');
    const woResult = await pool.query(woQuery);
    console.log(`✅ Found ${woResult.rows.length} work orders`);
    
    if (woResult.rows.length === 0) {
      console.log('⚠️  No work orders found in database');
      console.log('   This is normal if no weighing progress has been saved yet.');
      return res.json({ success: true, data: [] });
    }
    
    // For each work order, fetch detailed weighing progress with ingredients
    const historiesWithDetails = await Promise.all(woResult.rows.map(async (wo) => {
      try {
        // Fetch weighing progress for this work order
        const ingredientsQuery = `
          SELECT 
            wp.id as weighing_id,
            wp.ingredient_id,
            mp.product_code,
            mp.product_name as ingredient_name,
            wp.target_mass,
            wp.actual_mass as weighing_result,
            wp.status as weighing_status,
            wp.updated_at as weighing_time,
            wp.completed_at as completed_time,
            wp.created_at as started_time,
            wp.tolerance_min,
            wp.tolerance_max,
            wp.notes
          FROM weighing_progress wp
          JOIN master_formulation_ingredients mfi ON wp.ingredient_id = mfi.id
          JOIN master_product mp ON mfi.product_id = mp.id
          WHERE wp.work_order_id = $1
          ORDER BY wp.updated_at DESC, wp.created_at DESC
        `;
        
        let ingredientsResult;
        try {
          ingredientsResult = await pool.query(ingredientsQuery, [wo.id]);
          console.log(`   📦 Work order ${wo.work_order}: Found ${ingredientsResult.rows.length} ingredients with weighing progress`);
        } catch (ingQueryError) {
          console.warn(`⚠️  Error fetching ingredients for work order ${wo.work_order} (${wo.id}):`, ingQueryError.message);
          console.warn(`   Error details:`, ingQueryError);
          // Continue with empty ingredients array if query fails
          ingredientsResult = { rows: [] };
        }
        
        // Group by save events - each save creates a weighing record
        // Use updated_at as the weighing time (when it was saved)
        const weighingDetails = (ingredientsResult.rows || []).map(ing => ({
          ingredient_id: ing.ingredient_id,
          ingredient_code: ing.product_code || '',
          ingredient_name: ing.ingredient_name || 'Unknown',
          target_mass: parseFloat(ing.target_mass || 0) || 0,
          weighing_result: parseFloat(ing.weighing_result || 0) || 0,
          weighing_time: ing.weighing_time || ing.completed_time || ing.started_time || null,
          status: ing.weighing_status || 'pending',
          tolerance_min: parseFloat(ing.tolerance_min || 0) || 0,
          tolerance_max: parseFloat(ing.tolerance_max || 0) || 0,
          notes: ing.notes || null
        }));
        
        return {
          id: wo.id,
          work_order: wo.work_order || 'Unknown',
          production_date: wo.production_date || wo.created_at,
          formulation_name: wo.formulation_name || 'Unknown',
          sku: wo.sku || '',
          planned_quantity: parseFloat(wo.planned_quantity || 0) || 0,
          status: wo.status || 'in_progress',
          operator: wo.operator_name || wo.operator_full_name || 'Unknown',
          end_time: wo.end_time || null,
          ingredients: weighingDetails
        };
      } catch (woError) {
        console.error(`❌ Error processing work order ${wo.work_order || wo.id}:`, woError.message);
        // Return a minimal work order entry even if details fail
        return {
          id: wo.id,
          work_order: wo.work_order || 'Unknown',
          production_date: wo.production_date || wo.created_at,
          formulation_name: wo.formulation_name || 'Unknown',
          sku: wo.sku || '',
          planned_quantity: parseFloat(wo.planned_quantity || 0) || 0,
          status: wo.status || 'in_progress',
          operator: wo.operator_name || wo.operator_full_name || 'Unknown',
          end_time: wo.end_time || null,
          ingredients: []
        };
      }
    }));
    
    console.log(`📊 Fetched ${historiesWithDetails.length} work orders with weighing details`);
    
    // Filter out any null entries (in case of errors)
    const validHistories = historiesWithDetails.filter(h => h !== null && h !== undefined);
    
    // Log summary for debugging
    console.log(`📋 History summary: ${validHistories.length} work orders returned`);
    if (validHistories.length > 0) {
      const withIngredients = validHistories.filter(h => h.ingredients && h.ingredients.length > 0).length;
      console.log(`   - ${withIngredients} with ingredients data`);
      console.log(`   - ${validHistories.length - withIngredients} without ingredients data`);
    }
    
    res.json({ success: true, data: validHistories });
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch history';
    if (error.code === '42P01') {
      errorMessage = 'Database table not found. Please run setup-database.bat';
    } else if (error.code === '23503') {
      errorMessage = 'Database foreign key constraint error';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage, 
      details: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Production history detail with weighing sessions
app.get('/api/history/:mo', async (req, res) => {
  try {
    const { mo } = req.params;
    
    if (!pool) {
      throw new Error('Database connection pool is not initialized');
    }
    
    const dbReady = await initializeDatabase();
    if (!dbReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not initialized'
      });
    }
    
    // Fetch work order details
    const woQuery = `
      SELECT 
        wo.id,
        wo.work_order_number as work_order,
        wo.formulation_id,
        wo.planned_quantity,
        wo.status,
        wo.created_at as production_date,
        wo.completed_at as end_time,
        COALESCE(mf.formulation_name, 'Unknown') as formulation_name,
        COALESCE(mf.formulation_code, '') as sku,
        COALESCE(mu.username, mu.name, 'Unknown') as operator_name,
        mu.name as operator_full_name
      FROM work_orders wo
      LEFT JOIN master_formulation mf ON wo.formulation_id = mf.id
      LEFT JOIN master_user mu ON wo.created_by = mu.id
      WHERE wo.work_order_number = $1
    `;
    
    const woResult = await pool.query(woQuery, [mo]);
    
    if (woResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Work order not found'
      });
    }
    
    const wo = woResult.rows[0];
    
    // Fetch all weighing sessions grouped by ingredient
    const sessionsQuery = `
      SELECT 
        ws.id as session_id,
        ws.session_number,
        ws.ingredient_id,
        mp.product_code,
        mp.product_name as ingredient_name,
        ws.target_mass,
        ws.actual_mass,
        ws.accumulated_mass,
        ws.status as session_status,
        ws.tolerance_min,
        ws.tolerance_max,
        ws.session_started_at,
        ws.session_completed_at,
        ws.notes,
        COALESCE(wp.actual_mass, 0) as current_accumulated_mass,
        COALESCE(wp.status, 'pending') as current_status
      FROM weighing_sessions ws
      JOIN master_formulation_ingredients mfi ON ws.ingredient_id = mfi.id
      JOIN master_product mp ON mfi.product_id = mp.id
      LEFT JOIN weighing_progress wp ON wp.work_order_id = ws.work_order_id AND wp.ingredient_id = ws.ingredient_id
      WHERE ws.work_order_id = $1
      ORDER BY ws.ingredient_id, ws.session_number ASC
    `;
    
    const sessionsResult = await pool.query(sessionsQuery, [wo.id]);
    
    // Group sessions by ingredient
    const ingredientsMap = new Map();
    
    sessionsResult.rows.forEach(session => {
      const ingId = session.ingredient_id;
      if (!ingredientsMap.has(ingId)) {
        ingredientsMap.set(ingId, {
          ingredient_id: ingId,
          ingredient_code: session.product_code,
          ingredient_name: session.ingredient_name,
          target_mass: parseFloat(session.target_mass || 0),
          current_accumulated_mass: parseFloat(session.current_accumulated_mass || 0),
          current_status: session.current_status,
          sessions: []
        });
      }
      
      const ingredient = ingredientsMap.get(ingId);
      ingredient.sessions.push({
        session_id: session.session_id,
        session_number: session.session_number,
        actual_mass: parseFloat(session.actual_mass || 0),
        accumulated_mass: parseFloat(session.accumulated_mass || 0),
        status: session.session_status,
        tolerance_min: parseFloat(session.tolerance_min || 0),
        tolerance_max: parseFloat(session.tolerance_max || 0),
        session_started_at: session.session_started_at,
        session_completed_at: session.session_completed_at,
        notes: session.notes
      });
    });
    
    const ingredients = Array.from(ingredientsMap.values());
    
    res.json({
      success: true,
      data: {
        workOrder: wo,
        ingredients: ingredients
      }
    });
  } catch (error) {
    console.error('Error fetching history detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history detail',
      details: error.message
    });
  }
});

// Work order details and progress
app.get('/api/work-orders/:mo', async (req, res) => {
  try {
    const { mo } = req.params;
    const woResult = await pool.query(
      `SELECT 
         wo.id, 
         wo.work_order_number, 
         wo.formulation_id, 
         wo.planned_quantity, 
         wo.status, 
         wo.created_at, 
         wo.completed_at,
         mf.formulation_code,
         mf.formulation_name
       FROM work_orders wo
       LEFT JOIN master_formulation mf ON wo.formulation_id = mf.id
       WHERE wo.work_order_number = $1`,
      [mo]
    );
    if (woResult.rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    const wo = woResult.rows[0];
    // Ensure formulation_code and formulation_name are included
    if (!wo.formulation_name && wo.formulation_id) {
      // Fallback: fetch formulation name if missing
      try {
        const formResult = await pool.query(
          'SELECT formulation_code, formulation_name FROM master_formulation WHERE id = $1',
          [wo.formulation_id]
        );
        if (formResult.rows.length > 0) {
          wo.formulation_code = wo.formulation_code || formResult.rows[0].formulation_code;
          wo.formulation_name = wo.formulation_name || formResult.rows[0].formulation_name;
        }
      } catch (e) {
        console.warn('Could not fetch formulation details:', e.message);
      }
    }
    const ingResult = await pool.query(
      `SELECT 
         mfi.id as ingredient_id,
         mfi.target_mass,
         mp.product_code,
         mp.product_name,
         mp.product_category,
         mp.type_tolerance,
         COALESCE(wp.actual_mass, 0) as actual_mass,
         COALESCE(wp.status, 'pending') as status,
         wp.tolerance_min,
         wp.tolerance_max,
         wp.created_at as weighing_started_at,
         wp.updated_at as weighing_updated_at,
         wp.completed_at as weighing_completed_at,
         wp.notes as weighing_notes,
         -- Calculate progress percentage
         CASE 
           WHEN mfi.target_mass > 0 THEN 
             ROUND((COALESCE(wp.actual_mass, 0) / mfi.target_mass) * 100, 2)
           ELSE 0
         END as progress_percentage,
         -- Calculate remaining weight
         GREATEST(0, mfi.target_mass - COALESCE(wp.actual_mass, 0)) as remaining_weight,
         -- Check if within tolerance (if tolerance is set)
         CASE
           WHEN wp.tolerance_min IS NOT NULL AND wp.tolerance_max IS NOT NULL THEN
             (COALESCE(wp.actual_mass, 0) >= wp.tolerance_min AND COALESCE(wp.actual_mass, 0) <= wp.tolerance_max)
           ELSE NULL
         END as is_within_tolerance
       FROM master_formulation_ingredients mfi
       JOIN master_product mp ON mfi.product_id = mp.id
       LEFT JOIN weighing_progress wp ON wp.work_order_id = $1 AND wp.ingredient_id = mfi.id
       WHERE mfi.formulation_id = $2
       ORDER BY mfi.target_mass DESC`,
      [wo.id, wo.formulation_id]
    );
    
    console.log(`📊 Loaded work order ${mo} with ${ingResult.rows.length} ingredients`);
    ingResult.rows.forEach(ing => {
      console.log(`   - ${ing.product_name}: ${ing.actual_mass}g / ${ing.target_mass}g (${ing.progress_percentage}%), Status: ${ing.status}`);
    });
    
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
  try {
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const multer = require('multer');
    const upload = multer({ dest: uploadsDir + path.sep });
    
    upload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(400).json({
          success: false,
          error: 'File upload failed',
          details: err.message,
          uploadsDir: uploadsDir
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const csv = require('csv-parser');

      const fullRefresh = req.body.fullRefresh === 'true';
      let logId = null; // Declare logId outside try block for error handling

      try {
        // Check database connection first
        if (!pool) {
          throw new Error('Database connection pool is not initialized');
        }
        
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
      console.error('Error stack:', error.stack);
      
      // Clean up uploaded file
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      
      return res.status(500).json({
        success: false,
        error: 'Preview failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
  } catch (error) {
    console.error('❌ Preview endpoint error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Preview endpoint failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Import database endpoint
app.post('/api/import-database', async (req, res) => {
  try {
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Check database connection first
    if (!pool) {
      throw new Error('Database connection pool is not initialized');
    }
    
    // Ensure database is initialized
    const dbReady = await initializeDatabase();
    if (!dbReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not initialized',
        message: 'Please run setup-database.bat to initialize the database'
      });
    }
    
    const multer = require('multer');
    const upload = multer({ dest: uploadsDir + path.sep });
    
    upload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(400).json({
          success: false,
          error: 'File upload failed',
          details: err.message,
          uploadsDir: uploadsDir
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const csv = require('csv-parser');

      const fullRefresh = req.body.fullRefresh === 'true';
      let logId = null; // Declare logId outside try block for error handling

      try {
        const filename = req.file.originalname;
        const filepath = req.file.path;
        
        console.log(`🔄 Starting database import from: ${filename}`);
        console.log(`🔄 Full Refresh Mode: ${fullRefresh ? 'ENABLED' : 'DISABLED'}`);
        
        // Start transaction
        try {
          await pool.query('BEGIN');
          console.log('✅ Transaction started');
        } catch (beginError) {
          console.error('❌ Failed to start transaction:', beginError.message);
          throw new Error(`Failed to start database transaction: ${beginError.message}`);
        }

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
       // Get a default user (required field - NOT NULL constraint)
       let importedBy = null;
       try {
         const userResult = await pool.query('SELECT id FROM master_user ORDER BY created_at ASC LIMIT 1');
         if (userResult.rows.length > 0) {
           importedBy = userResult.rows[0].id;
           console.log(`📝 Using user ID for import log: ${importedBy}`);
         } else {
           throw new Error('No users found in master_user table. Please create a user first.');
         }
       } catch (userError) {
         console.error('❌ Error getting user for import log:', userError.message);
         throw new Error(`Cannot create import log: ${userError.message}. Please ensure at least one user exists in master_user table.`);
       }
       
       if (!importedBy) {
         throw new Error('Cannot proceed: imported_by is required for import_logs table');
       }
       
       const logResult = await pool.query(
         `INSERT INTO import_logs (import_type, source_type, source_name, status, imported_by, started_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          RETURNING id`,
         ['master_formulation', 'file', filename, 'in_progress', importedBy]
       );
       
       logId = logResult.rows[0].id;
       console.log(`📝 Created import log entry: ${logId}`);
      
      // Read and parse CSV
      const csvData = [];
      try {
        await new Promise((resolve, reject) => {
          fs.createReadStream(filepath)
            .pipe(csv())
            .on('data', (row) => {
              try {
                csvData.push(row);
              } catch (parseError) {
                console.warn('⚠️  Error parsing CSV row:', parseError.message);
                // Continue with other rows
              }
            })
            .on('end', resolve)
            .on('error', (streamError) => {
              console.error('❌ CSV stream error:', streamError);
              reject(streamError);
            });
        });
        
        console.log(`📊 Parsed ${csvData.length} records from CSV`);
        
        if (csvData.length === 0) {
          throw new Error('CSV file is empty or contains no valid data');
        }
      } catch (csvError) {
        console.error('❌ Error reading/parsing CSV file:', csvError);
        throw new Error(`Failed to read CSV file: ${csvError.message}`);
      }
      
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
        try {
          const formulationCode = row.formulationCode || row.formulation_code || '';
          const formulationName = row.formulationName || row.formulation_name || '';
          const productCode = row.productCode || row.product_code || '';
          const productName = row.productName || row.product_name || '';
          const targetMass = parseFloat(row.targetMass || row.target_mass || 0) || 0;
          
          // Validate required fields
          if (!formulationCode || !productCode) {
            console.warn(`⚠️  Skipping row with missing required fields: formulationCode=${formulationCode}, productCode=${productCode}`);
            continue;
          }
        
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
        } catch (rowError) {
          console.warn(`⚠️  Error processing CSV row:`, rowError.message);
          console.warn(`   Row data:`, row);
          // Continue with other rows
        }
      }
      
      if (formulationIngredients.length === 0) {
        throw new Error('No valid formulation ingredients found in CSV file. Please check the CSV format.');
      }
      
      console.log(`✅ Parsed ${formulationIngredients.length} formulation ingredients from ${csvData.length} CSV rows`);
      
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
      
      console.log(`🔄 Processing ${formulationIngredients.length} formulation ingredients...`);
      console.log(`   Available formulations: ${formulationMap.size}`);
      console.log(`   Available products: ${productMap.size}`);
      
      for (const fi of formulationIngredients) {
        const formulationId = formulationMap.get(fi.formulationCode);
        const productId = productMap.get(fi.productCode);
        
        if (!formulationId) {
          console.warn(`⚠️  Formulation not found: ${fi.formulationCode}`);
          failedIngredients++;
          continue;
        }
        
        if (!productId) {
          console.warn(`⚠️  Product not found: ${fi.productCode} (for formulation ${fi.formulationCode})`);
          failedIngredients++;
          continue;
        }
        
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
          console.error(`❌ Error inserting ingredient for ${fi.formulationCode}: ${fi.productCode}:`, err.message);
          console.error(`   Formulation ID: ${formulationId}, Product ID: ${productId}`);
          failedIngredients++;
        }
      }
      
      console.log(`✅ Ingredients processed: ${successfulIngredients} successful, ${failedIngredients} failed`);
      
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
      
       // Commit transaction
       await pool.query('COMMIT');
       
       // Update import log after successful commit
       if (logId) {
         try {
           await pool.query(
             `UPDATE import_logs 
              SET status = 'completed', total_records = $1, successful_records = $2, failed_records = $3, completed_at = CURRENT_TIMESTAMP
              WHERE id = $4`,
             [csvData.length, successfulIngredients, failedIngredients, logId]
           );
           console.log(`📝 Updated import log entry: ${logId}`);
         } catch (updateError) {
           console.warn('⚠️  Could not update import log:', updateError.message);
         }
       }
       
       // Clean up uploaded file
       try {
         fs.unlinkSync(filepath);
         console.log(`🗑️  Cleaned up uploaded file: ${filename}`);
       } catch (cleanupError) {
         console.warn('⚠️  Could not clean up file:', cleanupError.message);
       }
       
       console.log(`✅ Database import completed successfully`);
      console.log(`📊 Summary: ${comparison.new_products} new products, ${comparison.updated_products} updated products, ${comparison.new_formulations} new formulations, ${successfulIngredients} ingredients`);
      
      res.json({
        success: true,
        message: 'Database imported successfully',
        comparison: comparison,
        filename: filename
      });
      
      } catch (error) {
        console.error('❌ Database import failed:', error);
        console.error('Error stack:', error.stack);
        
        // Rollback transaction (if transaction was started)
        try {
          // Check if we're in a transaction by attempting to rollback
          await pool.query('ROLLBACK');
          console.log('✅ Transaction rolled back');
        } catch (rollbackError) {
          // If rollback fails, it might mean we're not in a transaction, which is OK
          if (rollbackError.message && !rollbackError.message.includes('not in a transaction')) {
            console.error('⚠️  Error during rollback:', rollbackError.message);
          }
        }
        
        // Update import log with error (outside transaction)
        if (logId) {
          try {
            // Use a separate query for updating log (since transaction was rolled back)
            await pool.query(
              `UPDATE import_logs 
               SET status = 'failed', error_details = $1, completed_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [String(error.message || 'Unknown error').substring(0, 1000), logId] // Limit error message length
            );
            console.log(`📝 Updated import log entry ${logId} with error status`);
          } catch (updateError) {
            console.error('⚠️  Could not update import log:', updateError.message);
          }
        }
        
        // Clean up uploaded file
        if (req.file && req.file.path) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
              console.log(`🗑️  Cleaned up uploaded file: ${req.file.path}`);
            }
          } catch (cleanupError) {
            console.warn('⚠️  Could not clean up file:', cleanupError.message);
          }
        }
        
        // Only send response if it hasn't been sent yet
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            error: 'Database import failed',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        } else {
          console.warn('⚠️  Response already sent, cannot send error response');
        }
      }
    });
  } catch (error) {
    console.error('❌ Import database endpoint error (outer catch):', error);
    console.error('Error stack:', error.stack);
    
    // Only send response if it hasn't been sent yet
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Import endpoint failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      console.warn('⚠️  Response already sent, cannot send error response');
    }
  }
});

// Get import logs endpoint
app.get('/api/import-logs', async (req, res) => {
  try {
    // Check database connection first
    if (!pool) {
      throw new Error('Database connection pool is not initialized');
    }
    
    // Ensure database is initialized
    const dbReady = await initializeDatabase();
    if (!dbReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not initialized',
        message: 'Please run setup-database.bat to initialize the database'
      });
    }
    
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
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch import logs',
      details: error.message,
      hint: error.code === '42P01' ? 'Table "import_logs" does not exist. Please run database migrations.' : undefined
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
  res.sendFile(path.join(distDir, 'index.html'));
});

// Global error handler for unhandled promise rejections in routes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`💡 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await pool.end();
  process.exit(0);
});

module.exports = app;

