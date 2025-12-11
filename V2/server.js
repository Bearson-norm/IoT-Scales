const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Determine directories path (handle packaged executable)
let distDir;
let uploadsDir;

// Setup logging to file for packaged executable - MORE ROBUST VERSION
let logFilePath = null;

// Multiple fallback locations for log file
function findLogFileLocation() {
  const locations = [];
  
  if (process.pkg) {
    // Try executable directory first
    const exeDir = path.dirname(process.execPath);
    locations.push(path.join(exeDir, 'server-error.log'));
    // Try __dirname as fallback
    locations.push(path.join(__dirname, 'server-error.log'));
    // Try temp directory as last resort
    const os = require('os');
    locations.push(path.join(os.tmpdir(), 'iot-scales-server-error.log'));
  } else {
    // Development mode - try project root
    locations.push(path.join(__dirname, 'server-error.log'));
    // Try temp directory
    const os = require('os');
    locations.push(path.join(os.tmpdir(), 'iot-scales-server-error.log'));
  }
  
  return locations;
}

// Synchronous file logging - more reliable
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Always log to console first
  console.log(message);
  
  // Try to write to log file using synchronous method
  if (logFilePath) {
    try {
      // Use appendFileSync for reliability (synchronous, won't be lost if process crashes)
      fs.appendFileSync(logFilePath, logMessage, 'utf8');
    } catch (error) {
      // If write fails, try to create new log file in temp directory
      try {
        const os = require('os');
        const fallbackLog = path.join(os.tmpdir(), 'iot-scales-server-error.log');
        fs.appendFileSync(fallbackLog, `[${timestamp}] Log write error: ${error.message}\n`, 'utf8');
        fs.appendFileSync(fallbackLog, logMessage, 'utf8');
        if (logFilePath !== fallbackLog) {
          console.error(`⚠️  Original log file failed, using fallback: ${fallbackLog}`);
          logFilePath = fallbackLog;
        }
      } catch (fallbackError) {
        // Last resort: just log to console
        console.error('❌ Failed to write to log file:', error.message);
      }
    }
  }
}

function setupFileLogging() {
  const locations = findLogFileLocation();
  let logCreated = false;
  
  for (const logFile of locations) {
    try {
      // Try to create/append to log file
      const initMsg = `📝 Server starting - Logging to: ${logFile}`;
      const timestamp = new Date().toISOString();
      fs.appendFileSync(logFile, `\n${'='.repeat(80)}\n`, 'utf8');
      fs.appendFileSync(logFile, `[${timestamp}] ${initMsg}\n`, 'utf8');
      fs.appendFileSync(logFile, `${'='.repeat(80)}\n`, 'utf8');
      
      logFilePath = logFile;
      logCreated = true;
      console.log(initMsg);
      console.log(`💡 Log file location: ${logFile}`);
      break;
    } catch (error) {
      // Try next location
      continue;
    }
  }
  
  if (!logCreated) {
    console.error('⚠️  WARNING: Could not create log file in any location!');
    console.error('   Tried locations:', locations.join(', '));
    // Still try to use first location for error messages
    logFilePath = locations[0];
  }
}

// Initialize file logging FIRST - before anything else
setupFileLogging();
logToFile('🚀 Server initialization started');
logToFile(`📦 Package mode: ${process.pkg ? 'YES (packaged executable)' : 'NO (development)'}`);
logToFile(`📁 __dirname: ${__dirname}`);
logToFile(`📁 process.execPath: ${process.execPath}`);
logToFile(`📁 process.cwd(): ${process.cwd()}`);

// Display log file location prominently
if (logFilePath) {
  console.log('\n' + '='.repeat(80));
  console.log(`📝 LOG FILE LOCATION: ${logFilePath}`);
  console.log('='.repeat(80) + '\n');
  logToFile(`📝 Log file location: ${logFilePath}`);
}

if (process.pkg) {
  // When packaged, __dirname points to executable location
  // dist and uploads folders are copied external to executable
  const exeDir = path.dirname(process.execPath);
  distDir = path.join(exeDir, 'dist');
  uploadsDir = path.join(exeDir, 'uploads');
  
  logToFile(`📦 Packaged executable detected`);
  logToFile(`📁 Executable directory: ${exeDir}`);
  logToFile(`📁 Trying dist directory: ${distDir}`);
  
  // Verify directories exist, if not try __dirname (fallback)
  if (!fs.existsSync(distDir)) {
    logToFile(`⚠️  Dist directory not found at: ${distDir}`);
    distDir = path.join(__dirname, 'dist');
    logToFile(`📁 Trying fallback dist directory: ${distDir}`);
  }
  
  if (!fs.existsSync(distDir)) {
    logToFile(`❌ ERROR: Dist directory not found at either location!`);
    logToFile(`   Checked: ${path.join(exeDir, 'dist')}`);
    logToFile(`   Checked: ${path.join(__dirname, 'dist')}`);
  } else {
    logToFile(`✅ Dist directory found: ${distDir}`);
    
    // Verify index.html exists
    const indexHtml = path.join(distDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
      logToFile(`✅ index.html found: ${indexHtml}`);
    } else {
      logToFile(`❌ ERROR: index.html not found in dist directory!`);
    }
    
    // Check for assets directory
    const assetsDir = path.join(distDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      logToFile(`✅ Assets directory found: ${assetsDir}`);
      const assetFiles = fs.readdirSync(assetsDir);
      logToFile(`📄 Found ${assetFiles.length} files in assets directory`);
    } else {
      logToFile(`⚠️  Assets directory not found: ${assetsDir}`);
    }
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
  logToFile(`📁 Uploads directory: ${uploadsDir}`);
} else {
  // Normal development mode
  distDir = path.join(__dirname, 'dist');
  uploadsDir = path.join(__dirname, 'uploads');
  logToFile(`🔧 Development mode detected`);
  logToFile(`📁 Dist directory: ${distDir}`);
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

// Verify distDir exists before continuing
if (!fs.existsSync(distDir)) {
  const errorMsg = `❌ FATAL ERROR: Dist directory does not exist: ${distDir}\nPlease ensure the dist folder is present in the release directory.`;
  console.error(errorMsg);
  logToFile(errorMsg);
  process.exit(1);
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

// Serve static files with error handling
app.use(express.static(distDir, {
  // Set max-age for caching (1 hour)
  maxAge: '1h',
  // Custom error handler for missing files
  setHeaders: (res, filePath) => {
    // Log if file not found
    if (!fs.existsSync(filePath)) {
      const relativePath = path.relative(distDir, filePath);
      logToFile(`⚠️  Static file not found: ${relativePath} (requested: ${filePath})`);
    }
  }
}));

logToFile(`📁 Static files configured to serve from: ${distDir}`);

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

// Debug flag for scale operations (must be defined early)
const DEBUG_SCALE = process.env.DEBUG_SCALE === 'true'; // Enable debug logging

// WebSocket server for real-time scale data streaming (performance optimization)
// Must be defined before route handlers that use it
const wss = new WebSocket.Server({ server, path: '/ws/scale' });
let scaleClients = new Set(); // Track connected WebSocket clients
let continuousReadingActive = false; // Track if continuous reading mode is active
let lastBroadcastTime = 0;
const MIN_BROADCAST_INTERVAL = 0; // No throttling - seamless real-time updates (was 50ms)

// WebSocket connection handlers for real-time scale data
wss.on('connection', (ws) => {
  scaleClients.add(ws);
  if (DEBUG_SCALE) console.log(`📡 WebSocket client connected. Total clients: ${scaleClients.size}`);
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to scale data stream',
    timestamp: new Date().toISOString()
  }));
  
  // Start continuous reading if not already active
  if (!continuousReadingActive && scaleClients.size > 0) {
    startContinuousReading();
  }
  
  ws.on('close', () => {
    scaleClients.delete(ws);
    if (DEBUG_SCALE) console.log(`📡 WebSocket client disconnected. Remaining clients: ${scaleClients.size}`);
    
    // Stop continuous reading if no clients remain
    if (scaleClients.size === 0 && continuousReadingActive) {
      stopContinuousReading();
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    scaleClients.delete(ws);
  });
});

// Broadcast scale data to all connected WebSocket clients
function broadcastScaleData(data) {
  if (scaleClients.size === 0) return;
  
  const now = Date.now();
  // Throttle broadcasts to prevent overwhelming clients
  if (now - lastBroadcastTime < MIN_BROADCAST_INTERVAL) return;
  lastBroadcastTime = now;
  
  const message = JSON.stringify({
    type: 'scale_data',
    success: true,
    timestamp: new Date().toISOString(),
    ...data
  });
  
  // Send to all connected clients
  scaleClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error);
        scaleClients.delete(client);
      }
    }
  });
}

// Continuous reading mode - reads from scale continuously and broadcasts to WebSocket clients
let continuousReadingInterval = null;
let continuousReadingBuffer = Buffer.alloc(0);

function startContinuousReading() {
  if (continuousReadingActive) return;
  if (!SerialPortLib || !scaleConfig.port) return;
  
  continuousReadingActive = true;
  if (DEBUG_SCALE) console.log('🔄 Starting continuous reading mode for WebSocket clients');
  
  // Ensure port is open
  ensurePortOpen().then(() => {
    if (!activePort || !activePort.isOpen) {
      continuousReadingActive = false;
      return;
    }
    
    // Set up data handler for continuous reading
    const dataHandler = (chunk) => {
      continuousReadingBuffer = Buffer.concat([continuousReadingBuffer, chunk]);
      
      // Process complete lines
      const str = continuousReadingBuffer.toString('ascii');
      let newlineIdx = str.indexOf('\n');
      let lineStart = 0;
      
      while (newlineIdx >= 0) {
        const lineEnd = str[newlineIdx - 1] === '\r' ? newlineIdx - 1 : newlineIdx;
        const line = str.substring(lineStart, lineEnd);
        
        if (line.length > 0) {
          const trimmed = line.charCodeAt(0) <= 32 || line.charCodeAt(line.length - 1) <= 32 
            ? line.trim() 
            : line;
          
          if (trimmed.length > 0) {
            const parsed = parseWeightSmart(trimmed);
            if (parsed) {
              broadcastScaleData(parsed);
            }
          }
        }
        
        lineStart = newlineIdx + 1;
        newlineIdx = str.indexOf('\n', lineStart);
      }
      
      // Keep incomplete line in buffer
      if (lineStart > 0) {
        continuousReadingBuffer = Buffer.from(str.substring(lineStart), 'ascii');
      }
      
      // Limit buffer size
      if (continuousReadingBuffer.length > 200) {
        continuousReadingBuffer = Buffer.alloc(0);
      }
    };
    
    // Remove any existing data handlers to avoid conflicts
    activePort.removeAllListeners('data');
    // Add new data handler for continuous reading
    activePort.on('data', dataHandler);
    
    // Poll for data every 50ms (20 times per second) - seamless real-time updates
    // Reduced from 100ms for lower latency
    continuousReadingInterval = setInterval(() => {
      if (activePort && activePort.isOpen && scaleClients.size > 0) {
        try {
          try {
            activePort.write('P\r');
          } catch (writeErr) {
            // Ignore write errors for polling - port might be closing
            if (DEBUG_SCALE) console.debug('Poll write error (ignored):', writeErr.message);
          }
        } catch (err) {
          if (DEBUG_SCALE) console.warn('⚠️  Continuous read poll error:', err.message);
        }
      }
    }, 50);
  }).catch((error) => {
    console.error('❌ Failed to start continuous reading:', error);
    continuousReadingActive = false;
  });
}

function stopContinuousReading() {
  if (!continuousReadingActive) return;
  
  continuousReadingActive = false;
  if (continuousReadingInterval) {
    clearInterval(continuousReadingInterval);
    continuousReadingInterval = null;
  }
  
  if (activePort) {
    activePort.removeAllListeners('data');
  }
  
  continuousReadingBuffer = Buffer.alloc(0);
  if (DEBUG_SCALE) console.log('🛑 Stopped continuous reading mode');
}

// Helper function to ensure port is open (reuses existing port if available)
async function ensurePortOpen() {
  if (activePort && activePort.isOpen && activePort.path === normalizePort(scaleConfig.port)) {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    if (!SerialPortLib) {
      reject(new Error('SerialPortLib not available'));
      return;
    }
    
    const { SerialPort } = SerialPortLib;
    const normalizedPort = normalizePort(scaleConfig.port);
    
    // Close existing port if different
    if (activePort && activePort.isOpen && activePort.path !== normalizedPort) {
      activePort.close(() => {
        activePort = null;
        openNewPort();
      });
    } else if (activePort && !activePort.isOpen) {
      activePort = null;
      openNewPort();
    } else if (!activePort) {
      openNewPort();
    } else {
      resolve();
    }
    
    function openNewPort() {
      const port = new SerialPort({
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
      
      port.open((err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // IMPORTANT: Only set DTR/RTS if explicitly enabled in config
        // Many scales (especially Prolific, 2400 baud) will reset or turn off when DTR/RTS is enabled
        if (scaleConfig.assertDTR || scaleConfig.assertRTS) {
          try {
            port.set({ 
              dtr: scaleConfig.assertDTR || false, 
              rts: scaleConfig.assertRTS || false 
            });
            if (DEBUG_SCALE) console.log(`✅ DTR/RTS set: DTR=${scaleConfig.assertDTR}, RTS=${scaleConfig.assertRTS}`);
          } catch (setErr) {
            console.warn('⚠️  Failed to set DTR/RTS:', setErr.message);
          }
        } else {
          // Ensure DTR/RTS are explicitly disabled (some drivers enable by default)
          try {
            port.set({ dtr: false, rts: false });
          } catch (setErr) {
            // Ignore if already disabled
          }
        }
        
        resolve();
      });
      
      port.on('error', (err) => {
        console.error('❌ Port error in continuous reading:', err.message);
      });
    }
  });
}

// Simple parser for AND EK-15KL format
// Format input HANYA SATU: SELALU dengan titik desimal
//   - "US,+000140.7  g,19:09:09,02/12/2025,169" -> 140.7 g
//   - "ST,+000140.7  g,19:09:10,02/12/2025,170" -> 140.7 g
//   - "ST,+000009.3  g" -> 9.3 g
//   - "ST,+000001.2  g,16:57:40,02/12/2025,71" -> 1.2 g
// CRITICAL: Format SELALU memiliki titik desimal, jadi SELALU gunakan parseFloat langsung
// parseFloat handles leading zeros correctly: "000140.7" -> 140.7
// Supports both ST, and US, prefixes
function parseAndEk15kl(raw) {
  if (!raw) return null;
  
  // Clean data - match AND Print implementation
  let cleaned = raw.replace(/[\r\n]/g, '').trim();
  // Bersihkan karakter yang tidak valid (seperti di AND Print)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Bersihkan karakter '?' yang muncul karena encoding error (seperti di AND Print)
  cleaned = cleaned.replace(/\?([A-Za-z0-9\s,\.\-\+])/g, '$1');
  cleaned = cleaned.replace(/([A-Za-z0-9\s,\.\-\+])\?/g, '$1');
  const cleanedFromCorrupted = cleaned.replace(/\?/g, '');
  
  // Try parsing using split method (like AND Print) - more reliable for AND format
  // Format: "ST,-000000.8  g,11:06:00,03/12/2025,36" or "US,+000000.0  g"
  // Also handle format without prefix: "44.4  g" or "00044.4  g" (incomplete data)
  const parts = cleaned.split(',');
  
  let weightRaw = null;
  let status = null;
  
  // Format 1: Lengkap dengan waktu dan tanggal (5 bagian)
  // Contoh: ST,-000000.8  g,11:06:00,03/12/2025,36
  if (parts.length >= 5) {
    status = parts[0].trim();
    weightRaw = parts[1].trim();
  }
  // Format 2: Hanya status dan berat (2 bagian) - format sederhana
  // Contoh: ST,+000000.0  g atau US,+000000.0  g
  else if (parts.length >= 2) {
    status = parts[0].trim();
    weightRaw = parts[1] ? parts[1].trim() : '';
  }
  // Format 3: Tanpa prefix (data tidak lengkap) - hanya angka dan unit
  // Contoh: "44.4  g" atau "00044.4  g"
  // CRITICAL: Data tanpa prefix seringkali adalah data terpotong (e.g., "8.1  g" dari "ST,+000138.1  g")
  // Validasi: Tolak data tanpa prefix jika nilainya terlalu kecil (< 20g) karena kemungkinan besar terpotong
  // CRITICAL: Juga tolak jika nilainya < 50g dan tidak memiliki format yang jelas (kemungkinan truncation)
  else if (parts.length === 1) {
    // Check if it looks like weight data (has number and unit)
    const hasWeightPattern = /[+\-]?\d+\.?\d*\s*[gkGK]+/i.test(cleaned);
    if (hasWeightPattern) {
      // CRITICAL: Extract weight value first to validate
      const tempWeightMatch = cleaned.match(/([+\-]?)(\d+\.?\d*)\s*[gkGK]+/i);
      if (tempWeightMatch) {
        const tempWeightValue = parseFloat((tempWeightMatch[1] || '') + tempWeightMatch[2]);
        // CRITICAL: Reject data without prefix if value is too small (< 20g)
        // This prevents truncated data like "8.1  g" from "ST,+000138.1  g" being accepted
        // Also reject if value < 50g and doesn't have clear format (likely truncation)
        if (!isNaN(tempWeightValue) && tempWeightValue < 20) {
          if (DEBUG_SCALE) {
            console.warn(`⚠️  Rejecting data without prefix (likely truncated): "${cleaned}" - value ${tempWeightValue}g is too small (< 20g)`);
          }
          return null; // Reject truncated data
        }
        // CRITICAL: Also reject if value < 50g and format is suspicious (e.g., "8.1  g" without leading zeros)
        // This catches cases where "138.1" becomes "8.1" (truncation)
        if (!isNaN(tempWeightValue) && tempWeightValue < 50 && !cleaned.match(/^[+\-]?0+\d/)) {
          // Check if it looks like a truncated number (e.g., "8.1" instead of "138.1")
          // If the number doesn't start with leading zeros and is small, it's likely truncated
          if (DEBUG_SCALE) {
            console.warn(`⚠️  Rejecting data without prefix (likely truncated): "${cleaned}" - value ${tempWeightValue}g is suspicious (< 50g, no leading zeros)`);
          }
          return null; // Reject truncated data
        }
      }
      status = '';
      weightRaw = cleaned.trim();
    }
  }
  
  // Debug logging untuk melihat raw data
  if (DEBUG_SCALE && weightRaw) {
    console.log(`🔍 Parsing AND format - status: "${status}", weightRaw: "${weightRaw}", parts.length: ${parts.length}`);
  }
  
  // If we have weightRaw, extract weight using AND Print method
  if (weightRaw) {
    // CRITICAL: Validate data completeness before parsing
    // Check if data is incomplete (e.g., "ST,+000442." without unit or decimal digits)
    // Complete format should have: number with decimal point and unit (e.g., "442.3  g")
    // Incomplete format: "442." (no unit, no decimal digits) or "442" (no decimal point, no unit)
    const hasDecimalPoint = weightRaw.includes('.');
    const hasUnit = /(kg|g|lb|oz)/i.test(weightRaw);
    const endsWithDecimalOnly = /\.\s*$/.test(weightRaw.trim()); // Ends with decimal point and optional spaces only
    
    // CRITICAL: Reject incomplete data
    // Case 1: Ends with decimal point only (e.g., "ST,+000442." or "+000442. ")
    // Case 2: Has decimal point but no unit and ends with decimal (e.g., "442.")
    if (endsWithDecimalOnly) {
      if (DEBUG_SCALE) {
        console.warn(`⚠️  Incomplete data detected (ends with decimal only, missing unit or decimal digits): "${weightRaw}" from raw="${cleaned}"`);
      }
      // Return null to reject incomplete data - frontend will use previous value
      return null;
    }
    
    // CRITICAL: Also check if data has decimal point but no unit (might be incomplete)
    // But allow if it's a valid number without decimal (e.g., "442" is valid)
    if (hasDecimalPoint && !hasUnit) {
      // Check if it ends with decimal point (incomplete)
      if (weightRaw.trim().endsWith('.')) {
        if (DEBUG_SCALE) {
          console.warn(`⚠️  Incomplete data detected (has decimal point but no unit and ends with decimal): "${weightRaw}" from raw="${cleaned}"`);
        }
        return null;
      }
    }
    
    // Extract weight value using AND Print regex pattern (allows optional decimal)
    // Pattern: ([+\-]?)(0*\d+\.?\d*) - captures sign, leading zeros, and number
    // CRITICAL: Use pattern that captures ALL digits including leading zeros to prevent truncation
    // Format example: "+000964.0  g" -> sign: "+", number: "000964.0", unit: "g"
    // CRITICAL: Pattern must capture full number including all leading zeros to prevent 964 → 64
    const weightMatch = weightRaw.match(/([+\-]?)(0*\d+\.?\d*)\s*(kg|g|lb|oz)?/i);
    if (weightMatch) {
      // Combine sign and number for proper parsing
      const signStr = weightMatch[1] || '';
      const numStr = weightMatch[2] || '';
      const fullNumStr = signStr + numStr;
      const weightValue = parseFloat(fullNumStr);
      const weightUnit = (weightMatch[3] || (weightRaw.match(/(kg|g|lb|oz)/i) ? weightRaw.match(/(kg|g|lb|oz)/i)[1] : 'g')).toUpperCase();
      
      // Debug logging untuk melihat parsing detail
      if (DEBUG_SCALE) {
        console.log(`🔍 Weight match - signStr: "${signStr}", numStr: "${numStr}", fullNumStr: "${fullNumStr}", weightValue: ${weightValue}, weightUnit: "${weightUnit}"`);
      }
      
      // CRITICAL: Validate that we captured the full number correctly
      // Check if numStr seems incomplete (e.g., only 1-2 digits when we expect more)
      // This helps catch cases where 964 might be parsed as 64, 720 might be parsed as 9.9, or 529 might be parsed as 9
      // CRITICAL: Also check if the parsed value seems too small compared to expected range
      const numStrWithoutLeadingZeros = numStr.replace(/^0+/, '') || '0';
      // CRITICAL: More aggressive check - if raw data is long but captured number is short, it's likely truncated
      // Also check if weightValue seems suspiciously small (e.g., 64 when we might expect 964)
      const isSuspiciouslyShort = (numStrWithoutLeadingZeros.length < 3 && weightRaw.length > 10) || 
                                   (numStrWithoutLeadingZeros.length < 2 && weightRaw.length > 15) ||
                                   (weightValue > 0 && weightValue < 100 && weightRaw.length > 15); // Suspicious if value < 100g but raw data is long
      
      if (isSuspiciouslyShort) {
        // If the raw data is long but we only captured a short number, something might be wrong
        if (DEBUG_SCALE) {
          console.warn(`⚠️  Short number captured from long raw data: numStr="${numStr}" (without leading zeros: "${numStrWithoutLeadingZeros}") weightValue=${weightValue} from raw="${weightRaw}"`);
        }
        
        // CRITICAL: Try multiple patterns to find the full number
        // Pattern 1: Try to find a longer number pattern (3+ digits) - most common case (e.g., 964, 720)
        // This should match "964.0" or "964" from "+000964.0 g"
        let longerMatch = weightRaw.match(/([+\-]?)(\d{3,}\.?\d*)\s*(kg|g|lb|oz)?/i);
        if (!longerMatch || !longerMatch[2] || longerMatch[2].length <= numStr.length) {
          // Pattern 2: Try to find number with decimal point (might be 964.0 or 720.5)
          // This specifically looks for numbers with decimal point
          longerMatch = weightRaw.match(/([+\-]?)(\d{3,}\.\d+)\s*(kg|g|lb|oz)?/i);
        }
        if (!longerMatch || !longerMatch[2] || longerMatch[2].length <= numStr.length) {
          // Pattern 3: Try to find number starting with 1-9 followed by 2+ digits (e.g., 964, 720, 529)
          // This handles cases where leading zeros are stripped but we still have 3+ digits
          longerMatch = weightRaw.match(/([+\-]?)([1-9]\d{2,}\.?\d*)\s*(kg|g|lb|oz)?/i);
        }
        if (!longerMatch || !longerMatch[2] || longerMatch[2].length <= numStr.length) {
          // Pattern 4: Try to find any number sequence that's longer (2+ digits)
          // Fallback pattern for any longer number
          longerMatch = weightRaw.match(/([+\-]?)(\d{2,}\.?\d*)\s*(kg|g|lb|oz)?/i);
        }
        if (!longerMatch || !longerMatch[2] || longerMatch[2].length <= numStr.length) {
          // Pattern 5: Try to extract all digits from the raw string (most aggressive)
          // This extracts all consecutive digits as a last resort
          const allDigitsMatch = weightRaw.match(/([+\-]?)(\d{3,})/);
          if (allDigitsMatch && allDigitsMatch[2] && allDigitsMatch[2].length > numStr.length) {
            longerMatch = allDigitsMatch;
          }
        }
        
        if (longerMatch && longerMatch[2] && longerMatch[2].length > numStr.length) {
          const correctedSignStr = longerMatch[1] || '';
          const correctedNumStr = longerMatch[2] || '';
          const correctedFullNumStr = correctedSignStr + correctedNumStr;
          const correctedWeightValue = parseFloat(correctedFullNumStr);
          
          if (DEBUG_SCALE) {
            console.log(`✅ Found longer match: "${longerMatch[2]}" vs "${numStr}", using longer match. Corrected value: ${correctedWeightValue} (original: ${weightValue})`);
          }
          
          if (!isNaN(correctedWeightValue) && correctedWeightValue > 0 && correctedWeightValue <= 10000) {
            // Use the corrected value
            const correctedWeightUnit = (longerMatch[3] || weightUnit).toUpperCase();
            let weightGrams = correctedWeightValue;
            if (correctedWeightUnit === 'KG' || correctedWeightUnit.includes('KG')) {
              weightGrams = correctedWeightValue * 1000; // kg to gram
            }
            
            if (DEBUG_SCALE) {
              console.log(`✅ Using corrected weight: ${weightGrams}g (original: ${weightValue}g, raw: "${cleaned}")`);
            }
            
            return {
              weight: weightGrams,
              unit: 'g',
              originalUnit: correctedWeightUnit,
              stable: true,
              raw: cleaned
            };
          }
        } else {
          // If we couldn't find a longer match, log warning but continue with original parsing
          if (DEBUG_SCALE) {
            console.warn(`⚠️  Could not find longer match for short number: numStr="${numStr}" weightValue=${weightValue} from raw="${weightRaw}"`);
          }
        }
      }
      
      // Validate: check if parsing was successful (allow negative and zero values like AND Print)
      if (isNaN(weightValue)) {
        return null;
      }
      
      // CRITICAL VALIDATION: Check for parsing errors with leading zeros
      // Problem: Sometimes "000170.0" might be parsed incorrectly, or data format varies
      // Solution: Validate that parsed value is reasonable for a scale reading
      // Typical scale range: 0.1g to 10000g (10kg)
      // If weightValue > 10000, it's likely a parsing error
      if (weightValue > 10000) {
        if (DEBUG_SCALE) {
          console.warn(`⚠️  Suspicious weight value: ${weightValue} from raw: "${weightRaw}"`);
        }
        // Try to re-parse by removing leading zeros more carefully
        const cleanedNumStr = numStr.replace(/^0+/, '') || '0';
        const reParsedValue = parseFloat(signStr + cleanedNumStr);
        if (!isNaN(reParsedValue) && reParsedValue <= 10000 && reParsedValue > 0) {
          // Use the re-parsed value if it's more reasonable
          if (DEBUG_SCALE) {
            console.log(`✅ Corrected weight: ${weightValue} -> ${reParsedValue} from raw: "${weightRaw}"`);
          }
          const correctedWeight = reParsedValue;
          // Return weight directly in grams (no conversion needed)
          let weightGrams = correctedWeight;
          if (weightUnit === 'KG' || weightUnit.includes('KG')) {
            weightGrams = weightGrams * 1000; // kg to gram
          }
          return {
            weight: weightGrams,
            unit: 'g',
            originalUnit: weightUnit,
            stable: true,
            raw: cleaned
          };
        } else {
          // Value is still too large even after cleaning, reject it
          if (DEBUG_SCALE) {
            console.warn(`❌ Rejected weight value: ${weightValue} (too large) from raw: "${weightRaw}"`);
          }
          return null;
        }
      }
      
      // Return weight directly in grams (no conversion needed)
      // CRITICAL: weightValue is already in grams (e.g., 140.7 or 17.0 or -0.8)
      let weightGrams = weightValue;
      if (weightUnit === 'KG' || weightUnit.includes('KG')) {
        weightGrams = weightGrams * 1000; // kg to gram
      }
      
      // Debug logging untuk melihat hasil akhir
      if (DEBUG_SCALE) {
        console.log(`✅ Split method result - weightValue: ${weightValue}, weightUnit: "${weightUnit}", weightGrams: ${weightGrams}, raw: "${cleaned}"`);
      }
      
      return {
        weight: weightGrams,
        unit: 'g',
        originalUnit: weightUnit,
        stable: true,
        raw: cleaned
      };
    }
  }
  
  // Fallback: Try regex method (original method) if split method fails
  let match = null;
  
  // First: Try main AND EK-15KL regex (with decimal) - supports both ST, and US,
  // Reset regex lastIndex to ensure fresh match
  AND_EK15KL_REGEX.lastIndex = 0;
  match = AND_EK15KL_REGEX.exec(cleaned);
  if (!match) {
    AND_EK15KL_REGEX.lastIndex = 0;
    match = AND_EK15KL_REGEX.exec(cleanedFromCorrupted);
  }
  
  // Second: Try flexible pattern (handles variable spacing, with optional decimal like AND Print)
  if (!match) {
    // Updated pattern to capture sign and number separately for better control
    // Pattern: capture sign, then leading zeros (optional), then digits with optional decimal
    const flexiblePattern = /(?:ST|US)[,:]\s*([+-]?)\s*(0*)(\d+\.?\d*)\s+([gkGK]+)(?:,|$)/i;
    match = flexiblePattern.exec(cleaned) || flexiblePattern.exec(cleanedFromCorrupted);
  }
  
  // If no match found, return null
  if (!match) {
    return null;
  }
  
  const sign = match[1] === '-' ? -1 : 1;
  const leadingZeros = match[2] || '';
  const weightStr = match[3] || '';
  const unit = (match[4] || 'g').toUpperCase();
  
  // CRITICAL: Parse weight value carefully to handle leading zeros correctly
  // Combine sign and number for parsing
  const fullNumStr = (match[1] || '') + weightStr;
  let weightValue = parseFloat(fullNumStr);
  
  // Validate: check if parsing was successful (allow negative and zero values like AND Print)
  if (isNaN(weightValue)) {
    return null;
  }
  
  // CRITICAL VALIDATION: Detect and fix parsing errors with leading zeros
  // Problem: Sometimes "000170.0" might be parsed incorrectly, or data format varies
  // Solution: Validate that parsed value is reasonable for a scale reading
  // Typical scale range: 0.1g to 10000g (10kg)
  // If weightValue > 10000, it's likely a parsing error
  if (weightValue > 10000) {
    if (DEBUG_SCALE) {
      console.warn(`⚠️  Suspicious weight value: ${weightValue} from raw: "${cleaned}"`);
    }
    // Try to re-parse by removing leading zeros
    const cleanedNumStr = weightStr.replace(/^0+/, '') || '0';
    const reParsedValue = parseFloat((match[1] || '') + cleanedNumStr);
    if (!isNaN(reParsedValue) && reParsedValue <= 10000 && reParsedValue > 0) {
      // Use the re-parsed value if it's more reasonable
      if (DEBUG_SCALE) {
        console.log(`✅ Corrected weight: ${weightValue} -> ${reParsedValue} from raw: "${cleaned}"`);
      }
      weightValue = reParsedValue;
    } else {
      // Value is still too large even after cleaning, reject it
      if (DEBUG_SCALE) {
        console.warn(`❌ Rejected weight value: ${weightValue} (too large) from raw: "${cleaned}"`);
      }
    return null;
    }
  }
  
  // Return weight directly in grams (no conversion needed)
  // CRITICAL: weightValue is already in grams (e.g., 140.7 or 17.0 or -0.8)
  let weightGrams = weightValue * sign;
  if (unit === 'KG' || unit.includes('KG')) {
    weightGrams = weightGrams * 1000; // kg to gram
  }
  
  // Debug logging untuk melihat hasil akhir fallback method
  if (DEBUG_SCALE) {
    console.log(`✅ Fallback regex method result - weightValue: ${weightValue}, sign: ${sign}, unit: "${unit}", weightGrams: ${weightGrams}, raw: "${cleaned}"`);
  }
  
  return {
    weight: weightGrams,
    unit: 'g',
    originalUnit: unit,
    stable: true,
    raw: cleaned
  };
}

function parseWeightSmart(raw) {
  if (!raw || raw.length < 3) return null;
  
  // Check scale model and use appropriate parser
  const model = scaleConfig.model || 'vibra';
  
  // Parse based on scale model
  if (model === 'and-ek15kl' || model === 'and_ek15kl') {
    const result = parseAndEk15kl(raw);
    if (result) return result;
  }
  
  // Try Vibra format (default or when model is 'vibra')
  if (model === 'vibra' || model === 'generic') {
  const vibra = VIBRA_REGEX.exec(raw);
  if (vibra) {
    const sign = vibra[1] === '-' ? -1 : 1;
    const value = parseFloat(vibra[2]);
    const unit = vibra[3];
    // Return weight directly in grams (no conversion needed)
    const grams = unit === 'G' ? value * sign : value * sign * 1000; // If unit is K (kg), convert to grams
    return { 
      weight: grams, 
      unit: 'g', 
      originalUnit: unit, 
      stable: vibra[4] === 'S'
    };
    }
  }
  
  // CRITICAL: Always try AND EK-15KL format if data contains ST, or US, prefix
  // This MUST come before any fallback to prevent incorrect parsing
  // If data has ST, or US, prefix, it MUST be AND EK-15KL format - no exceptions
  const upperRaw = raw.toUpperCase();
  if (upperRaw.includes('ST,') || upperRaw.includes('US,')) {
    const andResult = parseAndEk15kl(raw);
    // If AND EK-15KL parser returns null, it means format is invalid
    // DO NOT fall back to other parsers - return null to indicate parsing failure
    return andResult; // Return result (could be null if format invalid)
  }
  
  // Last resort: try AND EK-15KL format even if not selected (for auto-detection)
  // Only if data doesn't contain ST, or US, prefix
  if (model !== 'and-ek15kl' && model !== 'and_ek15kl') {
    const andResult = parseAndEk15kl(raw);
    if (andResult) return andResult;
  }
  
  // Fallback: try decimal format for any model (only if AND EK-15KL didn't match)
  // CRITICAL: NEVER use this fallback if data contains ST, or US, prefix
  // This prevents DECIMAL_REGEX from incorrectly parsing AND EK-15KL format
  if (!upperRaw.includes('ST,') && !upperRaw.includes('US,')) {
  const mDec = DECIMAL_REGEX.exec(raw);
  if (mDec && mDec[1]) {
    const val = parseFloat(mDec[1]);
      // CRITICAL: For AND scale, if unit is not detected, assume it's in grams (not kg)
      // Default to 'G' (gram) instead of 'K' (kg) to match AND scale behavior
      const unit = (mDec[2] || 'G').toUpperCase();
      // Return weight directly in grams (no conversion needed)
      // If unit is 'G' (gram), use value directly
      // If unit is 'K' (kg), convert to grams
      const weight = unit === 'K' ? val * 1000 : val;
      
      // Debug logging
      if (DEBUG_SCALE) {
        console.log(`🔍 Fallback decimal parser - val: ${val}, unit: "${unit}", weight: ${weight}g, raw: "${raw}"`);
      }
      
      return { weight, unit: 'g', originalUnit: unit, stable: true };
    }
  }
  
  return null;
}

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
  timeoutMs: 300, // Optimized: reduced to 300ms for faster response (scale typically responds in <200ms)
  assertDTR: false,  // DTR disabled by default - many scales (especially Prolific) don't like DTR/RTS enabled
  assertRTS: false   // RTS disabled by default - can cause scale to reset or turn off
};

