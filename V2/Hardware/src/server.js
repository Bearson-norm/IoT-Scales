'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const http = require('http');
const WebSoc ket = require('ws');

// RS232 configuration (Vibra): 9600 baud, 8 data bits, 2 stop bits, parity none
const SERIAL_CONFIG = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 2,
  parity: 'none'
};

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static UI
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));
app.use(express.json());

let serialPort = null;
let parser = null;
let lastWeightKg = 0;
let dataCount = 0;
let startTimeMs = 0;
let rawBuffer = '';
let totalBytes = 0;
let lastRawPreview = '';
let pollTimer = null;
let pollIntervalMs = 200;
let zeroOffsetKg = 0;

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function parseWeightFromLine(raw) {
  // Primary: 7-digit numeric payload -> grams
  const m = raw.match(/\d{7}/);
  if (m) {
    const grams = parseInt(m[0], 10);
    return grams / 1000; // kg
  }
  return null;
}

async function listPorts() {
  try {
    const ports = await SerialPort.list();
    return ports.map(p => ({
      path: p.path,
      manufacturer: p.manufacturer || null,
      friendlyName: p.friendlyName || p.path
    }));
  } catch (e) {
    return [];
  }
}

app.get('/api/ports', async (_req, res) => {
  res.json(await listPorts());
});

app.post('/api/connect', async (req, res) => {
  const body = req.body || {};
  const portPath = body.path || body.port;
  if (!portPath) return res.status(400).json({ ok: false, error: 'Missing port path', received: body });

  try {
    // Validate requested port exists to avoid confusing errors
    const available = await listPorts();
    if (!available.some(p => p.path === portPath)) {
      return res.status(400).json({ ok: false, error: `Port not found: ${portPath}`, available });
    }

    if (serialPort && serialPort.isOpen) serialPort.close();

    const normalizedPath = normalizeWindowsComPath(portPath);
    serialPort = new SerialPort({
      path: normalizedPath,
      ...SERIAL_CONFIG,
      rtscts: false,
      xon: false,
      xoff: false,
      xany: false
    });

    // Prefer raw data listener to handle devices without newline
    startTimeMs = Date.now();
    dataCount = 0;
    rawBuffer = '';

    serialPort.on('open', () => {
      // Many scales require control lines asserted to start streaming
      try { serialPort.set({ dtr: true, rts: true }); } catch {}
      // Try common print/query commands (non-fatal if ignored)
      try { serialPort.write('\r'); } catch {}
      try { serialPort.write('P\r'); } catch {}
      try { serialPort.write('Q\r'); } catch {}
      // Start polling by default
      startPolling();
    });

    serialPort.on('data', (chunk) => {
      const str = chunk.toString('ascii');
      totalBytes += chunk.length;
      // keep a short preview for debugging (printable only)
      const printable = str.replace(/[^\x20-\x7E\r\n]/g, '.');
      lastRawPreview = printable.slice(-64);
      rawBuffer += str;

      // Process complete lines if present
      const parts = rawBuffer.split(/\r?\n/);
      rawBuffer = parts.pop() || '';
      parts.forEach(processIncomingLine);
    });

    serialPort.on('error', (err) => {
      broadcast({ type: 'error', message: err.message });
    });

    serialPort.on('close', () => {
      broadcast({ type: 'status', connected: false });
    });

    broadcast({ type: 'status', connected: true, port: normalizedPath });
    res.json({ ok: true, port: normalizedPath });
  } catch (e) {
    res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});

function normalizeWindowsComPath(p) {
  // For Windows COM10+ require \\.\n+  // Keep as-is for non-Windows or already normalized paths
  if (process.platform !== 'win32') return p;
  if (!p) return p;
  const m = /^COM(\d+)$/i.exec(p);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 10) return `\\\\.\\${p}`;
  }
  return p;
}

app.post('/api/disconnect', (_req, res) => {
  try {
    if (parser) parser.removeAllListeners();
    if (serialPort) {
      if (serialPort.isOpen) serialPort.close();
      serialPort = null;
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/status', (_req, res) => {
  const elapsedMin = startTimeMs ? (Date.now() - startTimeMs) / 60000 : 0;
  res.json({
    connected: !!(serialPort && serialPort.isOpen),
    lastWeightKg,
    dataPerMin: elapsedMin > 0 ? Math.round(dataCount / elapsedMin) : 0,
    uptimeMs: startTimeMs ? (Date.now() - startTimeMs) : 0
  });
});

app.get('/api/debug', async (_req, res) => {
  res.json({
    ports: await listPorts(),
    connected: !!(serialPort && serialPort.isOpen),
    lastWeightKg,
    zeroOffsetKg,
    bufferLen: rawBuffer.length,
    bytesTotal: totalBytes,
    lastRawPreview,
    config: SERIAL_CONFIG
  });
});

app.post('/api/tare', (_req, res) => {
  zeroOffsetKg = lastWeightKg;
  res.json({ ok: true, zeroOffsetKg });
});

app.post('/api/tare/clear', (_req, res) => {
  zeroOffsetKg = 0;
  res.json({ ok: true, zeroOffsetKg });
});

function processIncomingLine(line) {
  const trimmed = String(line).trim();
  const w = parseWeightSmart(trimmed);
  if (w == null || Number.isNaN(w)) return;
  const stable = Math.abs(w - lastWeightKg) < 0.001;
  lastWeightKg = w;
  dataCount += 1;
  const net = clampNearZero(w - zeroOffsetKg);
  broadcast({ type: 'weight', kg: net, grossKg: w, stable, t: Date.now() });
}

function parseWeightSmart(raw) {
  // Vibra format e.g.: "+000085.9 G S" (sign)(6 digits).(1 digit) space UNIT space STATUS
  const vibra = raw.match(/^\s*([+\-]?)\s*(\d{6}\.\d)\s+([GKgk])\s+([SsIi])/);
  if (vibra) {
    const sign = vibra[1] === '-' ? -1 : 1;
    const value = parseFloat(vibra[2]);
    const unit = vibra[3].toUpperCase();
    let kg = value * sign;
    if (unit === 'G') kg = kg / 1000;
    return kg;
  }

  // Fallback: signed decimal with optional unit (less strict)
  const mDec = raw.match(/([+\-]?\d+\.\d+)\s*([gkGKgK])?/);
  if (mDec && mDec[1]) {
    const val = parseFloat(mDec[1]);
    const unit = (mDec[2] || 'K').toUpperCase();
    return unit === 'G' ? val / 1000 : val;
  }
  return null;
}

function clampNearZero(val) {
  if (Math.abs(val) < 0.0005) return 0;
  return val;
}

function startPolling(interval = pollIntervalMs) {
  stopPolling();
  if (!serialPort || !serialPort.isOpen) return;
  pollIntervalMs = Math.max(50, Number(interval) || 200);
  pollTimer = setInterval(() => {
    try { serialPort.write('P\r'); } catch {}
  }, pollIntervalMs);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

app.post('/api/poll/start', (req, res) => {
  const ms = (req.body && req.body.intervalMs) || pollIntervalMs;
  startPolling(ms);
  res.json({ ok: true, intervalMs: pollIntervalMs });
});

app.post('/api/poll/stop', (_req, res) => {
  stopPolling();
  res.json({ ok: true });
});

// Basic index if UI missing
const indexHtmlPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  fs.writeFileSync(indexHtmlPath, '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vibra Scale</title></head><body><h1>Vibra Scale Reader</h1><p>UI missing. Please add public/index.html</p></body></html>');
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