let SerialPortLib = null;
let activePort = null; // Track active port to prevent multiple opens
let lastReadTime = 0;
const MIN_READ_INTERVAL = 50; // Optimized to 50ms for faster zero check polling (allows ~20 requests/second) while preventing ERR_INSUFFICIENT_RESOURCES
let pendingRead = null; // Queue for concurrent requests

// Pre-compiled regex patterns for faster parsing (optimized)
// Non-capturing groups where possible, stricter patterns for faster matching
const VIBRA_REGEX = /^([+-]?)(\d{6}\.\d)\s+([GK])\s+([SI])/i; // Case-insensitive, no unnecessary spaces
const DECIMAL_REGEX = /([+-]?\d+\.\d+)\s*([GK])?/i;
const NEWLINE_REGEX = /\r?\n/;
// Optimized: single character check for newline (faster than regex split)
const NEWLINE_CHARS = /\r|\n/;

// AND EK-15KL format regex: "ST,+000009.3  g" -> 9.3 g
// Pattern: ST, + sign + leading zeros + digits.decimal + spaces + unit + (comma or end)
// Examples: 
// - "ST,+000009.3  g" -> 9.3 g (format: ST,+000009.3 for 9.3 gram)
// - "ST,+000001.2  g,16:57:40,02/12/2025,71" -> 1.2 g
// - "ST,+000210.5  g" -> 210.5 g
// Note: Stop parsing after unit (ignore timestamp, date, checksum after comma)
// Regex captures: sign, weight value (with leading zeros), unit
// AND EK-15KL format regex: supports both ST, and US, prefixes
// Format: "ST,+000001.2  g,16:57:40,02/12/2025,71" or "US,+000140.7  g,19:09:09,02/12/2025,169"
// Pattern: (ST|US), + sign + leading zeros + weight + spaces + unit + (comma or end)
const AND_EK15KL_REGEX = /(?:ST|US)[,:]\s*([+-]?)\s*(0*\d+\.\d+)\s+([gkGK]+)(?:,|$)/i;

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
  
  // Return weight directly in grams (no conversion needed)
  // - Jika unit G (gram), gunakan langsung
  // - Jika unit K (kg), konversi ke gram: gram = nilai_kg * 1000
  let weightGrams = numericValue;
  if (unit === 'K') {
    weightGrams = numericValue * 1000; // kg to gram
  } // else unit === 'G', already in grams
  
  return {
    weight: weightGrams,
    weightOriginal: numericValue,
    unit: 'g',
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
    // Update config with provided values, preserve defaults for missing values
    const oldPort = scaleConfig.port;
    scaleConfig = { 
      ...scaleConfig, 
      port: cfg.port || scaleConfig.port,
      enabled: cfg.enabled !== undefined ? cfg.enabled : scaleConfig.enabled,
      model: cfg.model || scaleConfig.model,
      baudRate: cfg.baudRate !== undefined ? cfg.baudRate : scaleConfig.baudRate,
      dataBits: cfg.dataBits !== undefined ? cfg.dataBits : scaleConfig.dataBits,
      stopBits: cfg.stopBits !== undefined ? cfg.stopBits : scaleConfig.stopBits,
      parity: cfg.parity || scaleConfig.parity
    };
    
    // Close active port if port or serial settings changed
    const portChanged = oldPort !== scaleConfig.port;
    const settingsChanged = cfg.baudRate !== undefined || cfg.dataBits !== undefined || 
                           cfg.stopBits !== undefined || cfg.parity !== undefined;
    
    if (activePort && (portChanged || settingsChanged)) {
      try {
        await new Promise((resolve) => {
          activePort.close(() => resolve());
        });
      } catch (_) {}
      activePort = null;
      console.log('⚠️  Closed active port due to configuration change');
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

// Auto configure scale - automatically detect and configure the scale
app.post('/api/scale/auto-configure', async (req, res) => {
  try {
    if (!SerialPortLib) {
      return res.status(501).json({ 
        success: false, 
        error: 'Serialport module not available',
        details: 'Please install serialport module to use scale features'
      });
    }

    const { SerialPort } = SerialPortLib;
    
    // Get list of available ports
    const ports = await SerialPort.list();
    if (ports.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No serial ports found',
        details: 'Please connect a scale device and try again'
      });
    }

    console.log('🔍 Starting auto-configure for scale...');
    console.log(`   Found ${ports.length} port(s) to test`);

    // Common configurations to test - OPTIMIZED: Test most common first for faster detection
    // Most scales respond within 200-400ms, so we use much shorter timeouts
    // IMPORTANT: Test stop bits variations first (1 vs 2) as this is the most common issue
    const configurations = [
      // AND EK-15KL - HIGHEST PRIORITY (user's reported config: 2400, 7, even, 1)
      { baudRate: 2400, dataBits: 7, stopBits: 1, parity: 'even', timeout: 600, priority: 1 }, // AND EK-15KL default
      { baudRate: 2400, dataBits: 7, stopBits: 2, parity: 'even', timeout: 600, priority: 1 }, // AND EK-15KL variant (stop bits 2)
      { baudRate: 2400, dataBits: 8, stopBits: 1, parity: 'even', timeout: 600, priority: 1 }, // AND EK-15KL variant (8 bits)
      { baudRate: 2400, dataBits: 8, stopBits: 2, parity: 'even', timeout: 600, priority: 1 }, // AND EK-15KL variant
      // Prolific/2400 baud scales - HIGH PRIORITY
      // Test stop bits variations FIRST (1 vs 2) as many scales are sensitive to this
      { baudRate: 2400, dataBits: 8, stopBits: 1, parity: 'none', timeout: 600, priority: 1 }, // Stop bits 1 - most common
      { baudRate: 2400, dataBits: 8, stopBits: 2, parity: 'none', timeout: 600, priority: 1 }, // Stop bits 2 - also common
      { baudRate: 2400, dataBits: 7, stopBits: 1, parity: 'none', timeout: 700, priority: 2 }, // 7-bit variant
      { baudRate: 2400, dataBits: 7, stopBits: 2, parity: 'none', timeout: 700, priority: 2 }, // 7-bit variant
      // Vibra scale defaults (MOST COMMON - test these after 2400)
      { baudRate: 9600, dataBits: 8, stopBits: 2, parity: 'none', timeout: 400, priority: 1 }, // Vibra default - fastest timeout
      { baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', timeout: 400, priority: 1 },
      { baudRate: 9600, dataBits: 7, stopBits: 2, parity: 'none', timeout: 500, priority: 2 },
      { baudRate: 19200, dataBits: 8, stopBits: 2, parity: 'none', timeout: 400, priority: 1 },
      // AND EK-15KL other common configurations
      { baudRate: 9600, dataBits: 8, stopBits: 2, parity: 'even', timeout: 500, priority: 2 },
      { baudRate: 4800, dataBits: 7, stopBits: 2, parity: 'even', timeout: 600, priority: 2 }, // AND EK-15KL common
      { baudRate: 9600, dataBits: 7, stopBits: 2, parity: 'even', timeout: 500, priority: 2 },
      { baudRate: 4800, dataBits: 8, stopBits: 2, parity: 'none', timeout: 500, priority: 2 },
      // Less common configurations (only if above fail)
      { baudRate: 9600, dataBits: 7, stopBits: 1, parity: 'even', timeout: 600, priority: 3 },
      { baudRate: 9600, dataBits: 8, stopBits: 2, parity: 'odd', timeout: 600, priority: 3 },
      { baudRate: 4800, dataBits: 7, stopBits: 1, parity: 'even', timeout: 700, priority: 3 },
      { baudRate: 38400, dataBits: 8, stopBits: 1, parity: 'none', timeout: 500, priority: 3 },
      { baudRate: 1200, dataBits: 7, stopBits: 2, parity: 'even', timeout: 1000, priority: 3 }, // Very slow baud
    ];

    let foundConfig = null;
    let foundPort = null;
    const testResults = [];
    let shouldStop = false; // Flag to stop all tests when config is found

    // Helper function to test a single port-config combination
    const testPortConfig = async (portInfo, config) => {
      if (shouldStop) return null;
      
      const portPath = normalizePort(portInfo.path);
        let testPort = null;
      
        try {
          // Create and open port with test configuration
          // IMPORTANT: Start with DTR/RTS disabled - many scales (especially Prolific) reset or turn off when DTR/RTS is enabled
          testPort = new SerialPort({
            path: portPath,
            baudRate: config.baudRate,
            dataBits: config.dataBits,
            stopBits: config.stopBits,
            parity: config.parity,
            autoOpen: false,
            dtr: false,  // Start with DTR disabled
            rts: false,  // Start with RTS disabled
            rtscts: false, // Disable hardware flow control
            xon: false,
            xoff: false,
            xany: false
          });

          // Open port
          await new Promise((resolve, reject) => {
            testPort.open((err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          // Wait for port to stabilize (reduced delay for faster testing)
        await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 200ms to 100ms

        // Try to read data (with timeout) - OPTIMIZED: much shorter timeout
          const readPromise = new Promise((resolve, reject) => {
          if (shouldStop) {
            resolve(null);
            return;
          }
          
            let dataReceived = false;
            let buffer = '';

          // Use config-specific timeout (much shorter for faster detection)
          const testTimeout = config.timeout || 600; // Default 600ms
            const timeout = setTimeout(() => {
              if (!dataReceived) {
                testPort.removeAllListeners('data');
                testPort.removeAllListeners('error');
                resolve(null);
              }
            }, testTimeout);

            testPort.on('data', (data) => {
            if (shouldStop) {
              clearTimeout(timeout);
              testPort.removeAllListeners('data');
              testPort.removeAllListeners('error');
              resolve(null);
              return;
            }
            
              buffer += data.toString();
              // Check if we got valid data (multiple formats supported)
              if (buffer.length >= 3) { // Reduced minimum length to catch shorter responses
                const trimmed = buffer.trim();
                // Check for various scale formats:
                // 1. AND EK-15KL format: "ST,+000210.5  g" or "ST,+000210.5 g" (HIGHEST PRIORITY)
                // 2. Vibra format: "+000085.9 G S" or similar
                // 3. Generic numeric with optional unit
                // 4. Fixed-width numeric (AND scales often send fixed-width like "0001234")
                const hasValidData = 
                  /ST[,:]\s*[+-]?\s*0*\d+\.?\d+\s*[gkGK]+/i.test(trimmed) || // AND EK-15KL format (ST, prefix)
                  /ST[,:]\s*[+-]?\s*0*\d+\.?\d+/.test(trimmed) || // AND EK-15KL without unit
                  /^[\+\-]?\d+\.?\d*\s*[GgKkMm]?/.test(trimmed) || // Vibra-style with optional unit
                  /^[\+\-]?\d+\.?\d+/.test(trimmed) || // Signed decimal number (most common)
                  /^[\+\-]?\d{3,}/.test(trimmed) || // Fixed-width numeric (3+ digits, AND scales)
                  /^\d+\.?\d*/.test(trimmed); // Unsigned numeric (fallback)
                
                if (hasValidData) {
                  dataReceived = true;
                  clearTimeout(timeout);
                  testPort.removeAllListeners('data');
                  testPort.removeAllListeners('error');
                  resolve({ raw: trimmed, valid: true });
                }
              }
            });

            testPort.on('error', (err) => {
              // Filter out non-fatal serialport errors during testing
              const isNonFatalError = err.message && (
                err.message.includes('Writing to COM port') ||
                err.message.includes('GetOverlappedResult') ||
                err.message.includes('Operation aborted')
              );
              
              if (isNonFatalError) {
                // Don't reject on non-fatal errors - just log and continue testing
                // These errors are common when port is not ready or scale is not responding
                if (DEBUG_SCALE) console.debug(`   Port test error (ignored): ${err.message}`);
                return; // Don't reject, let timeout handle it
              }
              
              // For other errors, reject
              clearTimeout(timeout);
              testPort.removeAllListeners('data');
              testPort.removeAllListeners('error');
              reject(err);
            });

            // Try multiple command sequences to trigger data from different scale types
          // OPTIMIZED: Send commands faster with minimal delays
            const safeWrite = (data, delay = 0) => {
              setTimeout(() => {
                try {
                if (testPort && testPort.isOpen && !shouldStop) {
                    testPort.write(data);
                  }
                } catch (e) {
                // Silently ignore write errors
                }
              }, delay);
            };
            
            try {
            // OPTIMIZED: Faster command sequence - send commands with minimal delays
            safeWrite('P\r', 0); // Primary command
            safeWrite('\r', 20); // Reduced from 50ms
            safeWrite('?\r', 40); // Reduced from 100ms
            safeWrite('W\r', 60); // Reduced from 150ms
            safeWrite('\x05', 80); // Reduced from 200ms
            } catch (e) {
            // Ignore write errors
            }
          });

          const result = await readPromise;

          // Close test port
          await new Promise((resolve) => {
            testPort.close((err) => {
            if (err && DEBUG_SCALE) console.warn(`   Warning: Error closing test port: ${err.message}`);
              resolve();
            });
          });

          if (result && result.valid) {
          return {
              port: portInfo.path,
              config,
              success: true,
              sampleData: result.raw
          };
          } else {
          return {
              port: portInfo.path,
              config,
              success: false
          };
          }

        } catch (error) {
          // Port might be in use or configuration invalid
          // Close port if still open
          if (testPort && testPort.isOpen) {
            try {
              await new Promise((resolve) => {
                testPort.close(() => resolve());
              });
            } catch (e) {
              // Ignore close errors
            }
          }
        
        return {
          port: portInfo.path,
          config,
          success: false,
          error: error.message
        };
      }
    };

    // OPTIMIZED: Test configurations in parallel batches for much faster detection
    // Test priority 1 configs first in parallel, then priority 2, then priority 3
    const MAX_PARALLEL_TESTS = 5; // Test up to 5 configs simultaneously per port
    
    // Group configs by priority
    const priorityGroups = {};
    configurations.forEach(config => {
      const priority = config.priority || 3;
      if (!priorityGroups[priority]) priorityGroups[priority] = [];
      priorityGroups[priority].push(config);
    });
    
    // Test ports in order, but configs in parallel batches
    for (const portInfo of ports) {
      if (shouldStop) break;
      
      const portPath = normalizePort(portInfo.path);
      console.log(`   Testing port: ${portInfo.path}`);

      // Test by priority (1 = highest, 3 = lowest)
      for (let priority = 1; priority <= 3; priority++) {
        if (shouldStop) break;
        
        const configsToTest = priorityGroups[priority] || [];
        if (configsToTest.length === 0) continue;

        // Test configs in parallel batches
        for (let i = 0; i < configsToTest.length; i += MAX_PARALLEL_TESTS) {
          if (shouldStop) break;
          
          const batch = configsToTest.slice(i, i + MAX_PARALLEL_TESTS);
          const batchPromises = batch.map(config => testPortConfig(portInfo, config));
          
          const batchResults = await Promise.all(batchPromises);
          
          // Process results
          for (const result of batchResults) {
            if (!result) continue;
            
            testResults.push(result);
            
            if (result.success && !foundConfig) {
              foundConfig = {
                ...result.config,
                sampleData: result.sampleData
              };
              foundPort = result.port;
              shouldStop = true; // Stop all remaining tests
              console.log(`   ✅ Found working configuration!`);
              console.log(`      Port: ${result.port}`);
              console.log(`      Config: ${JSON.stringify(result.config)}`);
              console.log(`      Sample data: ${result.sampleData}`);
              break;
            }
          }
          
          if (shouldStop) break;
        }
        
        if (shouldStop) break;
      }

      // If we found a working config, stop testing other ports
      if (foundConfig) break;
    }

    // Note: We test with DTR/RTS disabled by default (see testPort creation above)
    // Many scales (especially Prolific, 2400 baud) will reset or turn off if DTR/RTS is enabled

    if (!foundConfig || !foundPort) {
      return res.status(404).json({
        success: false,
        error: 'No working scale configuration found',
        details: 'Could not detect scale on any port with any tested configuration. Please check:\n' +
                 '1. Scale is powered on and connected\n' +
                 '2. Correct COM port is selected\n' +
                 '3. No other application is using the port\n' +
                 '4. Cable connections are secure\n' +
                 '5. Try manual configuration with known scale settings',
        testResults: testResults.map(r => ({
          port: r.port,
          baudRate: r.config.baudRate,
          success: r.success,
          error: r.error || null
        }))
      });
    }

    // Detect scale model based on found configuration and sample data
    let detectedModel = scaleConfig.model || 'vibra';
    if (foundConfig && foundConfig.sampleData) {
      // Check if sample data matches AND EK-15KL format
      const sampleData = foundConfig.sampleData;
      if (/ST[,:]\s*[+-]?\s*0*\d+\.?\d+\s*[gkGK]+/i.test(sampleData) || 
          /ST[,:]\s*[+-]?\s*0*\d+\.?\d+/.test(sampleData)) {
        detectedModel = 'and-ek15kl';
        console.log('   ✅ Detected AND EK-15KL format from sample data');
      } else if (/^[\+\-]?\d{6}\.\d\s+[GK]\s+[SI]/i.test(sampleData)) {
        detectedModel = 'vibra';
        console.log('   ✅ Detected Vibra format from sample data');
      }
    }

    // Update scale configuration
    scaleConfig = {
      ...scaleConfig,
      port: foundPort,
      baudRate: foundConfig.baudRate,
      dataBits: foundConfig.dataBits,
      stopBits: foundConfig.stopBits,
      parity: foundConfig.parity,
      model: detectedModel, // Set detected model
      enabled: true,
      // Update DTR/RTS if they were explicitly set in foundConfig
      assertDTR: false, // Always disable DTR/RTS after auto-configure - scales may reset if enabled
      assertRTS: false  // Many scales (especially Prolific) don't like DTR/RTS enabled
    };

    // Close active port if it's different
    if (activePort && activePort.path !== normalizePort(foundPort)) {
      try {
        await new Promise((resolve) => {
          activePort.close(() => resolve());
        });
      } catch (e) {
        // Ignore close errors
      }
      activePort = null;
    }

    console.log('✅ Auto-configure completed successfully');
    console.log(`   Updated config:`, scaleConfig);

    res.json({
      success: true,
      message: 'Scale configuration detected and applied successfully',
      config: scaleConfig,
      detectedPort: foundPort,
      detectedConfig: foundConfig,
      testSummary: {
        totalPorts: ports.length,
        totalTests: testResults.length,
        successfulTests: testResults.filter(r => r.success).length
      }
    });

  } catch (error) {
    console.error('❌ Error in auto-configure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-configure scale',
      details: error.message
    });
  }
});

app.get('/api/scale/read', async (req, res) => {
  // Minimal logging - only log errors or important events (not every request)
  
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
  // Use a more lenient rate limit to prevent ERR_INSUFFICIENT_RESOURCES
  // OPTIMIZED: Allow zero check polling (1s interval) even with weighing active polling (100ms)
  // Check if this is a zero check request (user-agent or header can indicate this)
  const now = Date.now();
  const timeSinceLastRead = now - lastReadTime;
  
  // CRITICAL: Only apply rate limiting if requests are too close together
  // For zero check (typically 1s interval), this should rarely trigger
  // This allows both zero check (1s) and weighing active (100ms) to coexist
  if (timeSinceLastRead < MIN_READ_INTERVAL) {
    // Return 429 with retry-after header
    res.setHeader('Retry-After', Math.ceil((MIN_READ_INTERVAL - timeSinceLastRead) / 1000));
    return res.status(429).json({ 
      success: false, 
      error: 'Too many requests. Please wait before reading again.',
      retryAfter: Math.ceil((MIN_READ_INTERVAL - timeSinceLastRead) / 1000),
      timeSinceLastRead: timeSinceLastRead,
      minInterval: MIN_READ_INTERVAL
    });
  }
  
  lastReadTime = now;
  
  try {
    const { SerialPort } = SerialPortLib;
    const normalizedPort = normalizePort(scaleConfig.port);
    
    if (DEBUG_SCALE) console.log(`🔌 Reading scale from port: ${scaleConfig.port} (normalized: ${normalizedPort})`);
    
    // Check if we can reuse existing port (keep port open for persistent connection)
    let port = activePort;
    let shouldReusePort = false;
    
    if (port && port.path === normalizedPort && port.isOpen) {
      if (DEBUG_SCALE) console.log('✅ Reusing existing open port');
      shouldReusePort = true;
      // Remove old listeners to avoid conflicts
      port.removeAllListeners('data');
      port.removeAllListeners('error');
      // Optimized: send single poll command (P\r is usually sufficient and faster)
      // Multiple writes can cause delays, single write is more efficient
      try {
        if (port && port.isOpen) {
          port.write('P\r'); // Single command reduces latency
        }
      } catch (writeErr) {
        // Ignore write errors - port might be closing or not ready
        if (DEBUG_SCALE) console.debug('Poll write error (ignored):', writeErr.message);
      }
    } else {
      // Only close existing port if it's for a different port
      if (activePort && activePort.isOpen && activePort.path !== normalizedPort) {
        if (DEBUG_SCALE) console.log('🔄 Closing existing port (different port requested)');
        try {
          await new Promise((resolve) => {
            activePort.close(() => resolve());
          });
        } catch (_) {}
        activePort = null;
        port = null;
      } else if (activePort && !activePort.isOpen) {
        // Port was closed, reset reference
        if (DEBUG_SCALE) console.log('🔄 Existing port was closed, will open new one');
        activePort = null;
        port = null;
      }
    }
    
    // Optimized: use Buffer for accumulation instead of string concatenation
    let rawBuffer = Buffer.alloc(0); // Buffer for incomplete data (faster than string)
    let resolved = false;
    let timeoutId = null;
    
    const cleanup = () => {
      try {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Keep port open for persistent connection (adapted from Hardware implementation)
        // Only remove listeners if continuous reading is not active (to avoid conflicts)
        // Port will be reused for next request or closed on explicit disconnect
        if (port && !continuousReadingActive) {
          port.removeAllListeners('data');
          port.removeAllListeners('error');
          if (DEBUG_SCALE) console.log('🧹 Cleanup: removed event listeners (port kept open for reuse)');
        } else if (port && continuousReadingActive) {
          if (DEBUG_SCALE) console.log('🧹 Cleanup: keeping listeners for continuous reading');
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
    
    
    // Use the global parseWeightSmart function which handles both Vibra and AND EK-15KL formats
    // This ensures consistent parsing across all endpoints
    const parseWeightSmartLocal = (raw) => {
      // Use the global parseWeightSmart which checks scale model and uses appropriate parser
      return parseWeightSmart(raw);
    };
    
    const dataHandler = (chunk) => {
      if (resolved) return;
      
      // Optimized: accumulate in Buffer instead of string concatenation
      rawBuffer = Buffer.concat([rawBuffer, chunk]);
      
      // Fast check: if buffer too large, something is wrong
      if (rawBuffer.length > 200) {
        if (DEBUG_SCALE) console.warn(`⚠️  Buffer too long: ${rawBuffer.length} bytes`);
        finalize(false, { error: 'Invalid data format', raw: rawBuffer.toString('ascii', 0, 100) });
        return;
      }
      
      // CRITICAL: Wait for complete data before parsing
      // AND scale format typically: "ST,+000138.3  g" (min ~15 chars) or "ST,+000138.3  g,11:06:00,03/12/2025,36" (~40 chars)
      // Don't parse if buffer is too short (likely incomplete data)
      const str = rawBuffer.toString('ascii');
      const minLengthForCompleteData = 15; // Minimum length for complete AND format
      
      // Optimized: convert to string once and process lines
      // Use indexOf for faster newline detection than regex split
      let newlineIdx = str.indexOf('\n');
      let lineStart = 0;
      
      // Process all complete lines
      while (newlineIdx >= 0) {
        // Extract line (handle \r\n or \n)
        const lineEnd = str[newlineIdx - 1] === '\r' ? newlineIdx - 1 : newlineIdx;
        const line = str.substring(lineStart, lineEnd);
        
        // Fast path: skip empty lines
        if (line.length > 0) {
          // Fast trim: only trim if needed (check first/last char)
          const trimmed = line.charCodeAt(0) <= 32 || line.charCodeAt(line.length - 1) <= 32 
            ? line.trim() 
            : line;
          
          // CRITICAL: Validate line length before parsing
          // Short lines (< 10 chars) are likely incomplete/truncated
          // AND format should be at least 15 chars: "ST,+000138.3  g"
          if (trimmed.length >= minLengthForCompleteData) {
            const parsed = parseWeightSmartLocal(trimmed);
            if (parsed) {
              if (DEBUG_SCALE) console.log(`✅ Parsed: ${parsed.weight}g (${parsed.weight/1000}kg), stable: ${parsed.stable}, raw: "${trimmed}"`);
              finalize(true, parsed);
              return;
            }
          } else if (trimmed.length > 0 && trimmed.length < minLengthForCompleteData) {
            // Line is too short - likely truncated, wait for more data
            if (DEBUG_SCALE) console.log(`⏳ Waiting for more data - line too short (${trimmed.length} chars): "${trimmed}"`);
            // Don't parse yet, wait for more data
          }
        }
        
        // Move to next line
        lineStart = newlineIdx + 1;
        newlineIdx = str.indexOf('\n', lineStart);
      }
      
      // Keep incomplete line in buffer (convert back to Buffer for remaining part)
      if (lineStart > 0) {
        rawBuffer = Buffer.from(str.substring(lineStart), 'ascii');
      }
      
      // CRITICAL: If we have data without newline, only parse if it's long enough
      // This prevents parsing truncated data like "8.3  g" from "ST,+000138.3  g"
      if (rawBuffer.length >= minLengthForCompleteData && str.length >= minLengthForCompleteData && newlineIdx === -1) {
        const trimmed = str.trim();
        // CRITICAL: Only parse if line is long enough and looks complete
        // Check if it has expected format (ST, or US, prefix, or at least 15 chars)
        const looksComplete = trimmed.length >= minLengthForCompleteData && 
                             (trimmed.match(/^(ST|US)[,:]/) || trimmed.length >= 20);
        if (looksComplete) {
          const parsed = parseWeightSmartLocal(trimmed);
          if (parsed) {
            if (DEBUG_SCALE) console.log(`✅ Parsed (no newline): ${parsed.weight}g (${parsed.weight/1000}kg), raw: "${trimmed}"`);
            finalize(true, parsed);
            return;
          }
        } else {
          // Data looks incomplete, wait a bit more
          if (DEBUG_SCALE) console.log(`⏳ Waiting for more data - incomplete (${trimmed.length} chars): "${trimmed}"`);
        }
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
      // Minimal logging: commented out to reduce console spam
      // console.log('⏳ Waiting for data from existing port...');
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
        
        // IMPORTANT: Only set DTR/RTS if explicitly enabled in config
        // Many scales (especially Prolific, 2400 baud) will reset or turn off when DTR/RTS is enabled
        if (scaleConfig.assertDTR || scaleConfig.assertRTS) {
          try {
            port.set({ 
              dtr: scaleConfig.assertDTR || false, 
              rts: scaleConfig.assertRTS || false 
            });
            if (DEBUG_SCALE) console.log(`✅ DTR/RTS set: DTR=${scaleConfig.assertDTR}, RTS=${scaleConfig.assertRTS}`);
          } catch (setErr) {
            console.warn('⚠️  Failed to set DTR/RTS:', setErr.message);
          }
        } else {
          // Ensure DTR/RTS are explicitly disabled (some drivers enable by default)
          try {
            port.set({ dtr: false, rts: false });
            if (DEBUG_SCALE) console.log('✅ DTR/RTS explicitly disabled (scale may reset if enabled)');
          } catch (setErr) {
            // Ignore if already disabled
          }
        }
        
        // Optimized: send single poll command (P\r is usually sufficient and faster)
        // Multiple writes can cause delays, single write is more efficient
        try {
          if (port && port.isOpen) {
            port.write('P\r'); // Single command reduces latency
          }
        } catch (writeErr) {
          // Ignore write errors - port might be closing or not ready
          // Don't log as warning to avoid spam, only debug if enabled
          if (DEBUG_SCALE) console.debug('Poll write error (ignored):', writeErr.message);
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


// Printer XP420 Configuration
const printerConfig = {
  enabled: process.env.PRINTER_ENABLED === 'true' || true,
  type: 'usb', // USB connection
  port: process.env.PRINTER_PORT || 'Xprinter XP-420B', // Xprinter XP-420B as the actual printer name (with space)
  model: 'XP420',
  paperWidth: 100, // mm
  paperHeight: 72, // mm
  format: process.env.PRINTER_FORMAT || 'ZPL' // ZPL only (Xprinter XP-420 compatible)
};

// Function to normalize printer port path (Windows)
function normalizePrinterPort(port) {
  if (process.platform === 'win32') {
    // Windows: For named printers, use the exact name
    // For USB/COM/LPT ports, return as is
    if (port.toUpperCase().startsWith('COM') || port.toUpperCase().startsWith('LPT')) {
      return port;
    }
    // For printer names, return exact name (case-sensitive in some cases)
    return port;
  }
  return port;
}

// Helper function to find printer by name or port
function findPrinterInfo(printerName, callback) {
  if (process.platform !== 'win32') {
    return callback(null, { name: printerName, port: printerName });
  }
  
  const { exec } = require('child_process');
  
  // First, try to find by port name (USB006, USB001, etc.)
  // This is more reliable if we have the port name
  const portMatch = printerName.match(/(USB\d+|COM\d+|LPT\d+)/i);
  if (portMatch) {
    const portToSearch = portMatch[1].toUpperCase();
    const psCommandByPort = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Where-Object { $_.PortName -eq '${portToSearch}' } | Select-Object Name, PortName | ConvertTo-Json -Compress"`;
    
    exec(psCommandByPort, { timeout: 5000 }, (error, stdout) => {
      if (!error && stdout && stdout.trim() && stdout.trim() !== 'null') {
        try {
          const printers = JSON.parse(stdout.trim());
          const printerList = Array.isArray(printers) ? printers : [printers];
          if (printerList.length > 0 && printerList[0].Name) {
            return callback(null, {
              name: printerList[0].Name,
              port: printerList[0].PortName || portToSearch
            });
          }
        } catch (e) {
          // Fall through
        }
      }
      
      // Try WMIC by port
      exec('wmic printer get name,portname /format:list', { timeout: 5000 }, (wmicError, wmicStdout) => {
        if (!wmicError && wmicStdout) {
          const lines = wmicStdout.split(/\r?\n/);
          let currentPrinter = {};
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('Name=')) {
              if (currentPrinter.name && currentPrinter.port && currentPrinter.port.toUpperCase() === portToSearch) {
                return callback(null, {
                  name: currentPrinter.name,
                  port: currentPrinter.port
                });
              }
              currentPrinter = { name: trimmed.substring(5).trim() };
            } else if (trimmed.startsWith('PortName=')) {
              currentPrinter.port = trimmed.substring(9).trim();
            }
          }
          
          // Check last printer
          if (currentPrinter.name && currentPrinter.port && currentPrinter.port.toUpperCase() === portToSearch) {
            return callback(null, {
              name: currentPrinter.name,
              port: currentPrinter.port
            });
          }
        }
        
        // Try by name
        tryFindByName();
      });
    });
    
    return;
  }
  
  // Try by name
  function tryFindByName() {
    const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Select-Object Name, PortName | ConvertTo-Json -Compress"`;
    
    exec(psCommand, { timeout: 5000 }, (error, stdout) => {
      if (!error && stdout && stdout.trim() && stdout.trim() !== 'null') {
        try {
          const printers = JSON.parse(stdout.trim());
          const printerList = Array.isArray(printers) ? printers : [printers];
          if (printerList.length > 0) {
            const found = printerList.find(p => 
              p.Name && (
                p.Name.toLowerCase().includes(printerName.toLowerCase()) ||
                printerName.toLowerCase().includes(p.Name.toLowerCase())
              )
            ) || printerList[0];
            
            return callback(null, {
              name: found.Name || printerName,
              port: found.PortName || found.Name || printerName
            });
          }
        } catch (e) {
          // Fall through to WMIC
        }
      }
      
      // Fallback to WMIC
      exec('wmic printer get name,portname /format:list', { timeout: 5000 }, (wmicError, wmicStdout) => {
        if (!wmicError && wmicStdout) {
          const lines = wmicStdout.split(/\r?\n/);
          let currentPrinter = {};
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('Name=')) {
              if (currentPrinter.name) {
                const name = currentPrinter.name.toLowerCase();
                const search = printerName.toLowerCase();
                if (name.includes(search) || search.includes(name)) {
                  return callback(null, {
                    name: currentPrinter.name,
                    port: currentPrinter.port || currentPrinter.name
                  });
                }
              }
              currentPrinter = { name: trimmed.substring(5).trim() };
            } else if (trimmed.startsWith('PortName=')) {
              currentPrinter.port = trimmed.substring(9).trim();
            }
          }
          
          if (currentPrinter.name) {
            const name = currentPrinter.name.toLowerCase();
            const search = printerName.toLowerCase();
            if (name.includes(search) || search.includes(name)) {
              return callback(null, {
                name: currentPrinter.name,
                port: currentPrinter.port || currentPrinter.name
              });
            }
          }
        }
        
        // If nothing found, return original name
        callback(null, { name: printerName, port: printerName });
      });
    });
  }
  
  tryFindByName();
}

// Function to send data to XP420 printer via USB (Windows)
// Network TCP/IP printing function (port 9100)
// Sends ZPL commands directly to printer via TCP socket
async function printZPL_Network(zplData, printerIP, port = 9100) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    
    console.log(`🌐 Sending ZPL to network printer ${printerIP}:${port}...`);
    console.log(`   Data size: ${zplData.length} bytes`);
    
    const socket = new net.Socket();
    let connected = false;
    let dataSent = false;
    
    const timeout = setTimeout(() => {
      if (!connected || !dataSent) {
        socket.destroy();
        reject(new Error(`Network printer connection timeout after 10 seconds`));
      }
    }, 10000);
    
    socket.connect(port, printerIP, () => {
      connected = true;
      console.log(`✅ Connected to ${printerIP}:${port}`);
      
      // Send ZPL data as UTF-8 text
      socket.write(zplData, 'utf8', () => {
        dataSent = true;
        console.log(`✅ ZPL data sent (${zplData.length} bytes)`);
        clearTimeout(timeout);
        socket.end();
        resolve({
          success: true,
          method: 'network-tcp',
          address: `${printerIP}:${port}`,
          message: `ZPL sent successfully to network printer ${printerIP}:${port}`
        });
      });
    });
    
    socket.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`❌ Network printer error: ${error.message}`);
      reject(new Error(`Network printer connection failed: ${error.message}`));
    });
    
    socket.on('close', () => {
      if (connected && dataSent) {
        console.log(`✅ Network connection closed after sending data`);
      }
    });
  });
}

// COM Serial port printing function
// Sends ZPL commands via serial port (USB/RS232)
async function printZPL_Serial(zplData, comPort, baudRate = 9600) {
  return new Promise((resolve, reject) => {
    if (!SerialPortLib) {
      reject(new Error('SerialPort module not available'));
      return;
    }
    
    const { SerialPort } = SerialPortLib;
    
    console.log(`🔌 Sending ZPL to serial printer ${comPort} at ${baudRate} baud...`);
    console.log(`   Data size: ${zplData.length} bytes`);
    
    const port = new SerialPort({
      path: comPort,
      baudRate: baudRate,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      autoOpen: false
    });
    
    let dataSent = false;
    const timeout = setTimeout(() => {
      if (!dataSent) {
        port.close();
        reject(new Error(`Serial printer timeout after 10 seconds`));
      }
    }, 10000);
    
    port.on('open', () => {
      console.log(`✅ Serial port ${comPort} opened`);
      
      // Send ZPL data as buffer
      port.write(zplData, 'utf8', (error) => {
        if (error) {
          clearTimeout(timeout);
          port.close();
          reject(new Error(`Failed to write to serial port: ${error.message}`));
          return;
        }
        
        dataSent = true;
        console.log(`✅ ZPL data sent to serial port (${zplData.length} bytes)`);
        
        // Wait a bit for data to be sent, then close
        setTimeout(() => {
          clearTimeout(timeout);
          port.close();
          resolve({
            success: true,
            method: 'serial-com',
            port: comPort,
            baudRate: baudRate,
            message: `ZPL sent successfully to serial printer ${comPort}`
          });
        }, 500);
      });
    });
    
    port.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`❌ Serial port error: ${error.message}`);
      reject(new Error(`Serial port error: ${error.message}`));
    });
  });
}

// Windows RAW printing function (enhanced existing function)
async function sendToPrinterXP420_USB(receiptData, printerPort = null) {
  return new Promise((resolve, reject) => {
    try {
      const { exec, spawn } = require('child_process');
      const os = require('os');
      const port = printerPort || printerConfig.port;
      
      // Log receipt data info for debugging
      console.log(`🖨️  Sending receipt to XP420 printer...`);
      console.log(`   Port: ${port}`);
      console.log(`   Data size: ${receiptData.length} bytes`);
      console.log(`   First 50 chars: ${receiptData.substring(0, 50).replace(/\r/g, '\\r').replace(/\n/g, '\\n')}...`);
      
      // Create temp file for receipt data
      const tempFile = path.join(uploadsDir, `receipt_${Date.now()}.prn`);
      
      // Write receipt data to temp file (use utf8 encoding for text-based thermal printer)
      // Note: For thermal printers, we use plain text format, not binary
      fs.writeFileSync(tempFile, receiptData, 'utf8');
      console.log(`   Temp file created: ${tempFile}`);
      console.log(`   Temp file size: ${fs.statSync(tempFile).size} bytes`);
      
      const cleanup = () => {
        setTimeout(() => {
          if (fs.existsSync(tempFile)) {
            try {
              fs.unlinkSync(tempFile);
              console.log(`   Temp file deleted: ${tempFile}`);
            } catch (e) {
              console.warn('⚠️  Could not delete temp file:', e.message);
            }
          }
        }, 5000);
      };
      
      if (os.platform() === 'win32') {
        // Windows: Use RawPrinterHelper approach (similar to Win32 apps)
        // First, try to find the correct printer name and port
        findPrinterInfo(port, (err, printerInfo) => {
          if (err) {
            console.warn(`   Could not find printer info: ${err.message}`);
          }
          
          const printerName = printerInfo.name;
          const printerPort = printerInfo.port;
          
          console.log(`   Target printer: "${printerName}"`);
          console.log(`   Printer port: "${printerPort}"`);
          console.log(`   Data size: ${receiptData.length} bytes`);
          
          // CRITICAL: Warn if printer might not support ZPL format
          const printerNameLower = (printerName || '').toLowerCase();
          const nonZPLKeywords = ['epson l', 'epson ecotank', 'inkjet', 'canon', 'hp deskjet', 'hp inkjet'];
          if (nonZPLKeywords.some(keyword => printerNameLower.includes(keyword))) {
            console.warn(`⚠️  WARNING: Printer "${printerName}" mungkin tidak mendukung ZPL format!`);
            console.warn(`   ZPL (Zebra Programming Language) hanya didukung oleh thermal label printer.`);
            console.warn(`   Printer yang kompatibel: Xprinter, Zebra, TSC, Godex, Argox, Brady, dll.`);
            console.warn(`   Data akan dikirim, tapi printer mungkin tidak akan mencetak dengan benar.`);
          }
          
          // Method 1: Use Windows Print API directly (most reliable, same as Win32 apps)
          console.log(`   Method 1: Windows Print API (Win32 RawPrinterHelper)...`);
          
          // Create PowerShell script for Windows Print API
          const psScriptFile = path.join(uploadsDir, `print_script_${Date.now()}.ps1`);
          // Escape printer name and port for PowerShell
          const escapedPrinterName = printerName.replace(/"/g, '`"').replace(/\$/g, '`$');
          const escapedPrinterPort = (printerPort || printerName).replace(/"/g, '`"').replace(/\$/g, '`$');
          const escapedFilePath = tempFile.replace(/\\/g, '\\\\').replace(/\$/g, '`$');
          // Use EXACT same PowerShell script from successful printer_command_nodejs implementation
          const psScript = `
$ErrorActionPreference = "Stop"
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.ComponentModel;

public class RawPrinter {
  [DllImport("winspool.drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    
  [DllImport("winspool.drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    
  [DllImport("winspool.drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    
  [DllImport("winspool.drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    
  [DllImport("winspool.drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    
  [DllImport("winspool.drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    
  [DllImport("winspool.drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
  
  [DllImport("kernel32.dll")]
  public static extern uint GetLastError();
  
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  
  public static string SendRawData(string printerName, string data, out bool success) {
    IntPtr hPrinter = IntPtr.Zero;
    success = false;
    string errorMsg = "";
    
    try {
      if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
        uint error = GetLastError();
        errorMsg = "OpenPrinter failed. Error code: " + error + ". Printer name: '" + printerName + "'";
        return errorMsg;
      }
      
      DOCINFOA di = new DOCINFOA();
      di.pDocName = "ZPL Label";
      di.pDataType = "RAW";
      
      if (!StartDocPrinter(hPrinter, 1, di)) {
        uint error = GetLastError();
        ClosePrinter(hPrinter);
        errorMsg = "StartDocPrinter failed. Error code: " + error;
        return errorMsg;
      }
      
      if (!StartPagePrinter(hPrinter)) {
        uint error = GetLastError();
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        errorMsg = "StartPagePrinter failed. Error code: " + error;
        return errorMsg;
      }
      
      byte[] bytes = Encoding.UTF8.GetBytes(data);
      IntPtr pBytes = Marshal.AllocHGlobal(bytes.Length);
      Marshal.Copy(bytes, 0, pBytes, bytes.Length);
      
      int dwWritten = 0;
      bool result = WritePrinter(hPrinter, pBytes, bytes.Length, out dwWritten);
      
      Marshal.FreeHGlobal(pBytes);
      
      if (!result) {
        uint error = GetLastError();
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        errorMsg = "WritePrinter failed. Error code: " + error + ". Bytes written: " + dwWritten;
        return errorMsg;
      }
      
      EndPagePrinter(hPrinter);
      EndDocPrinter(hPrinter);
      ClosePrinter(hPrinter);
      
      success = true;
      return "Success. Bytes written: " + dwWritten;
    } catch (Exception ex) {
      if (hPrinter != IntPtr.Zero) {
        ClosePrinter(hPrinter);
      }
      errorMsg = "Exception: " + ex.Message;
      return errorMsg;
    }
  }
}
"@

$printerName = '${escapedPrinterName}';
$filePath = "${escapedFilePath}";

if (-not (Test-Path $filePath)) {
  Write-Error "File not found: $filePath"
  exit 1
}

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8);
$success = $false
$result = [RawPrinter]::SendRawData($printerName, $content, [ref]$success)

if ($success) {
  Write-Output $result
  exit 0
} else {
  Write-Error $result
  exit 1
}
`;
        
        // Write PowerShell script to file
        fs.writeFileSync(psScriptFile, psScript, 'utf8');
        
        const psPrintCommand = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptFile}"`;
        console.log(`   Executing: ${psPrintCommand}`);
        
        exec(psPrintCommand, { timeout: 15000, windowsHide: false }, (psWinError, psWinStdout, psWinStderr) => {
          // Cleanup script file
          setTimeout(() => {
            if (fs.existsSync(psScriptFile)) {
              try {
                fs.unlinkSync(psScriptFile);
              } catch (e) {
                console.warn('⚠️  Could not delete script file:', e.message);
              }
            }
          }, 2000);
          
          console.log(`   PowerShell output: ${psWinStdout ? psWinStdout.trim() : '(empty)'}`);
          console.log(`   PowerShell stderr: ${psWinStderr ? psWinStderr.trim() : '(empty)'}`);
          
          // Success check: exit code 0 (no error) and has success message
          if (!psWinError && psWinStdout && psWinStdout.toLowerCase().includes('success')) {
            console.log(`✅ Method 1 SUCCESS: Receipt sent via Windows Print API (RawPrinter)`);
            console.log(`   Output: ${psWinStdout.trim()}`);
            cleanup();
            resolve({ 
              success: true, 
              method: 'win32-raw-printer-api', 
              port: printerName,
              message: 'Receipt sent successfully via Windows RAW Print API (exact same method as printer_command_nodejs)',
              details: psWinStdout.trim()
            });
            return;
          }
          
          console.log(`   Method 1 failed: ${psWinError ? psWinError.message : 'No success message in output'}`);
          if (psWinStderr) {
            console.log(`   Error details: ${psWinStderr.trim()}`);
          }
          
          // Method 2: Try using Windows Print Spooler API with port
          console.log(`   Method 2: Trying Windows Print Spooler API with printer name "${printerName}"...`);
          
          // Use print command which properly queues the job
          const printCommand = printerName 
            ? `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${tempFile.replace(/\\/g, '\\\\').replace(/'/g, "''")}' -Raw -Encoding Byte | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`
            : null;
          
          if (printCommand) {
            exec(printCommand, { timeout: 15000, windowsHide: false }, (error, stdout, stderr) => {
              if (!error) {
                console.log(`✅ Method 2 SUCCESS: Print job queued via Out-Printer`);
                console.log(`   stdout: ${stdout ? stdout.trim() : '(empty)'}`);
                
                setTimeout(() => {
                  cleanup();
                  resolve({ 
                    success: true, 
                    method: 'powershell-out-printer', 
                    port: printerName,
                    message: `Receipt sent via PowerShell Out-Printer (proper print queue)`
                  });
                }, 500);
                return;
              }
              
              console.log(`   Method 2 failed: ${error.message}`);
              console.log(`   stdout: ${stdout ? stdout.trim() : '(empty)'}`);
              console.log(`   stderr: ${stderr ? stderr.trim() : '(empty)'}`);
              
              // Method 3: Try copy command to port (last resort)
              console.log(`   Method 3: Trying copy /b command to port "${printerPort}" as fallback...`);
              const copyCommand = `copy /b "${tempFile}" "${printerPort}"`;
              console.log(`   Command: ${copyCommand}`);
              
              exec(copyCommand, { timeout: 10000, windowsHide: false }, (copyError, copyStdout, copyStderr) => {
                if (!copyError && copyStdout && copyStdout.includes('copied')) {
                  console.log(`✅ Method 3 SUCCESS: copy command to port "${printerPort}" executed`);
                  console.log(`   Note: Data sent to port. If printer doesn't print, it may need proper print queue.`);
                  console.log(`   stdout: ${copyStdout ? copyStdout.trim() : '(empty)'}`);
                  
                  setTimeout(() => {
                    cleanup();
                    resolve({ 
                      success: true, 
                      method: 'copy-command-port', 
                      port: printerPort,
                      message: `Receipt sent via copy command to port ${printerPort} (may not print - printer may need proper queue)`,
                      stdout: copyStdout ? copyStdout.trim() : '',
                      stderr: copyStderr ? copyStderr.trim() : ''
                    });
                  }, 500);
                  return;
                }
                
                console.log(`   Method 3 failed: ${copyError ? copyError.message : 'No success output'}`);
                
                // Method 4: Final fallback - direct write
                console.log(`   Method 4: Trying direct file write stream as final fallback...`);
                try {
                  const targetPort = printerPort || printerName;
                  const writeStream = fs.createWriteStream(targetPort, { flags: 'w' });
                  writeStream.write(receiptData, 'binary');
                  writeStream.end();
                  
                  writeStream.on('finish', () => {
                    console.log(`✅ Method 4 SUCCESS: Receipt sent via direct write stream to ${targetPort}`);
                    cleanup();
                    resolve({ 
                      success: true, 
                      method: 'direct-write-stream', 
                      port: targetPort,
                      message: `Receipt sent via direct write stream (may not print - printer may need proper queue)`
                    });
                  });
                  
                  writeStream.on('error', (writeError) => {
                    console.log(`   Method 4 failed: ${writeError.message}`);
                    cleanup();
                    reject(new Error(
                      `All printing methods failed for printer "${printerName}" (port: ${printerPort}).\n\n` +
                      `Tried methods:\n` +
                      `1. Windows Print API (Win32) - Error 1801 (Invalid printer name)\n` +
                      `2. PowerShell Out-Printer (print queue)\n` +
                      `3. copy /b command to port\n` +
                      `4. Direct file write stream\n\n` +
                      `Last error: ${writeError.message}\n\n` +
                      `Troubleshooting:\n` +
                      `1. Run: GET /api/print/list-printers to see exact printer names\n` +
                      `2. Check printer is online: Control Panel > Devices and Printers\n` +
                      `3. Check printer queue for stuck jobs\n` +
                      `4. Try running application as Administrator\n` +
                      `5. Verify printer accepts RAW data (not PCL/PostScript)\n` +
                      `6. Check printer port in printer properties`
                    ));
                  });
                } catch (writeError) {
                  console.log(`   Direct write failed immediately: ${writeError.message}`);
                  cleanup();
                  reject(new Error(`All printing methods failed. Last error: ${writeError.message}`));
                }
              });
            });
          } else {
            // No printer name, skip to Method 3
            console.log(`   Method 2 skipped: No valid printer name`);
            
            console.log(`   Method 3: Trying copy /b command to port "${printerPort}"...`);
            const copyCommand = `copy /b "${tempFile}" "${printerPort}"`;
            
            exec(copyCommand, { timeout: 10000, windowsHide: false }, (copyError, copyStdout, copyStderr) => {
              if (!copyError && copyStdout && copyStdout.includes('copied')) {
                console.log(`✅ Method 3 SUCCESS: copy command to port "${printerPort}" executed`);
                setTimeout(() => {
                  cleanup();
                  resolve({ 
                    success: true, 
                    method: 'copy-command-port', 
                    port: printerPort,
                    message: `Receipt sent via copy command to port ${printerPort}`
                  });
                }, 500);
                return;
              }
              
              cleanup();
              reject(new Error(`All printing methods failed. Last error: ${copyError ? copyError.message : 'Unknown'}`));
            });
          }
        });
        });
      } else {
        // Linux/Mac: Use lp or lpr command
        const printCmd = port && port !== 'Xprinter XP-420B' 
          ? `lp -d "${port}" "${tempFile}"`
          : `lp "${tempFile}"`;
        
        exec(printCmd, (error) => {
          setTimeout(() => {
            if (fs.existsSync(tempFile)) {
              try {
                fs.unlinkSync(tempFile);
              } catch (e) {
                console.warn('⚠️  Could not delete temp file:', e.message);
              }
            }
          }, 3000);
          
          if (error) {
            reject(new Error(`Failed to print: ${error.message}`));
          } else {
            console.log('✅ Receipt sent to printer via lp command');
            resolve({ 
              success: true, 
              method: 'lp-command', 
              port,
              message: 'Receipt sent successfully'
            });
          }
        });
      }
    } catch (error) {
      reject(new Error(`Printer error: ${error.message}`));
    }
  });
}

// Endpoint to send receipt to printer (supports multiple methods: Windows RAW, Network TCP/IP, COM Serial)
// Optimized: Returns immediately and processes print in background for faster response
app.post('/api/print/send-to-xp420', async (req, res) => {
  try {
    const { 
      receipt, 
      receiptBase64, 
      printerPort, 
      printMethod = 'windows-raw', // 'windows-raw', 'network-tcp', 'serial-com'
      printerIP, // For network method: e.g., '192.168.1.100'
      networkPort = 9100, // For network method: default 9100
      comPort, // For serial method: e.g., 'COM3'
      baudRate = 9600, // For serial method: default 9600
      async = true // New parameter: if true, return immediately and process in background
    } = req.body;

    if (!receipt && !receiptBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing receipt data',
        required: ['receipt or receiptBase64']
      });
    }

    // Convert receipt data
    let receiptData = receipt;
    if (receiptBase64 && !receiptData) {
      try {
        // Use utf8 for text-based thermal printer format (ZPL commands)
        receiptData = Buffer.from(receiptBase64, 'base64').toString('utf8');
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid receiptBase64 data'
        });
      }
    }

    if (!receiptData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid receipt data format'
      });
    }

    console.log(`🖨️  Sending ZPL receipt to printer...`);
    console.log(`   Method: ${printMethod}`);
    console.log(`   Data size: ${receiptData.length} bytes`);
    console.log(`   Async mode: ${async !== false ? 'enabled (fast)' : 'disabled (wait for completion)'}`);

    // If async mode, return immediately and process print in background
    if (async !== false) {
      // Return immediate response
      res.json({
        success: true,
        message: 'Print job queued successfully',
        method: printMethod,
        async: true,
        status: 'processing'
      });

      // Process print in background (fire-and-forget)
      setImmediate(async () => {
        try {
          let result;
          switch (printMethod) {
            case 'network-tcp':
              if (!printerIP) {
                console.error('❌ Missing printerIP for network method');
                return;
              }
              console.log(`   [Background] Network printer: ${printerIP}:${networkPort}`);
              result = await printZPL_Network(receiptData, printerIP, networkPort);
              break;
              
            case 'serial-com':
              if (!comPort) {
                console.error('❌ Missing comPort for serial method');
                return;
              }
              console.log(`   [Background] Serial printer: ${comPort} at ${baudRate} baud`);
              result = await printZPL_Serial(receiptData, comPort, baudRate);
              break;
              
            case 'windows-raw':
            default:
    const port = printerPort || printerConfig.port;
              console.log(`   [Background] Windows printer: ${port}`);
              result = await sendToPrinterXP420_USB(receiptData, port);
              break;
          }
          console.log(`✅ [Background] Print job completed: ${result.message || 'Success'}`);
        } catch (error) {
          console.error(`❌ [Background] Print job failed: ${error.message}`);
          // Error is logged but not sent to client since response already sent
        }
      });

      return; // Exit early, print processing continues in background
    }

    // Synchronous mode: wait for print to complete (original behavior)
    let result;
    try {
      switch (printMethod) {
        case 'network-tcp':
          if (!printerIP) {
            return res.status(400).json({
              success: false,
              error: 'Missing printerIP for network method',
              required: ['printerIP']
            });
          }
          console.log(`   Network printer: ${printerIP}:${networkPort}`);
          result = await printZPL_Network(receiptData, printerIP, networkPort);
          break;
          
        case 'serial-com':
          if (!comPort) {
            return res.status(400).json({
              success: false,
              error: 'Missing comPort for serial method',
              required: ['comPort']
            });
          }
          console.log(`   Serial printer: ${comPort} at ${baudRate} baud`);
          result = await printZPL_Serial(receiptData, comPort, baudRate);
          break;
          
        case 'windows-raw':
        default:
    // Get printer port from request or use default
    const port = printerPort || printerConfig.port;
          console.log(`   Windows printer: ${port}`);
    console.log(`   IMPORTANT: If printer doesn't print, verify the correct printer name.`);
    console.log(`   Use GET /api/print/list-printers to see all available printers.`);
      result = await sendToPrinterXP420_USB(receiptData, port);
          break;
      }
    } catch (error) {
      // If sending fails, provide helpful error message
      console.error(`❌ Failed to send to printer: ${error.message}`);
      
      // Determine tried connection info based on method
      let triedConnection = {};
      switch (printMethod) {
        case 'network-tcp':
          triedConnection = { method: 'network-tcp', address: `${printerIP}:${networkPort}` };
          break;
        case 'serial-com':
          triedConnection = { method: 'serial-com', port: comPort, baudRate: baudRate };
          break;
        default:
          triedConnection = { method: 'windows-raw', printerPort: printerPort || printerConfig.port };
      }
      
      // Try to get list of printers to help user (for Windows RAW method)
      if (printMethod === 'windows-raw') {
      try {
        const { exec } = require('child_process');
        const os = require('os');
        
        return new Promise((resolve) => {
          if (os.platform() === 'win32') {
            exec('wmic printer get name /format:list', { timeout: 5000 }, (err, stdout) => {
              const printerNames = stdout.split('\n')
                .filter(line => line.trim().startsWith('Name='))
                .map(line => line.substring(5).trim())
                .filter(Boolean);
              
              res.status(500).json({
                success: false,
                error: 'Failed to send to printer',
                details: error.message,
                  triedConnection: triedConnection,
                availablePrinters: printerNames.length > 0 ? printerNames : undefined,
                suggestion: printerNames.length > 0 
                  ? `Available printers: ${printerNames.join(', ')}. Try using one of these names.`
                  : 'Use GET /api/print/list-printers to see available printers.'
              });
              resolve();
            });
          } else {
            res.status(500).json({
              success: false,
              error: 'Failed to send to printer',
              details: error.message,
                triedConnection: triedConnection
            });
            resolve();
          }
        });
      } catch (listError) {
        res.status(500).json({
          success: false,
          error: 'Failed to send to printer',
          details: error.message,
            triedConnection: triedConnection,
            hint: 'Check printer connection. Use GET /api/print/list-printers to verify (Windows RAW method).'
          });
          return;
        }
      } else {
        // For network or serial methods, return error directly
        res.status(500).json({
          success: false,
          error: 'Failed to send to printer',
          details: error.message,
          triedConnection: triedConnection,
          hint: printMethod === 'network-tcp' 
            ? 'Check printer IP address and network connection. Ensure printer is on port 9100.'
            : 'Check COM port and baud rate. Ensure serial port is available and not in use.'
        });
        return;
      }
    }

    res.json({
      success: true,
      message: result.message || 'Receipt sent to printer successfully',
      method: result.method || printMethod,
      printer: 'XP420',
      ...result
    });

  } catch (error) {
    console.error('❌ Error sending to XP420 printer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send to printer',
      details: error.message
    });
  }
});

// Endpoint to list available printers (Windows)
app.get('/api/print/list-printers', async (req, res) => {
  try {
    const os = require('os');
    const { exec } = require('child_process');
    
    if (os.platform() === 'win32') {
      // Use PowerShell to list printers with better error handling
      const command = 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json -Compress"';
      
      exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
        if (error || !stdout || stdout.trim() === '') {
          // Fallback: Try wmic command
          exec('wmic printer get name,portname,printerstatus /format:list', { timeout: 10000 }, (wmicError, wmicStdout) => {
            if (wmicError || !wmicStdout) {
              return res.status(500).json({
                success: false,
                error: 'Failed to list printers',
                details: wmicError ? wmicError.message : 'No output from wmic'
              });
            }
            
            // Parse wmic output
            const printers = [];
            const lines = wmicStdout.split(/\r?\n/);
            let currentPrinter = {};
            
            lines.forEach(line => {
              const trimmed = line.trim();
              if (trimmed.startsWith('Name=')) {
                if (currentPrinter.name) printers.push(currentPrinter);
                currentPrinter = { name: trimmed.substring(5).trim() };
              } else if (trimmed.startsWith('PortName=')) {
                currentPrinter.port = trimmed.substring(9).trim();
              } else if (trimmed.startsWith('PrinterStatus=')) {
                currentPrinter.status = trimmed.substring(14).trim();
              }
            });
            if (currentPrinter.name) printers.push(currentPrinter);
            
            res.json({
              success: true,
              printers: printers,
              method: 'wmic',
              total: printers.length
            });
          });
          return;
        }
        
        try {
          const output = stdout.trim();
          if (!output || output === 'null') {
            // Try wmic as fallback
            exec('wmic printer get name,portname /format:list', { timeout: 10000 }, (wmicError, wmicStdout) => {
              if (wmicError) {
                return res.status(500).json({
                  success: false,
                  error: 'Failed to list printers',
                  details: 'Both PowerShell and WMIC failed'
                });
              }
              
              const printers = [];
              const lines = wmicStdout.split(/\r?\n/);
              let currentPrinter = {};
              
              lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('Name=')) {
                  if (currentPrinter.name) printers.push(currentPrinter);
                  currentPrinter = { name: trimmed.substring(5).trim() };
                } else if (trimmed.startsWith('PortName=')) {
                  currentPrinter.port = trimmed.substring(9).trim();
                }
              });
              if (currentPrinter.name) printers.push(currentPrinter);
              
              res.json({
                success: true,
                printers: printers,
                method: 'wmic-fallback',
                total: printers.length
              });
            });
            return;
          }
          
          const printers = JSON.parse(output);
          res.json({
            success: true,
            printers: Array.isArray(printers) ? printers : [printers],
            method: 'powershell',
            total: Array.isArray(printers) ? printers.length : 1
          });
        } catch (parseError) {
          res.status(500).json({
            success: false,
            error: 'Failed to parse printer list',
            details: parseError.message,
            rawOutput: stdout ? stdout.substring(0, 500) : '(empty)'
          });
        }
      });
    } else {
      // Linux/Mac: Use lpstat
      exec('lpstat -p -d', { timeout: 10000 }, (error, stdout) => {
        if (error) {
          return res.status(500).json({
            success: false,
            error: 'Failed to list printers',
            details: error.message
          });
        }
        
        const printers = stdout.split('\n')
          .filter(line => line.trim().startsWith('printer'))
          .map(line => {
            const match = line.match(/printer (.+?) is/);
            return match ? { name: match[1] } : null;
          })
          .filter(Boolean);
        
        res.json({
          success: true,
          printers: printers,
          method: 'lpstat'
        });
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list printers',
      details: error.message
    });
  }
});

// Endpoint to get printer configuration
app.get('/api/print/config', async (req, res) => {
  res.json({
    success: true,
    config: printerConfig,
    platform: process.platform,
    currentPort: printerConfig.port
  });
});

// Endpoint to update printer configuration
app.post('/api/print/config', async (req, res) => {
  try {
    const { enabled, port, format } = req.body;

    if (enabled !== undefined) printerConfig.enabled = enabled;
    if (port) printerConfig.port = port;
    if (format) {
      const validFormats = ['ZPL'];
      const upperFormat = format.toUpperCase();
      if (validFormats.includes(upperFormat)) {
        printerConfig.format = upperFormat;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid printer format',
          validFormats: validFormats,
          provided: format
        });
      }
    }

    res.json({
      success: true,
      message: 'Printer configuration updated',
      config: printerConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update printer configuration',
      details: error.message
    });
  }
});

// Auto-configure printer: detect available printers and communication methods
app.post('/api/print/auto-configure', async (req, res) => {
  try {
    const os = require('os');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const net = require('net');
    
    const results = {
      windowsPrinters: [],
      networkPrinters: [],
      serialPorts: [],
      recommended: null,
      detectedMethods: []
    };

    // 1. Detect Windows Printers (Windows RAW method)
    if (os.platform() === 'win32') {
      try {
        const command = 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json -Compress"';
        const { stdout } = await execAsync(command, { timeout: 10000 });
        
        if (stdout && stdout.trim() && stdout.trim() !== 'null') {
          try {
            const printers = JSON.parse(stdout.trim());
            const printerArray = Array.isArray(printers) ? printers : [printers];
            
            // Filter thermal label printers (common models)
            // CRITICAL: Only include Epson thermal printers, not all Epson printers (Epson L3210 is inkjet, not thermal)
            const thermalKeywords = ['xprinter', 'xp-420', 'thermal', 'label', 'zebra', 'zpl', 'tm-', 'epson tm-', 'epson thermal'];
            const excludeKeywords = ['epson l', 'epson ecotank', 'epson inkjet']; // Exclude non-thermal Epson printers
            const thermalPrinters = printerArray.filter(p => {
              if (!p || !p.Name) return false;
              const nameLower = p.Name.toLowerCase();
              // Exclude non-thermal printers first
              if (excludeKeywords.some(keyword => nameLower.includes(keyword))) {
                return false;
              }
              // Then check if it's a thermal printer
              return thermalKeywords.some(keyword => nameLower.includes(keyword));
            });
            
            // Prioritize Xprinter if available
            const xprinterPrinters = thermalPrinters.filter(p => {
              const nameLower = (p.Name || p.name || '').toLowerCase();
              return nameLower.includes('xprinter') || nameLower.includes('xp-420');
            });
            
            results.windowsPrinters = printerArray.map(p => ({
              name: p.Name || p.name,
              driver: p.DriverName || p.driverName,
              port: p.PortName || p.port,
              status: p.PrinterStatus || p.status,
              isThermal: thermalKeywords.some(k => (p.Name || p.name || '').toLowerCase().includes(k))
            }));
            
            // Recommend Xprinter first if available, otherwise first thermal printer
            if (xprinterPrinters.length > 0) {
              results.recommended = {
                method: 'windows-raw',
                printerName: xprinterPrinters[0].Name || xprinterPrinters[0].name,
                labelWidth: 72,  // Default thermal label size
                labelHeight: 100,
                labelDPI: 203
              };
              results.detectedMethods.push('windows-raw');
            } else if (thermalPrinters.length > 0) {
              results.recommended = {
                method: 'windows-raw',
                printerName: thermalPrinters[0].Name || thermalPrinters[0].name,
                labelWidth: 72,  // Default thermal label size
                labelHeight: 100,
                labelDPI: 203
              };
              results.detectedMethods.push('windows-raw');
            } else if (printerArray.length > 0) {
              results.recommended = {
                method: 'windows-raw',
                printerName: printerArray[0].Name || printerArray[0].name,
                labelWidth: 72,
                labelHeight: 100,
                labelDPI: 203
              };
              results.detectedMethods.push('windows-raw');
            }
          } catch (parseError) {
            console.warn('Failed to parse printer list:', parseError.message);
          }
        }
      } catch (error) {
        console.warn('Failed to detect Windows printers:', error.message);
      }
    }

    // 2. Detect Serial Ports (for Serial COM method)
    try {
      if (SerialPortLib) {
        const { SerialPort } = SerialPortLib;
        const ports = await SerialPort.list();
        const availablePorts = ports.filter(p => p.path && !p.path.includes('Bluetooth'));
        
        results.serialPorts = availablePorts.map(p => ({
          path: p.path,
          manufacturer: p.manufacturer || '',
          vendorId: p.vendorId || '',
          productId: p.productId || ''
        }));
        
        if (availablePorts.length > 0 && !results.recommended) {
          // Check if any port might be a printer (common printer vendor IDs)
          const printerVendorIds = ['04f9', '04e8', '04b8']; // Brother, Epson, etc.
          const printerPort = availablePorts.find(p => 
            printerVendorIds.some(vid => p.vendorId && p.vendorId.toLowerCase().includes(vid))
          );
          
          if (printerPort) {
            results.recommended = {
              method: 'serial-com',
              comPort: printerPort.path,
              baudRate: 9600,
              labelWidth: 72,
              labelHeight: 100,
              labelDPI: 203
            };
            results.detectedMethods.push('serial-com');
          } else if (availablePorts.length > 0) {
            // Recommend first available port as fallback
            results.recommended = {
              method: 'serial-com',
              comPort: availablePorts[0].path,
              baudRate: 9600,
              labelWidth: 72,
              labelHeight: 100,
              labelDPI: 203
            };
            results.detectedMethods.push('serial-com');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to detect serial ports:', error.message);
    }

    // 3. Detect Network Printers (Network TCP/IP method)
    // Try common IP ranges and port 9100
    const commonIPRanges = [
      '192.168.1.100',
      '192.168.1.101',
      '192.168.0.100',
      '192.168.0.101',
      '10.0.0.100',
      '172.16.0.100'
    ];
    
    const networkPort = 9100;
    const testTimeout = 2000; // 2 seconds per IP
    
    const networkTests = await Promise.allSettled(
      commonIPRanges.map(async (ip) => {
        return new Promise((resolve) => {
          const socket = new net.Socket();
          let resolved = false;
          
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              socket.destroy();
              resolve({ ip, reachable: false });
            }
          }, testTimeout);
          
          socket.connect(networkPort, ip, () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              socket.destroy();
              resolve({ ip, reachable: true, port: networkPort });
            }
          });
          
          socket.on('error', () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve({ ip, reachable: false });
            }
          });
        });
      })
    );
    
    const reachableIPs = networkTests
      .filter(result => result.status === 'fulfilled' && result.value.reachable)
      .map(result => result.value);
    
    if (reachableIPs.length > 0) {
      results.networkPrinters = reachableIPs;
      if (!results.recommended) {
        results.recommended = {
          method: 'network-tcp',
          printerIP: reachableIPs[0].ip,
          networkPort: networkPort,
          labelWidth: 72,
          labelHeight: 100,
          labelDPI: 203
        };
        results.detectedMethods.push('network-tcp');
      }
    }

    // If no recommendation yet, use default Windows RAW with default printer
    if (!results.recommended && os.platform() === 'win32') {
      results.recommended = {
        method: 'windows-raw',
        printerName: 'Xprinter XP-420B',
        labelWidth: 72,
        labelHeight: 100,
        labelDPI: 203
      };
      results.detectedMethods.push('windows-raw');
    }

    res.json({
      success: true,
      data: results,
      message: results.recommended 
        ? `Auto-configure berhasil. Direkomendasikan: ${results.recommended.method}`
        : 'Auto-configure selesai, tetapi tidak ada printer yang terdeteksi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to auto-configure printer',
      details: error.message
    });
  }
});

// Helper function to convert mm to dots (pixels) based on DPI
// Formula: dots = mm × (DPI / 25.4)
function mmToDots(mm, dpi = 203) {
  return Math.round(mm * (dpi / 25.4));
}

// Helper function to convert point size to dots based on DPI
function ptToDots(pt, dpi = 203) {
  return Math.round(pt * (dpi / 72));
}

const DEFAULT_LABEL_LAYOUT = {
  marginLeftMm: 5,
  marginTopMm: 5,
  sectionSpacingMm: 6,
  lineSpacingMm: 4,
  lineWidthMm: 62,
  lineThicknessDots: 2,
  headerFontPt: 28,
  labelFontPt: 14,
  valueFontPt: 16,
  weightFontPt: 26,
  footerFontPt: 12,
  rightColumnMarginMm: 20
};

// Helper function to generate receipt in ZPL format for thermal label printer
// Simplified ZPL format - TEXT ONLY (no QR code, no barcode)
// Based on SUCCESSFUL implementation from printer_command_nodejs
// CRITICAL FIXES:
// 1. Label size calculated precisely from mm @ DPI (e.g., 72x100mm @ 203 DPI = 575x799 dots)
// 2. Must include ^PO0 command for print orientation
// 3. Order: ^XA -> ^LL -> ^PW -> ^PO0 -> content -> ^XZ
// 4. Configurable label size (width, height, DPI) for flexibility
function generateZPLReceipt(data) {
  const {
    skuName,
    ingredientName,
    currentWeight,
    targetWeight,
    remainingWeight,
    operatorName,
    dateStr,
    timeStr,
    moNumber,
    sessionNumber,
    expDate,
    labelWidth,
    labelHeight,
    labelDPI,
    layout
  } = data;
  
  // Label specifications - use provided values or defaults (portrait: 72mm x 100mm)
  const DPI = labelDPI || 203;
  const widthMm = labelWidth || 72;
  const heightMm = labelHeight || 100;

  const toNumber = (value, fallback) => (typeof value === 'number' && !Number.isNaN(value) ? value : fallback);
  const layoutConfig = {
    ...DEFAULT_LABEL_LAYOUT,
    ...(layout || {})
  };

  const marginLeftMm = toNumber(layoutConfig.marginLeftMm, DEFAULT_LABEL_LAYOUT.marginLeftMm);
  const marginTopMm = toNumber(layoutConfig.marginTopMm, DEFAULT_LABEL_LAYOUT.marginTopMm);
  const sectionSpacingMm = toNumber(layoutConfig.sectionSpacingMm, DEFAULT_LABEL_LAYOUT.sectionSpacingMm);
  const lineSpacingMm = toNumber(layoutConfig.lineSpacingMm, DEFAULT_LABEL_LAYOUT.lineSpacingMm);
  const rawLineThickness = toNumber(layoutConfig.lineThicknessDots, DEFAULT_LABEL_LAYOUT.lineThicknessDots);
  const lineThicknessDots = Math.max(1, Math.round(rawLineThickness));
  const headerFontPt = toNumber(layoutConfig.headerFontPt, DEFAULT_LABEL_LAYOUT.headerFontPt);
  const labelFontPt = toNumber(layoutConfig.labelFontPt, DEFAULT_LABEL_LAYOUT.labelFontPt);
  const valueFontPt = toNumber(layoutConfig.valueFontPt, DEFAULT_LABEL_LAYOUT.valueFontPt);
  const weightFontPt = toNumber(layoutConfig.weightFontPt, DEFAULT_LABEL_LAYOUT.weightFontPt);
  const footerFontPt = toNumber(layoutConfig.footerFontPt, DEFAULT_LABEL_LAYOUT.footerFontPt);
  const rightColumnMarginMm = Math.max(0, toNumber(layoutConfig.rightColumnMarginMm, DEFAULT_LABEL_LAYOUT.rightColumnMarginMm));

  const maxLineWidthMm = Math.max(20, widthMm - marginLeftMm - 5);
  const requestedLineWidthMm = toNumber(layoutConfig.lineWidthMm, DEFAULT_LABEL_LAYOUT.lineWidthMm);
  const lineWidthMm = Math.max(20, Math.min(requestedLineWidthMm, maxLineWidthMm));
  
  // Escape special characters for ZPL
  const escapeZPL = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/\^/g, '^^')
      .replace(/~/g, '~~')
      .replace(/\\/g, '\\\\');
  };
  
  // Format weight values (targetWeight and remainingWeight removed from format)
  const currentWeightStr = parseFloat(currentWeight || 0).toFixed(2);
  
  // Build ZPL command string - SIMPLIFIED for guaranteed success
  let zpl = '';
  
  // Calculate EXACT label dimensions from mm and DPI
  const dotsPerMM = DPI / 25.4;
  const widthInDots = Math.round(widthMm * dotsPerMM);
  const heightInDots = Math.round(heightMm * dotsPerMM);
  
  const marginLeft = mmToDots(marginLeftMm, DPI);
  const marginTop = mmToDots(marginTopMm, DPI);
  const sectionSpacing = mmToDots(sectionSpacingMm, DPI);
  const lineSpacing = mmToDots(lineSpacingMm, DPI);
  const lineWidthDots = mmToDots(lineWidthMm, DPI);
  const headerFontDots = ptToDots(headerFontPt, DPI);
  const labelFontDots = ptToDots(labelFontPt, DPI);
  const valueFontDots = ptToDots(valueFontPt, DPI);
  const weightFontDots = ptToDots(weightFontPt, DPI);
  const footerFontDots = ptToDots(footerFontPt, DPI);
  const rightColumnX = Math.max(marginLeft, widthInDots - mmToDots(rightColumnMarginMm, DPI));
  
  // START ZPL - Critical: only ONE ^XA at start
  zpl += '^XA';
  
  // Set label width and length - dynamically calculated from mm and DPI
  // CRITICAL: Must use EXACT calculated values for printer compatibility
  zpl += `^LL${heightInDots}`;  // Label length (height) in dots
  zpl += `^PW${widthInDots}`;   // Print width in dots
  zpl += '^PO0';                 // Print orientation: normal (REQUIRED!)
  
  // Log label size for debugging
  console.log(`📏 Label size: ${widthMm}mm × ${heightMm}mm @ ${DPI} DPI = ${widthInDots} × ${heightInDots} dots`);
  
  let currentY = marginTop;

  const addText = (fontHeight, text, options = {}) => {
    const x = options.x !== undefined ? options.x : marginLeft;
    const spacing = options.spacing !== undefined ? options.spacing : lineSpacing;
    zpl += `^FO${x},${currentY}^A0N,${fontHeight},${fontHeight}^FD${escapeZPL(text)}^FS`;
    currentY += fontHeight + spacing;
  };

  const addLine = () => {
    zpl += `^FO${marginLeft},${currentY}^GB${lineWidthDots},${lineThicknessDots},${lineThicknessDots}^FS`;
    currentY += lineThicknessDots + sectionSpacing;
  };
  
  // === HEADER ===
  addText(headerFontDots, 'LABEL PENIMBANGAN', { spacing: lineSpacing });

  if (moNumber) {
    addText(labelFontDots, `MO: ${escapeZPL(moNumber)}`, { spacing: sectionSpacing });
  }

  addLine();
  
  // === SKU/PRODUCT ===
  addText(labelFontDots, 'SKU/PRODUK:', { spacing: lineSpacing });
  addText(valueFontDots, skuName, { spacing: sectionSpacing });
  
  // === INGREDIENT ===
  addText(labelFontDots, 'BAHAN:', { spacing: lineSpacing });
  addText(valueFontDots, ingredientName, { spacing: sectionSpacing });
  
  // Exp Date - if available
  if (expDate) {
    addText(labelFontDots, 'Exp Date:', { spacing: lineSpacing });
    addText(valueFontDots, escapeZPL(expDate), { spacing: sectionSpacing });
  }
  
  addLine();
  
  // === WEIGHT DATA ===
  addText(labelFontDots, 'Berat Saat Ini:', { spacing: lineSpacing });
  addText(weightFontDots, `${currentWeightStr} gram`, { spacing: sectionSpacing });
  
  // Session number - always display (shows which weighing number this is)
  // This indicates: Penimbangan ke-1, Penimbangan ke-2, etc.
  const sessionNum = data.sessionNumber || 1;
  addText(labelFontDots, `Penimbangan ke-${sessionNum}`, { spacing: sectionSpacing });
  
  addLine();
  
  // === FOOTER ===
  const footerY = currentY;
  addText(footerFontDots, `${dateStr} ${timeStr}`, { spacing: lineSpacing });
  
  if (operatorName) {
    zpl += `^FO${rightColumnX},${footerY}^A0N,${footerFontDots},${footerFontDots}^FDOp: ${escapeZPL(operatorName)}^FS`;
  }
  
  // END ZPL - Critical: only ONE ^XZ at end to stop printing
  zpl += '^XZ';
  
  return zpl;
}

// Alias functions for backward compatibility (all use ZPL now)
function generateTSPLReceipt(data) {
  return generateZPLReceipt(data);
}

function generateEPLReceipt(data) {
  return generateZPLReceipt(data);
}

function generateDPLReceipt(data) {
  return generateZPLReceipt(data);
}

// ESC/POS format removed as requested - using label formats only (TSPL/EPL/DPL/ZPL)

// Print receipt endpoint for 100mm x 72mm paper - supports ZPL format
// ZPL format compatible with thermal label printers (Xprinter XP-420, Zebra, etc.)
app.post('/api/print/weighing-receipt', async (req, res) => {
  try {
    const { 
      skuName,
      ingredientName,
      currentWeight,
      targetWeight,
      remainingWeight,
      operatorName,
      moNumber, // MO number for barcode
      sessionNumber, // Session number for weighing
      expDate, // Expiration date for the ingredient
      labelWidth,  // Label width in mm (default: 72mm)
      labelHeight, // Label height in mm (default: 100mm)
      labelDPI,    // Label DPI (default: 203)
      layout,
      skipPrintHistory = false, // Flag to skip saving to print_history (for individual prints)
      sessionTime = null // Session time (use this instead of current time if provided)
    } = req.body;

    // Validate required fields
    if (!skuName || !ingredientName || currentWeight === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['skuName', 'ingredientName', 'currentWeight']
      });
    }

    // Use session time if provided, otherwise use current time
    const timeToUse = sessionTime ? new Date(sessionTime) : new Date();
    const now = timeToUse; // Alias for clarity - use this timestamp for all time-related operations
    const dateStr = timeToUse.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = timeToUse.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    // Get printer format from request body or use default from config
    // Only ZPL is supported for thermal label printers
    const printerFormat = 'ZPL';
    
    // Get label size from request or use defaults (portrait orientation)
    const labelWidthMm = labelWidth || 72;
    const labelHeightMm = labelHeight || 100;
    const dpi = labelDPI || 203;
    
    // Get session number from database if not provided and moNumber/ingredientId available
    // For print, we want to show the NEXT session number (the one for the current weighing)
    // This represents which weighing number this is for the ingredient
    let finalSessionNumber = sessionNumber;
    if (!finalSessionNumber && moNumber) {
      try {
        // Try to get the latest session number for this ingredient and work order
        const workOrderResult = await pool.query(
          'SELECT id FROM work_orders WHERE work_order_number = $1 LIMIT 1',
          [moNumber]
        );
        if (workOrderResult.rows.length > 0) {
          const workOrderId = workOrderResult.rows[0].id;
          // Get ingredient ID if ingredientName is provided
          if (ingredientName) {
            const ingredientResult = await pool.query(
              `SELECT mfi.id 
               FROM master_formulation_ingredients mfi
               JOIN work_orders wo ON wo.formulation_id = mfi.formulation_id
               WHERE wo.id = $1 AND mfi.product_name = $2
               LIMIT 1`,
              [workOrderId, ingredientName]
            );
            if (ingredientResult.rows.length > 0) {
              const ingredientId = ingredientResult.rows[0].id;
              const sessionResult = await pool.query(
                `SELECT MAX(session_number) as max_session
                 FROM weighing_sessions
                 WHERE work_order_id = $1 AND ingredient_id = $2`,
                [workOrderId, ingredientId]
              );
              if (sessionResult.rows.length > 0 && sessionResult.rows[0].max_session) {
                // Calculate next session number (for the current print/weighing)
                // This shows which weighing number this is (1st, 2nd, 3rd, etc.)
                finalSessionNumber = parseInt(sessionResult.rows[0].max_session) + 1;
              } else {
                // No previous sessions, this is the first weighing
                finalSessionNumber = 1;
              }
            }
          }
        }
      } catch (sessionError) {
        console.warn('⚠️ Could not fetch session number from database:', sessionError.message);
        // Default to 1 if we can't fetch from database
        if (!finalSessionNumber) {
          finalSessionNumber = 1;
        }
      }
    }
    
    // If still no session number, default to 1 (first weighing)
    if (!finalSessionNumber) {
      finalSessionNumber = 1;
    }
    
    // Prepare data for receipt generation (targetWeight and remainingWeight removed from format)
    const receiptData = {
      skuName,
      ingredientName,
      currentWeight,
      operatorName: operatorName || 'Operator',
      dateStr,
      timeStr,
      moNumber: moNumber || null, // Include MO number if available
      sessionNumber: finalSessionNumber || null, // Include session number
      expDate: expDate || null, // Include expiration date if available
      labelWidth: labelWidthMm,   // Label width in mm
      labelHeight: labelHeightMm, // Label height in mm
      labelDPI: dpi,              // Label DPI
      layout: layout || {}
    };

    // Generate receipt using ZPL format (thermal label printer compatible)
    // Simplified ZPL: text only, no QR code, no barcode - based on successful implementation
    const receipt = generateZPLReceipt(receiptData);
    const formatName = 'ZPL';
    
    // Log ZPL output for debugging
    console.log('📄 Generated ZPL:');
    console.log('='.repeat(80));
    console.log(receipt);
    console.log('='.repeat(80));
    console.log(`📊 ZPL Stats: ${receipt.length} bytes, ${receipt.split('\n').length} lines`);

    // Save print data to print_history table (temporary storage for 3 days)
    try {
      const printDataJson = {
        receipt: receipt,
        receiptBase64: Buffer.from(receipt, 'utf8').toString('base64'),
        labelWidth: labelWidthMm,
        labelHeight: labelHeightMm,
        labelDPI: dpi,
        layout: layout || {},
        format: formatName.toLowerCase(),
        formatDisplay: formatName,
        paperSize: `${labelWidthMm}mm x ${labelHeightMm}mm`
      };

      // Get work_order_id if moNumber is provided
      let workOrderId = null;
      let ingredientId = null;
      
      if (moNumber) {
        const workOrderResult = await pool.query(
          'SELECT id FROM work_orders WHERE work_order_number = $1 LIMIT 1',
          [moNumber]
        );
        if (workOrderResult.rows.length > 0) {
          workOrderId = workOrderResult.rows[0].id;
        }
      }

      // Get ingredient_id if ingredientName is provided
      if (ingredientName) {
        const ingredientResult = await pool.query(
          `SELECT mfi.id 
           FROM master_formulation_ingredients mfi
           JOIN master_product mp ON mfi.product_id = mp.id
           WHERE mp.product_name = $1
           LIMIT 1`,
          [ingredientName]
        );
        if (ingredientResult.rows.length > 0) {
          ingredientId = ingredientResult.rows[0].id;
        }
      }

      // Insert print history (async - don't block response)
      // Only save to print_history if skipPrintHistory is false (for batch printing)
      if (!skipPrintHistory) {
        pool.query(
          `INSERT INTO print_history (
            work_order_id, work_order, ingredient_id, ingredient_name, sku_name,
            current_weight, target_weight, remaining_weight, operator_name, mo_number,
            print_data, weighing_time, printed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            workOrderId,
            moNumber || 'N/A',
            ingredientId,
            ingredientName,
            skuName,
            currentWeight,
            targetWeight || 0, // Use 0 if not provided (removed from format)
            remainingWeight || 0, // Use 0 if not provided (removed from format)
            operatorName || 'Operator',
            moNumber || null,
            JSON.stringify(printDataJson),
            now,
            now
          ]
        ).catch(err => {
          console.warn('⚠️  Failed to save print history (non-critical):', err.message);
        });
      } else {
        console.log('📋 Skipping print history save (individual print)');
      }
    } catch (saveError) {
      // Non-critical error - don't block print response
      console.warn('⚠️  Error saving print history (non-critical):', saveError.message);
    }

    // Return receipt data as base64 or raw
    res.json({
      success: true,
      receipt: receipt,
      receiptBase64: Buffer.from(receipt, 'utf8').toString('base64'),
      note: 'ZPL format for thermal label printer - simplified text-only format (no QR code, no barcode)',
      format: formatName.toLowerCase(),
      formatDisplay: formatName,
      paperSize: `${labelWidthMm}mm x ${labelHeightMm}mm`,
      width: `${labelWidthMm}mm`,
      height: `${labelHeightMm}mm`,
      dpi: dpi,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate receipt',
      details: error.message
    });
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
      ORDER BY COALESCE(mfi.sequence_order, 999999), mfi.created_at ASC
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
  console.log(`   Body content:`, JSON.stringify(req.body, null, 2).substring(0, 500));
  
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
    
    const { moNumber, formulationId, ingredients, progress } = req.body || {};
    
    // Validate required fields with detailed error messages
    if (!moNumber) {
      console.error('❌ Validation error: moNumber is missing');
      console.error('   Request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        success: false,
        error: 'Missing required field: moNumber',
        details: 'moNumber is required in request body',
        receivedBody: Object.keys(req.body || {})
      });
    }
    
    if (!formulationId) {
      console.error('❌ Validation error: formulationId is missing');
      console.error('   moNumber:', moNumber);
      console.error('   Request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        success: false,
        error: 'Missing required field: formulationId',
        details: 'formulationId is required in request body',
        moNumber: moNumber
      });
    }
    
    // Validate ingredients
    if (!ingredients || !Array.isArray(ingredients)) {
      console.error('❌ Validation error: ingredients is not an array');
      console.error('   ingredients type:', typeof ingredients);
      console.error('   ingredients value:', ingredients);
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid ingredients array',
        details: `ingredients must be an array, got: ${typeof ingredients}`,
        moNumber: moNumber,
        formulationId: formulationId
      });
    }
    
    if (ingredients.length === 0) {
      console.warn('⚠️  Warning: ingredients array is empty');
      // Allow empty array but log warning
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
    // IMPORTANT: Always update planned_quantity to preserve scaling factor
    const plannedQuantity = progress?.totalQuantity || 1;
    
    console.log(`📏 Work Order Quantity: ${plannedQuantity}g (Scaling Factor: ${(plannedQuantity / 1000).toFixed(2)}x)`);
    
    const workOrderQuery = `
      INSERT INTO work_orders (work_order_number, formulation_id, planned_quantity, status, created_by, created_at)
      VALUES ($1, $2, $3, 'in_progress', $4, CURRENT_TIMESTAMP)
      ON CONFLICT (work_order_number) 
      DO UPDATE SET 
        formulation_id = EXCLUDED.formulation_id,
        planned_quantity = EXCLUDED.planned_quantity,
        status = 'in_progress',
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, work_order_number
    `;
    
    const workOrderResult = await pool.query(workOrderQuery, [
      moNumber, 
      formulationId, 
      plannedQuantity,
      createdBy
    ]);
    
    if (!workOrderResult.rows || workOrderResult.rows.length === 0) {
      throw new Error('Failed to create or retrieve work order. No ID returned.');
    }
    
    const workOrderId = workOrderResult.rows[0].id;
    const workOrderNumber = workOrderResult.rows[0].work_order_number;
    
    console.log(`📋 Work Order created/updated: ${workOrderNumber}, ID: ${workOrderId}`);
    
    // Verify work order was actually saved
    const verifyResult = await pool.query(
      'SELECT id FROM work_orders WHERE id = $1',
      [workOrderId]
    );
    
    if (verifyResult.rows.length === 0) {
      throw new Error(`Work order ${workOrderId} was not saved to database. Transaction may have issues.`);
    }
    
    // Track tolerance violations
    let hasToleranceViolation = false;
    let violatingIngredient = null;
    // Track session numbers created for each ingredient (for print data)
    const sessionNumbersByIngredient = {};
    
    // Save weighing progress for each ingredient
    for (const ingredient of ingredients) {
      // Validate ingredient has required fields
      if (!ingredient.id) {
        console.warn(`⚠️  Skipping ingredient without ID:`, ingredient);
        continue;
      }
      
      // IMPORTANT: Only process ingredients with actual new weight to save
      // Skip ingredients with currentWeight = 0 to avoid false tolerance violations
      const newMass = parseFloat(ingredient.currentWeight || ingredient.actualWeight || 0);
      if (!newMass || newMass <= 0) {
        console.log(`⏭️  Skipping ingredient ${ingredient.id} (${ingredient.name || 'Unknown'}): no new weight to save (currentWeight=${newMass})`);
        continue; // Skip ingredients with no new weight - don't update them
      }
      
      // Validate ingredient has numeric values
      // CRITICAL: Use scaled target_mass from ingredient (already scaled in frontend)
      const targetMass = parseFloat(ingredient.targetWeight || ingredient.target_mass || 0);
      if (isNaN(targetMass)) {
        console.warn(`⚠️  Skipping ingredient ${ingredient.id} with invalid targetMass:`, ingredient.targetWeight || ingredient.target_mass);
        continue;
      }
      
      console.log(`💾 Saving ingredient ${ingredient.id} (${ingredient.name || 'Unknown'}): target=${targetMass}g, new=${newMass}g`);
      
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
          -- CRITICAL FIX: Always update target_mass if provided (to preserve scaling)
          -- This ensures scaling factor is preserved even after multiple saves
          target_mass = CASE 
            WHEN $3 IS NOT NULL AND $3 > 0 THEN $3  -- Use new scaled target if provided
            ELSE weighing_progress.target_mass      -- Keep existing if not provided
          END,
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
      // targetMass already validated above
      const tolerance = 3; // Default tolerance in grams
      const toleranceMin = Math.max(0, targetMass - tolerance); // Ensure non-negative
      const toleranceMax = targetMass + tolerance;
      
      try {
        // Get existing actual_mass and tolerance values from database (if exists)
        const existingCheck = await pool.query(
          'SELECT actual_mass, tolerance_min, tolerance_max FROM weighing_progress WHERE work_order_id = $1 AND ingredient_id = $2',
          [workOrderId, ingredient.id]
        );
        
        const existingMass = existingCheck.rows.length > 0 
          ? parseFloat(existingCheck.rows[0].actual_mass || 0) 
          : 0;
        
        // Use tolerance values from database if available, otherwise use calculated values
        const dbToleranceMin = existingCheck.rows.length > 0 && existingCheck.rows[0].tolerance_min !== null
          ? parseFloat(existingCheck.rows[0].tolerance_min)
          : null;
        const dbToleranceMax = existingCheck.rows.length > 0 && existingCheck.rows[0].tolerance_max !== null
          ? parseFloat(existingCheck.rows[0].tolerance_max)
          : null;
        
        // Use database tolerance if available, otherwise use calculated tolerance
        const finalToleranceMin = (dbToleranceMin !== null && !isNaN(dbToleranceMin)) ? dbToleranceMin : toleranceMin;
        const finalToleranceMax = (dbToleranceMax !== null && !isNaN(dbToleranceMax)) ? dbToleranceMax : toleranceMax;
        
        // newMass already validated above (must be > 0 to reach here)
        const accumulatedMass = existingMass + newMass; // Accumulate with previous weight
        
        console.log(`📊 Processing ingredient ${ingredient.id} (${ingredient.name || 'Unknown'}): existing=${existingMass}g, new=${newMass}g, accumulated=${accumulatedMass}g`);
        console.log(`   Tolerance range: [${finalToleranceMin}g - ${finalToleranceMax}g] (${dbToleranceMin !== null ? 'from DB' : 'calculated'})`);
        
        // Validate tolerance: Check if accumulated mass exceeds tolerance max
        // If it does, we need to reject the work order
        let exceedsTolerance = false;
        if (accumulatedMass > finalToleranceMax) {
          exceedsTolerance = true;
          console.log(`❌ TOLERANCE VIOLATION: Ingredient ${ingredient.id} exceeds tolerance: ${accumulatedMass}g > ${finalToleranceMax}g (max allowed)`);
        }
        
        // Auto-complete logic: if accumulated weight is within tolerance range, set status to 'completed'
        // Completed if: toleranceMin <= accumulatedMass <= toleranceMax
        // IMPORTANT: Do NOT mark as completed if tolerance is exceeded
        // Check every time (even if already completed) to ensure status is correct
        let ingredientStatus = ingredient.status || 'pending';
        
        // Check if within tolerance range (between min and max) using final tolerance values
        const withinToleranceRange = accumulatedMass >= finalToleranceMin && accumulatedMass <= finalToleranceMax;
        
        // Log tolerance check for debugging
        console.log(`🔍 Tolerance check for ${ingredient.name || ingredient.id}: accumulated=${accumulatedMass}g, range=[${finalToleranceMin}g - ${finalToleranceMax}g], withinRange=${withinToleranceRange}, exceeds=${exceedsTolerance}`);
        
        // IMPORTANT: Check completion FIRST before other status updates
        // This ensures ingredients within tolerance are marked completed even if they start as 'pending'
        if (withinToleranceRange && !exceedsTolerance) {
          // Mark as completed if within tolerance range (even if already completed, this ensures consistency)
          ingredientStatus = 'completed';
          if (ingredient.status !== 'completed') {
            console.log(`✅ Ingredient ${ingredient.id} (${ingredient.name || 'Unknown'}) auto-completed: ${accumulatedMass}g within tolerance range (${finalToleranceMin}g - ${finalToleranceMax}g, target: ${targetMass}g)`);
          }
        } else if (exceedsTolerance) {
          // If tolerance exceeded, keep status as 'weighing' or 'pending', never 'completed'
          // The work order will be rejected, but ingredient status should reflect violation
          if (ingredientStatus === 'completed') {
            // Revert completed status if tolerance violation detected
            ingredientStatus = 'weighing';
            console.log(`⚠️ Ingredient ${ingredient.id} status reverted from 'completed' to 'weighing' due to tolerance violation`);
          } else if (accumulatedMass > 0 && ingredientStatus === 'pending') {
            ingredientStatus = 'weighing';
          }
        } else if (accumulatedMass > 0 && !withinToleranceRange) {
          // If has weight but not within tolerance range, set to 'weighing'
          if (accumulatedMass < finalToleranceMin) {
            // Below minimum tolerance
            ingredientStatus = 'weighing';
            console.log(`⏳ Ingredient ${ingredient.id} (${ingredient.name || 'Unknown'}) still weighing: ${accumulatedMass}g < ${finalToleranceMin}g (min tolerance)`);
          } else {
            // Above maximum tolerance (but not exceedsTolerance yet - edge case)
            ingredientStatus = 'weighing';
            console.log(`⏳ Ingredient ${ingredient.id} (${ingredient.name || 'Unknown'}) still weighing: ${accumulatedMass}g > ${finalToleranceMax}g (max tolerance)`);
          }
        } else if (accumulatedMass > 0 && ingredientStatus === 'pending') {
          // If has weight but status still pending (shouldn't happen if above logic works, but safety check)
          ingredientStatus = 'weighing';
        }
        
        console.log(`📊 Ingredient ${ingredient.id}: existing=${existingMass}g, new=${newMass}g, accumulated=${accumulatedMass}g, status=${ingredientStatus}, exceedsTolerance=${exceedsTolerance}`);
        
        // Store tolerance violation flag in ingredient object for later use
        ingredient._exceedsTolerance = exceedsTolerance;
        
        // If tolerance is exceeded, mark for rejection
        if (exceedsTolerance) {
          hasToleranceViolation = true;
          // Only set violatingIngredient if not already set (to avoid overwriting with later ingredients)
          if (!violatingIngredient) {
            // Ensure all numeric values are valid numbers
            const safeTargetMass = isNaN(targetMass) ? 0 : targetMass;
            const safeAccumulatedMass = isNaN(accumulatedMass) ? 0 : accumulatedMass;
            const safeToleranceMax = isNaN(toleranceMax) ? 0 : toleranceMax;
            
            violatingIngredient = {
              id: ingredient.id || 'unknown',
              name: ingredient.name || ingredient.product_name || 'Unknown Ingredient',
              targetMass: safeTargetMass,
              accumulatedMass: safeAccumulatedMass,
              toleranceMax: safeToleranceMax
            };
            console.log(`❌ Tolerance violation recorded for ingredient: ${violatingIngredient.name}`);
            console.log(`   Details: target=${safeTargetMass}g, accumulated=${safeAccumulatedMass}g, max=${safeToleranceMax}g`);
          }
          // Still save the progress, but we'll reject the work order after
        }
        
        // Verify work order exists before inserting progress
        const woCheckResult = await pool.query(
          'SELECT id FROM work_orders WHERE id = $1',
          [workOrderId]
        );
        
        if (woCheckResult.rows.length === 0) {
          throw new Error(`Work order ${workOrderId} not found. Cannot save progress.`);
        }
        
        // Validate all parameters before query (redundant check for safety)
        if (isNaN(accumulatedMass)) {
          console.error(`❌ Invalid accumulatedMass for ingredient ${ingredient.id}:`, accumulatedMass);
          continue;
        }
        
        await pool.query(progressQuery, [
          workOrderId,
          ingredient.id, // should be UUID of master_formulation_ingredients.id
          targetMass,
          accumulatedMass, // Use accumulated weight (includes ALL saves, even if it causes reject)
          ingredientStatus, // Use auto-determined status
          finalToleranceMin, // tolerance_min (use final value from DB or calculated)
          finalToleranceMax  // tolerance_max (use final value from DB or calculated)
        ]);
        
        // Log accumulated mass after save (especially important for rejected work orders)
        if (exceedsTolerance || hasToleranceViolation) {
          console.log(`💾 Saved accumulated mass ${accumulatedMass}g for ingredient ${ingredient.id} (will cause reject)`);
        }
        
        // Create weighing session record for tracking
        // Only create session if there's actual weight (newMass > 0)
        // weighing_sessions status must be one of: 'weighing', 'completed', 'failed' (no 'pending')
        if (newMass > 0 || accumulatedMass > 0) {
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
            
            // Convert status to valid session status
            // weighing_sessions table only accepts: 'weighing', 'completed', 'failed'
            let sessionStatus = 'weighing';
            if (ingredientStatus === 'completed') {
              sessionStatus = 'completed';
            } else if (ingredientStatus === 'failed') {
              sessionStatus = 'failed';
            } else {
              // For 'pending' or 'weighing', use 'weighing' for sessions
              sessionStatus = 'weighing';
            }
            
            // Store expiration date if available (from ingredient.expDate)
            // Store as JSON array in notes field to support multiple exp dates per ingredient
            let expDatesArray = [];
            if (ingredient.expDate) {
              expDatesArray = [ingredient.expDate]; // Single exp date for this session
            }
            // Also check if there are existing exp dates in notes (for aggregation)
            // This will be handled when retrieving data in history API
            
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
                session_completed_at,
                notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11)
            `;
            
            // Store exp date in notes as JSON if available
            const notesValue = expDatesArray.length > 0 
              ? JSON.stringify({ exp_dates: expDatesArray })
              : null;
            
            await pool.query(sessionQuery, [
              workOrderId,
              sessionNumber,
              ingredient.id,
              targetMass,
              newMass, // Actual mass for this session (new reading)
              accumulatedMass, // Total accumulated mass
              sessionStatus, // Use valid session status
              toleranceMin,
              toleranceMax,
              weighedByUserId,
              notesValue // Store exp dates in notes as JSON
            ]);
            
            // Store session number for this ingredient (for print data)
            sessionNumbersByIngredient[ingredient.id] = sessionNumber;
            
            console.log(`📝 Created weighing session #${sessionNumber} for ingredient ${ingredient.id} with status: ${sessionStatus}`);
          } catch (sessionError) {
            console.warn(`⚠️  Could not create weighing session:`, sessionError.message);
            // Continue even if session creation fails
          }
        }
      } catch (ingredientError) {
        console.error(`❌ Error saving ingredient ${ingredient.id}:`, ingredientError.message);
        console.error(`   Error details:`, ingredientError);
        console.error(`   Error stack:`, ingredientError.stack);
        // If it's a foreign key constraint error, this is critical and should fail the transaction
        if (ingredientError.code === '23503') {
          // Foreign key constraint violation - work order might not exist
          console.error(`   ❌ CRITICAL: Foreign key constraint violation for ingredient ${ingredient.id}`);
          console.error(`   This may indicate the work order ${workOrderId} was not properly saved.`);
          // Re-throw to fail the transaction
          throw ingredientError;
        }
        // For other errors, log but continue with other ingredients
        console.warn(`⚠️  Continuing with other ingredients despite error for ingredient ${ingredient.id}`);
      }
    }
    
    // Check if all ingredients are completed - auto-complete MO (only if no tolerance violation)
    let totalIngredients = 0;
    let completedIngredients = 0;
    
    if (!hasToleranceViolation) {
      // Get total ingredients from formulation (not from weighing_progress)
      // This ensures we check against ALL ingredients in the formulation, not just those that have been saved
      const formulationIngredientsCheck = await pool.query(
        `SELECT COUNT(*) as total
         FROM master_formulation_ingredients 
         WHERE formulation_id = $1`,
        [formulationId]
      );
      
      totalIngredients = parseInt(formulationIngredientsCheck.rows[0].total) || 0;
      
      // Get completed ingredients count from weighing_progress
      const completedCheck = await pool.query(
        `SELECT COUNT(*) as completed_count
         FROM weighing_progress 
         WHERE work_order_id = $1 AND status = 'completed'`,
        [workOrderId]
      );
      
      completedIngredients = parseInt(completedCheck.rows[0].completed_count) || 0;
      
      console.log(`📊 MO completion check: ${completedIngredients}/${totalIngredients} ingredients completed (total from formulation: ${totalIngredients})`);
      
      // Only auto-complete if ALL ingredients in formulation are completed
      if (totalIngredients > 0 && completedIngredients === totalIngredients) {
        console.log(`✅ All ingredients completed (${completedIngredients}/${totalIngredients}): Auto-completing MO ${workOrderNumber}`);
        await pool.query(
          `UPDATE work_orders 
           SET status = 'completed', 
               completed_at = CURRENT_TIMESTAMP, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [workOrderId]
        );
      } else if (completedIngredients > 0) {
        console.log(`⏳ MO not yet completed: ${completedIngredients}/${totalIngredients} ingredients completed. Continue weighing remaining ingredients.`);
      }
    }
    
    // Check for tolerance violations and reject work order if any
    if (hasToleranceViolation) {
      console.log(`❌ TOLERANCE VIOLATION DETECTED: Rejecting work order ${workOrderNumber}`);
      try {
        await pool.query(
          `UPDATE work_orders SET status = 'reject', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [workOrderId]
        );
        console.log(`✅ Work order ${workOrderNumber} status updated to 'reject'`);
      } catch (rejectError) {
        console.error(`❌ Error updating work order status to 'reject':`, rejectError);
        console.error(`   Error code: ${rejectError.code}`);
        console.error(`   Error message: ${rejectError.message}`);
        // If 'reject' status is not allowed (check constraint), try 'cancelled' as fallback
        if (rejectError.code === '23514' || rejectError.message.includes('check constraint')) {
          console.warn(`⚠️  Status 'reject' not allowed in database, using 'cancelled' instead`);
          try {
            await pool.query(
              `UPDATE work_orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
              [workOrderId]
            );
            console.log(`✅ Work order ${workOrderNumber} status updated to 'cancelled' (fallback)`);
          } catch (cancelError) {
            console.error(`❌ Error updating to 'cancelled' status:`, cancelError);
            // Continue anyway - status update failure shouldn't block the response
          }
        } else {
          // For other errors, log but continue - don't fail the whole transaction
          console.warn(`⚠️  Continuing despite status update error`);
        }
      }
    }
    
    // Prepare print data BEFORE commit (using data from memory/variables)
    // Note: workOrderNumber is already defined above (line 2897)
    // This ensures print data is available even when MO is rejected
    // Note: sessionNumbersByIngredient is already declared above in the save loop
    let printData = null;
    
    try {
      // Get the saved ingredient details for printing
      const savedIngredient = ingredients && ingredients.length > 0 ? ingredients[0] : null;
      if (savedIngredient) {
        console.log('📄 Preparing print data for ingredient:', savedIngredient.id, savedIngredient.name);
        
        // Use data from memory/variables instead of querying database
        // This is more reliable as data is already processed
        const targetMass = parseFloat(savedIngredient.targetWeight || savedIngredient.target_mass || 0);
        const currentReading = parseFloat(savedIngredient.currentWeight || savedIngredient.actualWeight || 0);
        
        // Get accumulated mass from violatingIngredient if available (most reliable)
        // violatingIngredient contains the calculated accumulated mass from the processing loop
        let accumulatedMass = 0;
        if (violatingIngredient && 
            (violatingIngredient.id === savedIngredient.id || 
             violatingIngredient.name === savedIngredient.name ||
             violatingIngredient.product_name === savedIngredient.name)) {
          accumulatedMass = parseFloat(violatingIngredient.accumulatedMass || 0) || 0;
          console.log('📄 Using accumulated mass from violatingIngredient:', accumulatedMass);
        }
        
        // If not found, try to find from ingredients array
        if (accumulatedMass === 0) {
          for (const ing of ingredients) {
            if (ing.id === savedIngredient.id || ing.code === savedIngredient.code) {
              // Calculate accumulated mass: existing + new
              const existingMass = parseFloat(ing.savedWeight || ing.actualWeight || 0) || 0;
              const newMass = parseFloat(ing.currentWeight || ing.actualWeight || 0) || 0;
              accumulatedMass = existingMass + newMass;
              console.log('📄 Using accumulated mass from ingredients array:', accumulatedMass, '(existing:', existingMass, '+ new:', newMass, ')');
              break;
            }
          }
        }
        
        // Fallback: query from database if still not found (shouldn't happen, but safety)
        if (accumulatedMass === 0) {
          try {
            const wpResult = await pool.query(
              'SELECT actual_mass FROM weighing_progress WHERE work_order_id = $1 AND ingredient_id = $2',
              [workOrderId, savedIngredient.id]
            );
            if (wpResult.rows.length > 0) {
              accumulatedMass = parseFloat(wpResult.rows[0].actual_mass || 0) || 0;
              console.log('📄 Using accumulated mass from DB query:', accumulatedMass);
            }
          } catch (wpError) {
            console.warn('⚠️ Could not fetch accumulated mass from DB:', wpError.message);
          }
        }
        
        if (accumulatedMass === 0) {
          console.warn('⚠️ WARNING: Could not determine accumulated mass, using current reading as fallback');
          accumulatedMass = currentReading;
        }
        
        // Get planned quantity from database or use default
        let plannedQuantity = 1000; // Default
        try {
          const pqResult = await pool.query(
            'SELECT planned_quantity FROM work_orders WHERE id = $1',
            [workOrderId]
          );
          if (pqResult.rows.length > 0) {
            plannedQuantity = parseFloat(pqResult.rows[0].planned_quantity || 1000);
          }
        } catch (pqError) {
          console.warn('⚠️ Could not fetch planned_quantity, using default 1000:', pqError.message);
        }
        
        const scalingFactor = (plannedQuantity / 1000).toFixed(2);
        const remainingWeight = Math.max(0, targetMass - accumulatedMass);
        
        // Get formulation name and ingredient name
        let skuName = 'N/A';
        let ingredientName = savedIngredient.name || 'N/A';
        
        try {
          const nameQuery = await pool.query(
            `SELECT 
              mf.formulation_name,
              mp.product_name
            FROM work_orders wo
            JOIN master_formulation mf ON wo.formulation_id = mf.id
            JOIN master_formulation_ingredients mfi ON mfi.formulation_id = mf.id
            JOIN master_product mp ON mp.id = mfi.product_id
            WHERE wo.id = $1 AND mfi.id = $2
            LIMIT 1`,
            [workOrderId, savedIngredient.id]
          );
          if (nameQuery.rows.length > 0) {
            skuName = nameQuery.rows[0].formulation_name || workOrderNumber || 'N/A';
            ingredientName = nameQuery.rows[0].product_name || savedIngredient.name || 'N/A';
          }
        } catch (nameError) {
          console.warn('⚠️ Could not fetch names from DB, using defaults:', nameError.message);
          skuName = workOrderNumber || 'N/A';
        }
        
        // Get session number for this ingredient (the one that was just created)
        // This is the session number that was created during save
        let sessionNumberForPrint = null;
        if (sessionNumbersByIngredient[savedIngredient.id]) {
          sessionNumberForPrint = sessionNumbersByIngredient[savedIngredient.id];
        } else {
          // Fallback: query the latest session number from database
          try {
            const sessionQuery = await pool.query(
              `SELECT MAX(session_number) as max_session
               FROM weighing_sessions
               WHERE work_order_id = $1 AND ingredient_id = $2`,
              [workOrderId, savedIngredient.id]
            );
            if (sessionQuery.rows.length > 0 && sessionQuery.rows[0].max_session) {
              sessionNumberForPrint = parseInt(sessionQuery.rows[0].max_session) || 1;
            } else {
              sessionNumberForPrint = 1; // First weighing
            }
          } catch (sessionError) {
            console.warn('⚠️ Could not fetch session number for print:', sessionError.message);
            sessionNumberForPrint = 1; // Default to 1
          }
        }
        
        // Get expDate from savedIngredient if available
        const expDate = savedIngredient.expDate || savedIngredient.exp_date || null;
        
        // Get operator name from work order (join with master_user)
        let operatorName = 'Operator'; // Default fallback
        try {
          const operatorQuery = await pool.query(
            `SELECT 
              COALESCE(mu.username, mu.name, 'Unknown') as operator_name,
              mu.name as operator_full_name
            FROM work_orders wo
            LEFT JOIN master_user mu ON wo.created_by = mu.id
            WHERE wo.id = $1
            LIMIT 1`,
            [workOrderId]
          );
          if (operatorQuery.rows.length > 0 && operatorQuery.rows[0].operator_name) {
            // Use operator_full_name (name) if available, otherwise use operator_name (username)
            operatorName = operatorQuery.rows[0].operator_full_name || operatorQuery.rows[0].operator_name || 'Operator';
          }
        } catch (operatorError) {
          console.warn('⚠️ Could not fetch operator name from DB, using default:', operatorError.message);
        }
        
        printData = {
          skuName: skuName,
          ingredientName: ingredientName,
          currentWeight: currentReading, // Current scale reading being saved
          targetWeight: targetMass, // SCALED target weight
          remainingWeight: remainingWeight, // Based on accumulated mass
          operatorName: operatorName, // Get from work order (created_by -> master_user)
          moNumber: workOrderNumber || moNumber || null, // MO number for barcode (use workOrderNumber if available, fallback to moNumber)
          sessionNumber: sessionNumberForPrint, // CRITICAL: Include session number that was just created
          expDate: expDate // Expiration date for the ingredient
        };
        
        console.log('📄 Print data prepared (SCALED) - even for rejected MO:', {
          sku: printData.skuName,
          ingredient: printData.ingredientName,
          current: printData.currentWeight,
          target: printData.targetWeight,
          accumulated: accumulatedMass,
          remaining: printData.remainingWeight,
          scalingFactor: `${scalingFactor}x`,
          plannedQuantity: `${plannedQuantity}g`
        });
      } else {
        console.warn('⚠️ No saved ingredient found for print data');
      }
    } catch (printError) {
      console.error('❌ Error preparing print data:', printError);
      console.error('   Error stack:', printError.stack);
      // Continue without print data - not critical
    }
    
    // Commit transaction AFTER preparing print data
    await pool.query('COMMIT');
    transactionStarted = false; // Mark transaction as completed
    
    // If tolerance violation, return error response after commit (but include printData)
    if (hasToleranceViolation && violatingIngredient) {
      try {
        const ingredientName = violatingIngredient.name || violatingIngredient.product_name || 'Unknown';
        const accumulatedMass = parseFloat(violatingIngredient.accumulatedMass || 0) || 0;
        const toleranceMax = parseFloat(violatingIngredient.toleranceMax || 0) || 0;
        const targetMass = parseFloat(violatingIngredient.targetMass || 0) || 0;
        
        // Validate all values are numbers before using toFixed
        const accumulatedMassStr = isNaN(accumulatedMass) ? '0.00' : accumulatedMass.toFixed(2);
        const toleranceMaxStr = isNaN(toleranceMax) ? '0.00' : toleranceMax.toFixed(2);
        const targetMassStr = isNaN(targetMass) ? '0.00' : targetMass.toFixed(2);
        
        console.log(`❌ Returning tolerance violation response for MO: ${moNumber}`);
        console.log(`   Violating ingredient: ${ingredientName}, accumulated: ${accumulatedMassStr}g, max: ${toleranceMaxStr}g`);
        console.log(`   Print data included: ${printData ? 'Yes' : 'No'}`);
        
        return res.status(400).json({
          success: false,
          error: 'TOLERANCE_VIOLATION',
          message: 'Berat melebihi toleransi yang diizinkan',
          details: `Bahan "${ingredientName}": ${accumulatedMassStr}g melebihi batas maksimal ${toleranceMaxStr}g (target: ${targetMassStr}g)`,
          violatingIngredient: violatingIngredient,
          workOrderId: workOrderId,
          moNumber: moNumber,
          rejected: true,
          printData: printData // Include print data even for rejected MO
        });
      } catch (responseError) {
        console.error('❌ Error creating tolerance violation response:', responseError);
        console.error('   Error stack:', responseError.stack);
        console.error('   Violating ingredient data:', JSON.stringify(violatingIngredient, null, 2));
        // Fallback response (include printData if available)
        return res.status(400).json({
          success: false,
          error: 'TOLERANCE_VIOLATION',
          message: 'Berat melebihi toleransi yang diizinkan',
          details: 'Bahan melebihi batas toleransi yang diizinkan',
          workOrderId: workOrderId,
          moNumber: moNumber,
          rejected: true,
          printData: printData // Include print data even in fallback
        });
      }
    } else if (hasToleranceViolation && !violatingIngredient) {
      // Fallback: tolerance violation detected but violatingIngredient not set (shouldn't happen)
      console.error('⚠️ WARNING: Tolerance violation detected but violatingIngredient is null');
      return res.status(400).json({
        success: false,
        error: 'TOLERANCE_VIOLATION',
        message: 'Berat melebihi toleransi yang diizinkan',
        details: 'Bahan melebihi batas toleransi yang diizinkan',
        workOrderId: workOrderId,
        moNumber: moNumber,
        rejected: true,
        printData: printData // Include print data even in fallback
      });
    }
    
    console.log(`✅ Weighing progress saved successfully for MO: ${moNumber}, Work Order ID: ${workOrderId}`);
    
    // Verify work order is still in database after commit
    const finalVerify = await pool.query(
      'SELECT id, work_order_number, status FROM work_orders WHERE id = $1',
      [workOrderId]
    );
    
    if (finalVerify.rows.length === 0) {
      console.error(`⚠️  WARNING: Work order ${workOrderId} not found after commit. This should not happen.`);
    } else {
      console.log(`✅ Verified work order ${finalVerify.rows[0].work_order_number} exists in database after commit`);
    }
    
    // Check MO status after commit
    const moStatusCheck = await pool.query(
      'SELECT status FROM work_orders WHERE id = $1',
      [workOrderId]
    );
    
    const moStatus = moStatusCheck.rows[0]?.status || 'in_progress';
    const isAutoCompleted = moStatus === 'completed';
    
    // Print data already prepared above (before tolerance violation check)
    // Reuse it here for successful saves
    
    res.json({
      success: true,
      message: isAutoCompleted 
        ? 'Weighing progress saved successfully. Semua bahan telah selesai ditimbang - MO otomatis diselesaikan!' 
        : 'Weighing progress saved successfully',
      workOrderId: workOrderId,
      moStatus: moStatus,
      autoCompleted: isAutoCompleted,
      progress: {
        completed: completedIngredients,
        total: totalIngredients
      },
      printData: printData // Include print data in response
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
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    
    // Ensure we send a response even if there's an error
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to save weighing progress',
        details: error.message || 'Unknown error occurred',
        errorCode: error.code,
        errorDetail: error.detail,
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
    
    // Check if opened_at column exists
    let hasOpenedAtColumn = false;
    try {
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'work_orders' 
          AND column_name = 'opened_at'
        ) as exists
      `);
      hasOpenedAtColumn = columnCheck.rows[0]?.exists || false;
    } catch (checkError) {
      console.warn('⚠️  Could not check for opened_at column, assuming it does not exist:', checkError.message);
      hasOpenedAtColumn = false;
    }
    
    // Fetch work orders with formulation details
    // Use conditional query based on whether opened_at column exists
    const woQuery = hasOpenedAtColumn ? `
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
        wo.opened_at,
        COALESCE(mu.username, mu.name, 'Unknown') as operator_name,
        mu.name as operator_full_name
      FROM work_orders wo
      LEFT JOIN master_formulation mf ON wo.formulation_id = mf.id
      LEFT JOIN master_user mu ON wo.created_by = mu.id
      ORDER BY wo.created_at DESC
      LIMIT 200
    ` : `
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
        NULL as opened_at,
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
        // weighing_progress has UNIQUE constraint on (work_order_id, ingredient_id)
        // So actual_mass is already the accumulated total from all saves
        // IMPORTANT: Use LEFT JOIN to include work orders even without weighing_progress
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
            wp.notes,
            -- Get the latest session created_at as the last save time
            -- This represents when the last save occurred
            (SELECT MAX(ws.created_at)
             FROM weighing_sessions ws 
             WHERE ws.work_order_id = wp.work_order_id 
             AND ws.ingredient_id = wp.ingredient_id) as last_save_time
          FROM weighing_progress wp
          JOIN master_formulation_ingredients mfi ON wp.ingredient_id = mfi.id
          JOIN master_product mp ON mfi.product_id = mp.id
          WHERE wp.work_order_id = $1
          ORDER BY COALESCE(mfi.sequence_order, 999999), mfi.created_at ASC
        `;
        
        let ingredientsResult;
        try {
          ingredientsResult = await pool.query(ingredientsQuery, [wo.id]);
          console.log(`   📦 Work order ${wo.work_order} (${wo.status}): Found ${ingredientsResult.rows.length} ingredients with weighing progress`);
        } catch (ingQueryError) {
          console.warn(`⚠️  Error fetching ingredients for work order ${wo.work_order} (${wo.id}):`, ingQueryError.message);
          console.warn(`   Error details:`, ingQueryError);
          // Continue with empty ingredients array if query fails
          ingredientsResult = { rows: [] };
        }
        
        // weighing_progress.actual_mass is already the accumulated total from all saves
        // This includes ALL saves, even the one that caused rejection
        // Server accumulates: existingMass + newMass on each save, including reject case
        const weighingDetails = (ingredientsResult.rows || []).map(ing => {
          const actualMass = parseFloat(ing.weighing_result || 0) || 0;
          const targetMass = parseFloat(ing.target_mass || 0) || 0;
          
          // Log for debugging to ensure we're getting the correct accumulated total
          if (wo.status === 'reject') {
            console.log(`📊 Rejected ingredient ${ing.ingredient_name}: actual_mass=${actualMass}g, target=${targetMass}g`);
          }
          
          return {
            ingredient_id: ing.ingredient_id,
            ingredient_code: ing.product_code || '',
            ingredient_name: ing.ingredient_name || 'Unknown',
            target_mass: targetMass,
            weighing_result: actualMass, // This is the accumulated total from ALL saves (including reject save)
            weighing_time: ing.last_save_time || ing.weighing_time || ing.completed_time || ing.started_time || null,
            status: ing.weighing_status || 'pending',
            tolerance_min: parseFloat(ing.tolerance_min || 0) || 0,
            tolerance_max: parseFloat(ing.tolerance_max || 0) || 0,
            notes: ing.notes || null
          };
        });
        
        // Find ingredient that caused rejection (if status is 'reject' or 'cancelled' due to tolerance violation)
        let rejectReason = null;
        if (wo.status === 'reject' || wo.status === 'cancelled') {
          // Find ingredient(s) that exceeded tolerance_max
          const violatingIngredients = weighingDetails.filter(ing => {
            const actualMass = ing.weighing_result || 0;
            const toleranceMax = ing.tolerance_max || 0;
            return actualMass > toleranceMax;
          });
          
          if (violatingIngredients.length > 0) {
            // Use the first violating ingredient (or combine if multiple)
            const firstViolation = violatingIngredients[0];
            const excessAmount = (firstViolation.weighing_result || 0) - (firstViolation.tolerance_max || 0);
            
            rejectReason = {
              ingredient_id: firstViolation.ingredient_id, // Add ingredient_id for frontend matching
              ingredient_name: firstViolation.ingredient_name,
              ingredient_code: firstViolation.ingredient_code,
              target_mass: firstViolation.target_mass,
              actual_mass: firstViolation.weighing_result,
              tolerance_max: firstViolation.tolerance_max,
              excess_amount: excessAmount,
              violation_count: violatingIngredients.length
            };
          } else {
            // If no ingredient exceeds tolerance_max, check if any ingredient is significantly over
            const overTarget = weighingDetails.filter(ing => {
              const actualMass = ing.weighing_result || 0;
              const targetMass = ing.target_mass || 0;
              return actualMass > targetMass + 3; // More than tolerance (3g)
            });
            
            if (overTarget.length > 0) {
              const firstOver = overTarget[0];
              rejectReason = {
                ingredient_id: firstOver.ingredient_id, // Add ingredient_id for frontend matching
                ingredient_name: firstOver.ingredient_name,
                ingredient_code: firstOver.ingredient_code,
                target_mass: firstOver.target_mass,
                actual_mass: firstOver.weighing_result,
                tolerance_max: firstOver.tolerance_max,
                excess_amount: (firstOver.weighing_result || 0) - (firstOver.tolerance_max || 0),
                violation_count: overTarget.length
              };
            }
          }
        }
        
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
          opened_at: wo.opened_at || null,
          ingredients: weighingDetails,
          reject_reason: rejectReason // Add reject reason for rejected work orders
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
          opened_at: wo.opened_at || null,
          ingredients: []
        };
      }
    }));
    
    console.log(`📊 Fetched ${historiesWithDetails.length} work orders with weighing details`);
    
    // Filter out any null entries (in case of errors)
    const validHistories = historiesWithDetails.filter(h => h !== null && h !== undefined);
    
    // Sort histories: unopened completed/reject first (oldest first), then others (newest first)
    validHistories.sort((a, b) => {
      const aIsUnopenedCompleted = (a.status === 'completed' || a.status === 'reject') && !a.opened_at;
      const bIsUnopenedCompleted = (b.status === 'completed' || b.status === 'reject') && !b.opened_at;
      
      // If both are unopened completed/reject, sort by created_at ASC (oldest first)
      if (aIsUnopenedCompleted && bIsUnopenedCompleted) {
        const aDate = new Date(a.production_date || a.created_at || 0);
        const bDate = new Date(b.production_date || b.created_at || 0);
        return aDate - bDate;
      }
      
      // If only a is unopened completed/reject, a comes first
      if (aIsUnopenedCompleted && !bIsUnopenedCompleted) {
        return -1;
      }
      
      // If only b is unopened completed/reject, b comes first
      if (!aIsUnopenedCompleted && bIsUnopenedCompleted) {
        return 1;
      }
      
      // Both are opened or other statuses, sort by created_at DESC (newest first)
      const aDate = new Date(a.production_date || a.created_at || 0);
      const bDate = new Date(b.production_date || b.created_at || 0);
      return bDate - aDate;
    });
    
    // Log summary for debugging
    console.log(`📋 History summary: ${validHistories.length} work orders returned`);
    if (validHistories.length > 0) {
      const withIngredients = validHistories.filter(h => h.ingredients && h.ingredients.length > 0).length;
      const unopenedCount = validHistories.filter(h => (h.status === 'completed' || h.status === 'reject') && !h.opened_at).length;
      console.log(`   - ${withIngredients} with ingredients data`);
      console.log(`   - ${validHistories.length - withIngredients} without ingredients data`);
      console.log(`   - ${unopenedCount} unopened completed/reject orders`);
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
    
    // Check if opened_at column exists
    let hasOpenedAtColumn = false;
    try {
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'work_orders' 
          AND column_name = 'opened_at'
        ) as exists
      `);
      hasOpenedAtColumn = columnCheck.rows[0]?.exists || false;
    } catch (checkError) {
      console.warn('⚠️  Could not check for opened_at column, assuming it does not exist:', checkError.message);
      hasOpenedAtColumn = false;
    }
    
    const woQuery = hasOpenedAtColumn ? `
      SELECT 
        wo.id,
        wo.work_order_number as work_order,
        wo.formulation_id,
        wo.planned_quantity,
        wo.status,
        wo.created_at as production_date,
        wo.completed_at as end_time,
        wo.opened_at,
        COALESCE(mf.formulation_name, 'Unknown') as formulation_name,
        COALESCE(mf.formulation_code, '') as sku,
        COALESCE(mu.username, mu.name, 'Unknown') as operator_name,
        mu.name as operator_full_name
      FROM work_orders wo
      LEFT JOIN master_formulation mf ON wo.formulation_id = mf.id
      LEFT JOIN master_user mu ON wo.created_by = mu.id
      WHERE wo.work_order_number = $1
    ` : `
      SELECT 
        wo.id,
        wo.work_order_number as work_order,
        wo.formulation_id,
        wo.planned_quantity,
        wo.status,
        wo.created_at as production_date,
        wo.completed_at as end_time,
        NULL as opened_at,
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
    
    // Mark as opened if status is completed or reject and not yet opened (only if column exists)
    if (hasOpenedAtColumn && (wo.status === 'completed' || wo.status === 'reject') && !wo.opened_at) {
      try {
        await pool.query(
          'UPDATE work_orders SET opened_at = CURRENT_TIMESTAMP WHERE id = $1 AND opened_at IS NULL',
          [wo.id]
        );
        console.log(`✅ Marked work order ${mo} as opened`);
      } catch (updateError) {
        console.warn(`⚠️  Failed to mark work order ${mo} as opened:`, updateError.message);
        // Continue even if update fails
      }
    }
    
    // Fetch ALL ingredients from formulation (not just those with sessions)
    // This ensures all ingredients appear in history detail, even if not yet weighed
    const baseQuantity = 1000; // Base formula quantity
    const scalingFactor = wo.planned_quantity ? (wo.planned_quantity / baseQuantity) : 1;
    
    const allIngredientsQuery = `
      SELECT 
        mfi.id as ingredient_id,
        mp.product_code,
        mp.product_name as ingredient_name,
        -- Use scaled target_mass from weighing_progress if exists, otherwise calculate from base
        COALESCE(wp.target_mass, ROUND(mfi.target_mass * ${scalingFactor}, 2)) as target_mass,
        COALESCE(wp.actual_mass, 0) as current_accumulated_mass,
        COALESCE(wp.status, 'pending') as current_status,
        wp.tolerance_min,
        wp.tolerance_max
      FROM master_formulation_ingredients mfi
      JOIN master_product mp ON mfi.product_id = mp.id
      LEFT JOIN weighing_progress wp ON wp.work_order_id = $1 AND wp.ingredient_id = mfi.id
      WHERE mfi.formulation_id = $2
      ORDER BY COALESCE(mfi.sequence_order, 999999), mfi.created_at ASC
    `;
    
    const allIngredientsResult = await pool.query(allIngredientsQuery, [wo.id, wo.formulation_id]);
    
    // Fetch all weighing sessions for ingredients that have sessions
    const sessionsQuery = `
      SELECT 
        ws.id as session_id,
        ws.session_number,
        ws.ingredient_id,
        ws.target_mass,
        ws.actual_mass,
        ws.accumulated_mass,
        ws.status as session_status,
        ws.tolerance_min,
        ws.tolerance_max,
        ws.session_started_at,
        ws.session_completed_at,
        ws.notes
      FROM weighing_sessions ws
      WHERE ws.work_order_id = $1
      ORDER BY ws.ingredient_id, ws.session_number ASC
    `;
    
    const sessionsResult = await pool.query(sessionsQuery, [wo.id]);
    
    // Group sessions by ingredient_id and collect expiration dates
    const sessionsByIngredient = new Map();
    // Map to store exp dates with their actual weights: ingredient_id -> Map(expDate -> totalWeight)
    const expDatesWithWeights = new Map();
    
    sessionsResult.rows.forEach(session => {
      const ingId = session.ingredient_id;
      if (!sessionsByIngredient.has(ingId)) {
        sessionsByIngredient.set(ingId, []);
        expDatesWithWeights.set(ingId, new Map()); // Map(expDate -> totalWeight)
      }
      sessionsByIngredient.get(ingId).push({
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
      
      // Extract expiration dates from notes field and accumulate weights per exp date
      const sessionActualMass = parseFloat(session.actual_mass || 0);
      let expDateFound = false;
      
      if (session.notes) {
        try {
          const notesData = JSON.parse(session.notes);
          if (notesData && notesData.exp_dates && Array.isArray(notesData.exp_dates) && notesData.exp_dates.length > 0) {
            notesData.exp_dates.forEach(expDate => {
              if (expDate) {
                expDateFound = true;
                const expDateMap = expDatesWithWeights.get(ingId);
                const currentWeight = expDateMap.get(expDate) || 0;
                expDateMap.set(expDate, currentWeight + sessionActualMass);
              }
            });
          }
        } catch (e) {
          // If notes is not JSON, check if notes itself is an exp date (for backward compatibility)
          if (session.notes && session.notes.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            expDateFound = true;
            const expDateMap = expDatesWithWeights.get(ingId);
            const currentWeight = expDateMap.get(session.notes) || 0;
            expDateMap.set(session.notes, currentWeight + sessionActualMass);
          }
        }
      }
      
      // If no exp date found in notes, use '-' as default and accumulate weight
      if (!expDateFound && sessionActualMass > 0) {
        const expDateMap = expDatesWithWeights.get(ingId);
        const currentWeight = expDateMap.get('-') || 0;
        expDateMap.set('-', currentWeight + sessionActualMass);
      }
    });
    
    // Build ingredients array with all ingredients from formulation
    const ingredients = allIngredientsResult.rows.map(row => {
      const ingId = row.ingredient_id;
      const expDatesMap = expDatesWithWeights.get(ingId) || new Map();
      
      // Convert Map to array of objects with exp_date and actual_weight
      // If no exp dates found, use total accumulated mass with '-' exp date
      let expDatesArray = [];
      if (expDatesMap.size > 0) {
        expDatesArray = Array.from(expDatesMap.entries())
          .map(([expDate, actualWeight]) => ({
            exp_date: expDate,
            actual_weight: actualWeight
          }))
          .sort((a, b) => {
            // Sort by exp date (if not '-')
            if (a.exp_date === '-') return 1;
            if (b.exp_date === '-') return -1;
            return a.exp_date.localeCompare(b.exp_date);
          });
      } else {
        // No exp dates found, use total accumulated mass with '-' exp date
        const totalMass = parseFloat(row.current_accumulated_mass || 0);
        if (totalMass > 0) {
          expDatesArray = [{
            exp_date: '-',
            actual_weight: totalMass
          }];
        } else {
          expDatesArray = [{
            exp_date: '-',
            actual_weight: 0
          }];
        }
      }
      
      return {
        ingredient_id: ingId,
        ingredient_code: row.product_code,
        ingredient_name: row.ingredient_name,
        target_mass: parseFloat(row.target_mass || 0),
        current_accumulated_mass: parseFloat(row.current_accumulated_mass || 0),
        current_status: row.current_status,
        tolerance_min: row.tolerance_min ? parseFloat(row.tolerance_min) : null,
        tolerance_max: row.tolerance_max ? parseFloat(row.tolerance_max) : null,
        sessions: sessionsByIngredient.get(ingId) || [], // Empty array if no sessions
        exp_dates: expDatesArray // Array of objects: {exp_date, actual_weight}
      };
    });
    
    // Find ingredient that caused rejection (if status is 'reject')
    let rejectReason = null;
    if (wo.status === 'reject') {
      // Get weighing progress to check tolerance violations
      const wpQuery = `
        SELECT 
          wp.ingredient_id,
          mp.product_code,
          mp.product_name as ingredient_name,
          wp.target_mass,
          wp.actual_mass,
          wp.tolerance_max
        FROM weighing_progress wp
        JOIN master_formulation_ingredients mfi ON wp.ingredient_id = mfi.id
        JOIN master_product mp ON mfi.product_id = mp.id
        WHERE wp.work_order_id = $1
      `;
      
      try {
        const wpResult = await pool.query(wpQuery, [wo.id]);
        const violatingIngredients = wpResult.rows.filter(row => {
          const actualMass = parseFloat(row.actual_mass || 0);
          const toleranceMax = parseFloat(row.tolerance_max || 0);
          return actualMass > toleranceMax;
        });
        
        if (violatingIngredients.length > 0) {
          const firstViolation = violatingIngredients[0];
          const excessAmount = parseFloat(firstViolation.actual_mass || 0) - parseFloat(firstViolation.tolerance_max || 0);
          
          rejectReason = {
            ingredient_id: firstViolation.ingredient_id, // Add ingredient_id for frontend matching
            ingredient_name: firstViolation.ingredient_name,
            ingredient_code: firstViolation.product_code,
            target_mass: parseFloat(firstViolation.target_mass || 0),
            actual_mass: parseFloat(firstViolation.actual_mass || 0),
            tolerance_max: parseFloat(firstViolation.tolerance_max || 0),
            excess_amount: excessAmount,
            violation_count: violatingIngredients.length
          };
        }
      } catch (wpError) {
        console.warn('Could not fetch reject reason:', wpError.message);
      }
    }
    
    res.json({
      success: true,
      data: {
        workOrder: wo,
        ingredients: ingredients,
        reject_reason: rejectReason
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
    
    // Check if QC reactivation columns exist (for backward compatibility)
    let hasQcColumns = false;
    try {
      const columnCheck = await pool.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'work_orders' 
         AND column_name IN ('qc_reactivate_note', 'qc_reactivated_by', 'qc_reactivated_at')
         LIMIT 1`
      );
      hasQcColumns = columnCheck.rows.length > 0;
    } catch (e) {
      console.warn('Could not check for QC columns:', e.message);
    }
    
    // Build query with conditional QC columns
    const qcColumns = hasQcColumns 
      ? `wo.qc_reactivate_note,
         wo.qc_reactivated_by,
         wo.qc_reactivated_at,`
      : `NULL as qc_reactivate_note,
         NULL as qc_reactivated_by,
         NULL as qc_reactivated_at,`;
    
    const woResult = await pool.query(
      `SELECT 
         wo.id, 
         wo.work_order_number, 
         wo.formulation_id, 
         wo.planned_quantity, 
         wo.status, 
         wo.created_at, 
         wo.completed_at,
         ${qcColumns}
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
    // CRITICAL FIX: Calculate scaled target_mass for ALL ingredients (including those not yet saved)
    // For ingredients not yet saved: calculate from base * scaling factor
    // For ingredients already saved: use scaled target_mass from weighing_progress
    const baseQuantity = 1000; // Base formula quantity
    const scalingFactor = wo.planned_quantity ? (wo.planned_quantity / baseQuantity) : 1;
    
    const ingResult = await pool.query(
      `SELECT 
         mfi.id as ingredient_id,
         mfi.target_mass as base_target_mass,
         -- CRITICAL FIX: Use scaled target_mass from weighing_progress if exists
         -- Otherwise, calculate scaled target from base * scaling factor
         COALESCE(
           wp.target_mass, 
           ROUND(mfi.target_mass * ${scalingFactor}, 2)
         ) as target_mass,
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
         -- Get latest session number for this ingredient (for print tracking)
         (SELECT MAX(session_number) 
          FROM weighing_sessions 
          WHERE work_order_id = $1 AND ingredient_id = mfi.id) as last_session_number,
         -- Calculate progress percentage using SCALED target_mass
         CASE 
           WHEN COALESCE(wp.target_mass, ROUND(mfi.target_mass * ${scalingFactor}, 2)) > 0 THEN 
             ROUND((COALESCE(wp.actual_mass, 0) / COALESCE(wp.target_mass, ROUND(mfi.target_mass * ${scalingFactor}, 2))) * 100, 2)
           ELSE 0
         END as progress_percentage,
         -- Calculate remaining weight using SCALED target_mass
         GREATEST(0, 
           COALESCE(wp.target_mass, ROUND(mfi.target_mass * ${scalingFactor}, 2)) - COALESCE(wp.actual_mass, 0)
         ) as remaining_weight,
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
       ORDER BY COALESCE(mfi.sequence_order, 999999), mfi.created_at ASC`,
      [wo.id, wo.formulation_id]
    );
    
    const scalingFactorDisplay = wo.planned_quantity ? (wo.planned_quantity / 1000).toFixed(2) : '1.00';
    console.log(`📊 Loaded work order ${mo} with ${ingResult.rows.length} ingredients (Quantity: ${wo.planned_quantity || 1000}g, Scaling: ${scalingFactorDisplay}x)`);
    ingResult.rows.forEach(ing => {
      console.log(`   - ${ing.product_name}: ${ing.actual_mass}g / ${ing.target_mass}g (${ing.progress_percentage}%), Status: ${ing.status} (Base: ${ing.base_target_mass || 'N/A'}g)`);
    });
    
    res.json({ success: true, data: { workOrder: wo, ingredients: ingResult.rows } });
  } catch (error) {
    console.error('Error fetching work order detail:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch work order', details: error.message });
  }
});

// Reactivate cancelled MO (QC only)
app.post('/api/work-orders/:mo/reactivate', async (req, res) => {
  const { mo } = req.params; // Define mo at function scope so it's available in catch block
  try {
    const { note, qcUserId } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Note is required for reactivation'
      });
    }

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

    // Start transaction
    await pool.query('BEGIN');

    // Check if work order exists and is cancelled/reject
    const woCheck = await pool.query(
      `SELECT id, status, work_order_number, formulation_id
       FROM work_orders 
       WHERE work_order_number = $1`,
      [mo]
    );

    if (woCheck.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Work order not found'
      });
    }

    const workOrder = woCheck.rows[0];

    const allowedStatuses = ['cancelled', 'reject'];
    if (!allowedStatuses.includes(workOrder.status)) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Work order status is '${workOrder.status}', only '${allowedStatuses.join("', '")}' MOs can be reactivated`
      });
    }

    // Mark ingredients that previously violated tolerance (actual_mass > tolerance_max) as completed
    // Reason: If reject because exceeds tolerance, the ingredient already has weight (even if over target)
    // So it should be marked as completed, not reset to 0 for re-weighing
    const violatingProgressResult = await pool.query(
      `SELECT id, ingredient_id, actual_mass, tolerance_max, target_mass
       FROM weighing_progress
       WHERE work_order_id = $1
         AND tolerance_max IS NOT NULL
         AND actual_mass > tolerance_max
         AND status != 'completed'`,
      [workOrder.id]
    );

    if (violatingProgressResult.rows.length > 0) {
      const progressIds = violatingProgressResult.rows.map(row => row.id);
      const ingredientIds = Array.from(new Set(violatingProgressResult.rows.map(row => row.ingredient_id)));

      // Mark violating ingredients as completed (keep actual_mass, just change status)
      await pool.query(
        `UPDATE weighing_progress
         SET status = 'completed',
             completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($1::uuid[])`,
        [progressIds]
      );

      // Update weighing sessions to completed status for these ingredients
      if (ingredientIds.length > 0) {
        await pool.query(
          `UPDATE weighing_sessions
           SET status = 'completed',
               session_completed_at = COALESCE(session_completed_at, CURRENT_TIMESTAMP)
           WHERE work_order_id = $1
             AND ingredient_id = ANY($2::uuid[])
             AND status != 'completed'`,
          [workOrder.id, ingredientIds]
        );
      }

      console.log(`✅ Marked ${progressIds.length} violating ingredient(s) as completed for MO ${mo} during reactivation`);
      violatingProgressResult.rows.forEach(row => {
        console.log(`   - Ingredient ${row.ingredient_id}: ${row.actual_mass}g (target: ${row.target_mass}g, max: ${row.tolerance_max}g) -> COMPLETED`);
      });
    }

    // Check if all ingredients are completed (after marking violating ones as completed)
    if (!workOrder.formulation_id) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Work order has no formulation_id'
      });
    }
    
    const totalIngredientsResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM master_formulation_ingredients 
       WHERE formulation_id = $1`,
      [workOrder.formulation_id]
    );
    
    const totalIngredients = parseInt(totalIngredientsResult.rows[0]?.total || 0);
    
    const completedIngredientsResult = await pool.query(
      `SELECT COUNT(*) as completed_count
       FROM weighing_progress 
       WHERE work_order_id = $1 AND status = 'completed'`,
      [workOrder.id]
    );
    
    const completedIngredients = parseInt(completedIngredientsResult.rows[0]?.completed_count || 0);
    
    // Determine final status: if all ingredients completed, mark MO as completed, otherwise in_progress
    const finalStatus = (totalIngredients > 0 && completedIngredients === totalIngredients) ? 'completed' : 'in_progress';
    
    console.log(`📊 Reactivation check: ${completedIngredients}/${totalIngredients} ingredients completed -> MO status: ${finalStatus}`);

    // Check which columns exist in work_orders table
    let hasStartedAtColumn = false;
    let hasQcReactivateNoteColumn = false;
    let hasQcReactivatedByColumn = false;
    let hasQcReactivatedAtColumn = false;
    
    try {
      const columnCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'work_orders'
        AND column_name IN ('started_at', 'qc_reactivate_note', 'qc_reactivated_by', 'qc_reactivated_at')
      `);
      
      const existingColumns = columnCheck.rows.map(row => row.column_name);
      hasStartedAtColumn = existingColumns.includes('started_at');
      hasQcReactivateNoteColumn = existingColumns.includes('qc_reactivate_note');
      hasQcReactivatedByColumn = existingColumns.includes('qc_reactivated_by');
      hasQcReactivatedAtColumn = existingColumns.includes('qc_reactivated_at');
      
      console.log(`📋 Column check: started_at=${hasStartedAtColumn}, qc_reactivate_note=${hasQcReactivateNoteColumn}, qc_reactivated_by=${hasQcReactivatedByColumn}, qc_reactivated_at=${hasQcReactivatedAtColumn}`);
    } catch (checkError) {
      console.warn('⚠️  Could not check for columns, assuming they do not exist:', checkError.message);
    }

    // Build SET clause and parameters dynamically based on column existence
    const setClauses = [];
    const queryParams = [];
    let paramIndex = 1;
    
    // Always add status first (required)
    setClauses.push(`status = $${paramIndex}`);
    queryParams.push(finalStatus);
    paramIndex++;
    
    // Always add updated_at (no parameter needed)
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add QC reactivate note if column exists
    if (hasQcReactivateNoteColumn) {
      setClauses.push(`qc_reactivate_note = $${paramIndex}`);
      queryParams.push(note.trim());
      paramIndex++;
    }
    
    // Add QC reactivated by if column exists
    if (hasQcReactivatedByColumn) {
      setClauses.push(`qc_reactivated_by = $${paramIndex}`);
      queryParams.push(qcUserId || null);
      paramIndex++;
    }
    
    // Add QC reactivated at if column exists (no parameter needed)
    if (hasQcReactivatedAtColumn) {
      setClauses.push(`qc_reactivated_at = CURRENT_TIMESTAMP`);
    }
    
    // Add started_at if column exists (no parameter needed)
    if (hasStartedAtColumn) {
      setClauses.push(`started_at = COALESCE(started_at, CURRENT_TIMESTAMP)`);
    }
    
    // Add completed_at - use direct comparison with finalStatus value instead of parameter
    // This avoids type inference issues when same parameter is used in different contexts
    if (finalStatus === 'completed') {
      setClauses.push(`completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)`);
    } else {
      setClauses.push(`completed_at = completed_at`); // Keep existing value
    }
    
    // Add work_order_id parameter for WHERE clause (always last)
    const workOrderIdParamIndex = paramIndex;
    queryParams.push(workOrder.id);
    
    // Build RETURNING clause
    const returningColumns = ['id', 'work_order_number', 'status', 'updated_at'];
    if (hasQcReactivateNoteColumn) returningColumns.push('qc_reactivate_note');
    if (hasQcReactivatedAtColumn) returningColumns.push('qc_reactivated_at');
    returningColumns.push('completed_at');
    
    // Build final query
    const setClauseStr = setClauses.join(', ');
    const whereClause = `id = $${workOrderIdParamIndex}`;
    
    const updateQuery = `
      UPDATE work_orders 
      SET ${setClauseStr}
      WHERE ${whereClause}
      RETURNING ${returningColumns.join(', ')}
    `;

    console.log(`🔧 Reactivate query: ${updateQuery}`);
    console.log(`🔧 Query params (${queryParams.length}):`, queryParams.map((p, i) => `$${i+1}=${typeof p === 'string' ? `'${p}'` : p}`).join(', '));

    const updateResult = await pool.query(updateQuery, queryParams);

    // Commit transaction
    await pool.query('COMMIT');

    const reactivatedWorkOrder = updateResult.rows[0];
    const statusMessage = finalStatus === 'completed' 
      ? `MO berhasil diaktifkan kembali dan otomatis diselesaikan (semua bahan sudah completed)`
      : 'MO berhasil diaktifkan kembali';
    
    console.log(`✅ MO ${mo} reactivated by QC. Status: ${finalStatus}. Note: ${note.substring(0, 50)}...`);

    res.json({
      success: true,
      message: statusMessage,
      data: {
        workOrder: reactivatedWorkOrder,
        reactivatedAt: hasQcReactivatedAtColumn ? reactivatedWorkOrder.qc_reactivated_at : new Date().toISOString(),
        autoCompleted: finalStatus === 'completed'
      }
    });
  } catch (error) {
    // Rollback on error
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }

    console.error('❌ Error reactivating work order:', error);
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error stack:', error.stack);
    console.error('   MO number:', mo);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to reactivate work order';
    if (error.code === '42703') {
      errorMessage = `Database column error: ${error.message}. Please run setup-database.bat to apply migrations.`;
    } else if (error.code === '23503') {
      errorMessage = `Foreign key constraint error: ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
      code: error.code
    });
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

      // Full Refresh: Delete existing master data before import
      // IMPORTANT: We preserve operational data (work_orders, weighing_progress, etc.) to keep history
      // Only delete master data that can be safely replaced
      if (fullRefresh) {
        console.log('🗑️  Full Refresh: Deleting existing master data (preserving history)...');
        
        // Delete in correct order to respect foreign key constraints
        // 1. First, delete referencing data that points to master_formulation_ingredients
        //    BUT we preserve work_orders and weighing_progress to keep history
        //    Instead, we need to handle this differently - only delete master data that doesn't have references
        
        // Check if there are any active work_orders or weighing_progress referencing the master data
        const activeReferencesCheck = await pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM work_orders) as work_orders_count,
            (SELECT COUNT(*) FROM weighing_progress) as weighing_progress_count,
            (SELECT COUNT(*) FROM weighing_sessions) as weighing_sessions_count
        `);
        
        const refCounts = activeReferencesCheck.rows[0];
        const hasHistory = parseInt(refCounts.work_orders_count || 0) > 0 || 
                          parseInt(refCounts.weighing_progress_count || 0) > 0 ||
                          parseInt(refCounts.weighing_sessions_count || 0) > 0;
        
        if (hasHistory) {
          console.log('📋 Found existing production history. Preserving history while updating master data...');
          console.log(`   - Work Orders: ${refCounts.work_orders_count}`);
          console.log(`   - Weighing Progress: ${refCounts.weighing_progress_count}`);
          console.log(`   - Weighing Sessions: ${refCounts.weighing_sessions_count}`);
          
          // When history exists, we can't delete master_formulation_ingredients directly
          // because weighing_progress references it (without CASCADE)
          // Solution: Only delete master data that is NOT referenced by operational data
          
          // Instead of deleting, we'll use UPDATE to mark as inactive or use soft delete
          // OR we can use a different strategy: update existing and insert new
          
          // For now, let's update the import strategy to handle this:
          // 1. Update existing master data if exists
          // 2. Insert new master data if not exists
          // This way we preserve history while allowing master data updates
          
          console.log('✅ History preserved. Import will update/insert master data without deleting.');
          console.log('   Note: Existing formulations/ingredients may remain if referenced by history.');
        } else {
          // No history exists, safe to delete master data
          console.log('✅ No production history found. Safe to delete master data.');
          
          // Delete in correct order (respecting foreign keys)
          // 1. Delete master_formulation_ingredients (has FK to master_formulation)
          await pool.query('DELETE FROM master_formulation_ingredients');
          console.log('✅ Deleted master_formulation_ingredients');
          
          // 2. Delete master_formulation (has FK to master_product via work_orders, but if no work_orders, safe)
          await pool.query('DELETE FROM master_formulation');
          console.log('✅ Deleted master_formulation');
          
          // 3. Delete master_product (raw only, preserves SFG products)
          await pool.query("DELETE FROM master_product WHERE product_category = 'raw'");
          console.log('✅ Deleted master_product (raw only)');
        }
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
          // Full refresh: Use UPSERT to handle existing products (when history exists)
          // This allows updating master data while preserving history
          const existingProduct = await pool.query(
            'SELECT id, product_name FROM master_product WHERE product_code = $1',
            [code]
          );
          
          if (existingProduct.rows.length > 0) {
            // Update existing product
            await pool.query(
              `UPDATE master_product 
               SET product_name = $1, product_category = $2, type_tolerance = $3, 
                   status = 'active', updated_at = CURRENT_TIMESTAMP
               WHERE product_code = $4`,
              [product.name, product.category, product.type_tolerance, code]
            );
            
            comparison.updated_products++;
            comparison.changes.push({
              type: 'updated',
              table: 'master_product',
              description: `Updated product ${code}`,
              old_value: existingProduct.rows[0].product_name,
              new_value: product.name
            });
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
          // Full refresh: Use UPSERT to handle existing formulations (when history exists)
          // This allows updating master data while preserving history
          const existingFormulation = await pool.query(
            'SELECT id, formulation_name FROM master_formulation WHERE formulation_code = $1',
            [code]
          );
          
          if (existingFormulation.rows.length > 0) {
            // Update existing formulation
            await pool.query(
              `UPDATE master_formulation 
               SET formulation_name = $1, sku = $2, status = 'active', updated_at = CURRENT_TIMESTAMP
               WHERE formulation_code = $3`,
              [formulation.name, formulation.code, code]
            );
            
            comparison.updated_products++; // Reuse counter for formulations
            comparison.changes.push({
              type: 'updated',
              table: 'master_formulation',
              description: `Updated formulation ${code}`,
              old_value: existingFormulation.rows[0].formulation_name,
              new_value: formulation.name
            });
          } else {
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
      
      // Process formulation ingredients with sequence_order based on import order
      let successfulIngredients = 0;
      let failedIngredients = 0;
      
      console.log(`🔄 Processing ${formulationIngredients.length} formulation ingredients...`);
      console.log(`   Available formulations: ${formulationMap.size}`);
      console.log(`   Available products: ${productMap.size}`);
      
      // Group ingredients by formulation and preserve CSV order
      // CRITICAL: Track first occurrence of each (formulation_id, product_id) pair to maintain import order
      // This ensures that if the same product appears multiple times in CSV for the same formulation,
      // only the first occurrence is used for sequence_order calculation
      const formulationIngredientGroups = new Map();
      const seenIngredients = new Map(); // Track (formulationId, productCode) -> first CSV index
      
      // First pass: Build groups and track first occurrence order per formulation
      // Process ingredients in CSV order to preserve import sequence
      for (let csvIndex = 0; csvIndex < formulationIngredients.length; csvIndex++) {
        const fi = formulationIngredients[csvIndex];
        const formulationId = formulationMap.get(fi.formulationCode);
        
        if (!formulationId) {
          console.warn(`⚠️  Formulation not found: ${fi.formulationCode} at CSV row ${csvIndex + 1}`);
          failedIngredients++;
          continue;
        }
        
        const productId = productMap.get(fi.productCode);
        if (!productId) {
          console.warn(`⚠️  Product not found: ${fi.productCode} (for formulation ${fi.formulationCode}) at CSV row ${csvIndex + 1}`);
          failedIngredients++;
          continue;
        }
        
        // Create key for tracking first occurrence: formulationId:productCode
        const ingredientKey = `${formulationId}:${fi.productCode}`;
        
        // Only track first occurrence to maintain import order
        // If same product appears multiple times in CSV for same formulation, ignore duplicates
        if (!seenIngredients.has(ingredientKey)) {
          seenIngredients.set(ingredientKey, csvIndex);
          
          if (!formulationIngredientGroups.has(formulationId)) {
            formulationIngredientGroups.set(formulationId, []);
          }
          
          // Store with original CSV index to preserve order
          formulationIngredientGroups.get(formulationId).push({
            ...fi,
            productId: productId,
            csvIndex: csvIndex
          });
        } else {
          console.log(`ℹ️  Skipping duplicate ingredient ${fi.productCode} for formulation ${fi.formulationCode} at CSV row ${csvIndex + 1} (first occurrence at row ${seenIngredients.get(ingredientKey) + 1})`);
        }
      }
      
      // Insert ingredients with sequence_order based on import order (CSV order)
      // For each formulation, ingredients are ordered by their first appearance in CSV
      // IMPORTANT: Sort by csvIndex ASC to ensure first CSV row gets sequence_order 1
      for (const [formulationId, ingredients] of formulationIngredientGroups) {
        // Sort ingredients by their CSV index ASCENDING (smallest first = first in CSV)
        ingredients.sort((a, b) => a.csvIndex - b.csvIndex);
        
        // Get formulation code for logging (reverse lookup: id -> code)
        const formulationCode = Array.from(formulationMap.entries()).find(([code, id]) => id === formulationId)?.[0] || 
                                Array.from(formulationsMap.entries()).find(([code]) => formulationMap.get(code) === formulationId)?.[0] || 
                                'UNKNOWN';
        
        console.log(`📋 Processing formulation ${formulationCode} (ID: ${formulationId}) with ${ingredients.length} ingredients in CSV order:`);
        ingredients.forEach((ing, idx) => {
          console.log(`   ${idx + 1}. ${ing.productCode} (CSV row: ${ing.csvIndex + 1})`);
        });
        
        // Assign sequence_order: first ingredient in sorted array (lowest csvIndex) gets sequence_order 1
        for (let index = 0; index < ingredients.length; index++) {
          const fi = ingredients[index];
          const productId = fi.productId; // Already resolved in first pass
          // sequence_order = 1 for first ingredient (lowest csvIndex), 2 for second, etc.
          const sequenceOrder = index + 1; // Start from 1 (represents order in formulation)
        
        try {
          await pool.query(
              `INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass, sequence_order)
               VALUES ($1, $2, $3, $4)
             ON CONFLICT (formulation_id, product_id) DO UPDATE
               SET target_mass = EXCLUDED.target_mass, 
                   sequence_order = EXCLUDED.sequence_order,
                   updated_at = CURRENT_TIMESTAMP`,
              [formulationId, productId, fi.targetMass, sequenceOrder]
          );
          successfulIngredients++;
            console.log(`✅ Inserted ingredient ${fi.productCode} for formulation ${formulationCode} with sequence_order=${sequenceOrder}`);
        } catch (err) {
          console.error(`❌ Error inserting ingredient for ${fi.formulationCode}: ${fi.productCode}:`, err.message);
          console.error(`   Formulation ID: ${formulationId}, Product ID: ${productId}`);
          failedIngredients++;
          }
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

// Get print history endpoint (temporary storage for 3 days)
app.get('/api/print-history', async (req, res) => {
  try {
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

    // Clean up old records (older than 3 days) before fetching
    await pool.query(
      `DELETE FROM print_history WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '3 days'`
    ).catch(err => {
      console.warn('⚠️  Failed to cleanup old print history (non-critical):', err.message);
    });

    // Check if table exists first
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'print_history'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.warn('⚠️  print_history table does not exist. Please run migration script.');
      return res.json({
        success: true,
        data: [],
        count: 0,
        byWorkOrder: {},
        message: 'print_history table does not exist. Please run setup-print-history.bat'
      });
    }

    // Get query parameter for filtering by work order
    const { workOrder } = req.query;

    // Build query with optional work order filter
    let query = `
      SELECT 
        id,
        work_order,
        ingredient_name,
        sku_name,
        current_weight,
        target_weight,
        remaining_weight,
        operator_name,
        mo_number,
        print_data,
        weighing_time,
        printed_at,
        created_at
      FROM print_history
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '3 days'
    `;
    
    const queryParams = [];
    if (workOrder) {
      query += ` AND work_order = $1`;
      queryParams.push(workOrder);
    }
    
    query += ` ORDER BY weighing_time DESC, created_at DESC`;
    
    const result = await pool.query(query, queryParams);
    console.log(`📋 Print history query returned ${result.rows.length} records${workOrder ? ` for work order: ${workOrder}` : ''}`);
    
    const mappedData = result.rows.map(row => {
      try {
        return {
          ...row,
          print_data: typeof row.print_data === 'string' ? JSON.parse(row.print_data) : row.print_data
        };
      } catch (parseError) {
        console.warn('⚠️  Error parsing print_data for row:', row.id, parseError.message);
        return {
          ...row,
          print_data: {}
        };
      }
    });

    // Group by work order for statistics
    const byWorkOrder = {};
    mappedData.forEach(item => {
      const wo = item.work_order;
      if (!byWorkOrder[wo]) {
        byWorkOrder[wo] = {
          workOrder: wo,
          count: 0,
          items: []
        };
      }
      byWorkOrder[wo].count++;
      byWorkOrder[wo].items.push(item);
    });
    
    res.json({
      success: true,
      data: mappedData,
      count: result.rows.length,
      byWorkOrder: byWorkOrder
    });
  } catch (error) {
    console.error('❌ Error fetching print history:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    
    // Check if it's a table not found error
    if (error.code === '42P01') {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        byWorkOrder: {},
        error: 'Table print_history does not exist',
        message: 'Please run setup-print-history.bat to create the table'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch print history',
      details: error.message,
      code: error.code
    });
  }
});

// Print batch endpoint (print all stored print history)
app.post('/api/print/batch', async (req, res) => {
  try {
    const { 
      workOrder = null, // Optional: filter by work order
      printMethod = 'windows-raw',
      printerPort,
      printerIP,
      networkPort = 9100,
      comPort,
      baudRate = 9600,
      async = true
    } = req.body;

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

    // Build query to get print history
    let query = `
      SELECT 
        id,
        work_order,
        ingredient_name,
        sku_name,
        current_weight,
        target_weight,
        remaining_weight,
        operator_name,
        mo_number,
        print_data,
        weighing_time
      FROM print_history
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '3 days'
    `;
    
    const queryParams = [];
    if (workOrder) {
      query += ` AND work_order = $1`;
      queryParams.push(workOrder);
    }
    
    query += ` ORDER BY weighing_time ASC, created_at ASC`; // Print in chronological order
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No print history found',
        printed: 0,
        total: 0
      });
    }

    const printHistory = result.rows.map(row => ({
      ...row,
      print_data: typeof row.print_data === 'string' ? JSON.parse(row.print_data) : row.print_data
    }));

    console.log(`🖨️  Batch print: ${printHistory.length} receipts to print`);

    // If async mode, return immediately and process print in background
    if (async !== false) {
      res.json({
        success: true,
        message: `Print batch job queued: ${printHistory.length} receipts`,
        total: printHistory.length,
        status: 'processing'
      });

      // Process print in background
      setImmediate(async () => {
        let successCount = 0;
        let failCount = 0;

        for (const history of printHistory) {
          try {
            const receiptData = history.print_data.receipt || 
                              Buffer.from(history.print_data.receiptBase64 || '', 'base64').toString('utf8');
            
            if (!receiptData) {
              console.warn(`⚠️  No receipt data for ${history.work_order} - ${history.ingredient_name}`);
              failCount++;
              continue;
            }

            let printResult;
            switch (printMethod) {
              case 'network-tcp':
                if (!printerIP) {
                  console.error('❌ Missing printerIP for network method');
                  failCount++;
                  continue;
                }
                printResult = await printZPL_Network(receiptData, printerIP, networkPort);
                break;
                
              case 'serial-com':
                if (!comPort) {
                  console.error('❌ Missing comPort for serial method');
                  failCount++;
                  continue;
                }
                printResult = await printZPL_Serial(receiptData, comPort, baudRate);
                break;
                
              case 'windows-raw':
              default:
                printResult = await sendToPrinterXP420_USB(receiptData, printerPort);
                break;
            }

            if (printResult && printResult.success) {
              successCount++;
              console.log(`✅ Printed: ${history.work_order} - ${history.ingredient_name}`);
            } else {
              failCount++;
              console.warn(`⚠️  Failed to print: ${history.work_order} - ${history.ingredient_name}`);
            }

            // Small delay between prints to avoid overwhelming printer
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            failCount++;
            console.error(`❌ Error printing ${history.work_order} - ${history.ingredient_name}:`, err.message);
          }
        }

        console.log(`📊 Batch print completed: ${successCount} success, ${failCount} failed`);
      });

      return;
    }

    // Synchronous mode - wait for all prints to complete
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const history of printHistory) {
      try {
        const receiptData = history.print_data.receipt || 
                          Buffer.from(history.print_data.receiptBase64 || '', 'base64').toString('utf8');
        
        if (!receiptData) {
          failCount++;
          errors.push(`No receipt data for ${history.work_order} - ${history.ingredient_name}`);
          continue;
        }

        let printResult;
        switch (printMethod) {
          case 'network-tcp':
            if (!printerIP) {
              failCount++;
              errors.push('Missing printerIP for network method');
              continue;
            }
            printResult = await printZPL_Network(receiptData, printerIP, networkPort);
            break;
            
          case 'serial-com':
            if (!comPort) {
              failCount++;
              errors.push('Missing comPort for serial method');
              continue;
            }
            printResult = await printZPL_Serial(receiptData, comPort, baudRate);
            break;
            
          case 'windows-raw':
          default:
            printResult = await sendToPrinterXP420_USB(receiptData, printerPort);
            break;
        }

        if (printResult && printResult.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`Failed to print ${history.work_order} - ${history.ingredient_name}`);
        }

        // Small delay between prints
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        failCount++;
        errors.push(`${history.work_order} - ${history.ingredient_name}: ${err.message}`);
      }
    }

    res.json({
      success: failCount === 0,
      message: `Batch print completed: ${successCount} success, ${failCount} failed`,
      printed: successCount,
      failed: failCount,
      total: printHistory.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in batch print:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch print',
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
  res.sendFile(path.join(distDir, 'index.html'));
});

// Global error handler for unhandled promise rejections in routes
process.on('unhandledRejection', (reason, promise) => {
  const errorMsg = `❌ Unhandled Rejection at: ${promise}, reason: ${reason}`;
  console.error(errorMsg);
  logToFile(errorMsg);
  if (reason && reason.stack) {
    logToFile(`Stack: ${reason.stack}`);
  }
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  // Filter out known non-fatal serialport errors
  const isSerialPortError = error.message && (
    error.message.includes('Writing to COM port') ||
    error.message.includes('GetOverlappedResult') ||
    error.message.includes('Operation aborted') ||
    error.message.includes('ENOENT') ||
    error.name === 'SerialPortError'
  );
  
  if (isSerialPortError) {
    // Log serialport errors but don't crash - these are often non-fatal
    logToFile(`⚠️  Serial port error (non-fatal): ${error.message}`);
    if (DEBUG_SCALE) console.debug('Serial port error (ignored):', error.message);
    return; // Don't exit on serialport errors
  }
  
  // For other errors, log and exit
  const errorMsg = `❌ Uncaught Exception: ${error.message}`;
  console.error(errorMsg);
  console.error(error.stack);
  logToFile(errorMsg);
  logToFile(`Stack: ${error.stack}`);
  
  // Keep process alive but log the error
  // Don't exit immediately to allow file logging to complete
  setTimeout(() => {
    // Log file is written synchronously, no need to close stream
    process.exit(1);
  }, 1000);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const url = `http://localhost:${PORT}`;
  logToFile(`🚀 Server running on ${url}`);
  logToFile(`📊 API endpoints available at ${url}/api/`);
  logToFile(`💡 Health check: ${url}/api/health`);
  logToFile(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws/scale`);
  logToFile(`📁 Serving static files from: ${distDir}`);
  
  // Display log file location prominently
  if (logFilePath) {
    logToFile(`📝 Log file location: ${logFilePath}`);
    console.log('');
    console.log('='.repeat(80));
    console.log(`📝 LOG FILE LOCATION: ${logFilePath}`);
    console.log('   (Check this file if server crashes or encounters errors)');
    console.log('='.repeat(80));
    console.log('');
  }
  
  // Auto-open browser after server starts (delay to ensure server is ready)
  setTimeout(() => {
    logToFile(`\n🌐 Opening browser at ${url}...`);
    
    const { exec } = require('child_process');
    const os = require('os');
    
    // Platform-specific command to open browser
    let command;
    if (os.platform() === 'win32') {
      // Windows: use 'start' command
      command = `start ${url}`;
    } else if (os.platform() === 'darwin') {
      // macOS: use 'open' command
      command = `open ${url}`;
    } else {
      // Linux: use 'xdg-open' command
      command = `xdg-open ${url}`;
    }
    
    exec(command, (error) => {
      if (error) {
        logToFile(`⚠️ Could not auto-open browser. Please manually open: ${url}`);
      } else {
        logToFile(`✅ Browser opened successfully`);
      }
    });
  }, 1000); // Wait 1 second to ensure server is fully ready
}).on('error', (error) => {
  const errorMsg = `❌ FATAL ERROR: Server failed to start on port ${PORT}`;
  const errorDetails = `Error: ${error.message}`;
  
  console.error(errorMsg);
  console.error(errorDetails);
  console.error(error.stack);
  
  logToFile(errorMsg);
  logToFile(errorDetails);
  logToFile(`Stack: ${error.stack}`);
  
  // Check if port is already in use
  if (error.code === 'EADDRINUSE') {
    logToFile(`⚠️  Port ${PORT} is already in use. Please stop the process using this port or change the PORT environment variable.`);
    logToFile(`💡 To find process using port ${PORT} on Windows: netstat -ano | findstr :${PORT}`);
  }
  
  // Keep process alive for a moment to allow logging to complete
  setTimeout(() => {
    // Log file is written synchronously, no need to close stream
    process.exit(1);
  }, 2000);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logToFile('\n🛑 Shutting down server...');
  
  // Stop continuous reading
  if (continuousReadingActive) {
    stopContinuousReading();
  }
  
  // Close WebSocket server
  wss.close(() => {
    logToFile('✅ WebSocket server closed');
  });
  
  // Close active serial port
  if (activePort && activePort.isOpen) {
    activePort.close(() => {
      logToFile('✅ Serial port closed');
    });
  }
  
  await pool.end();
  
  // Log final message before exit
  logToFile('✅ Server shutdown complete');
  
  // Log file is written synchronously, no need to close stream
  process.exit(0);
});

module.exports = app;

