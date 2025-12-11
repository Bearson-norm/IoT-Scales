/**
 * Contoh Integrasi dengan UI
 * 
 * File ini menunjukkan cara mengintegrasikan data parsing dengan UI
 * Copy logic ini ke scaleReader.js atau gunakan sebagai referensi
 */

// Import scaleReader functions (atau copy fungsi parseScaleData)
const { parseScaleData } = require('./scaleReader');

// ==========================================
// CONTOH 1: Event Emitter (Node.js Events)
// ==========================================

const EventEmitter = require('events');
const scaleEvents = new EventEmitter();

// Di UI/Component, dengarkan event:
scaleEvents.on('scaleData', (parsedData) => {
  console.log('Data diterima:', parsedData);
  // Update UI di sini
  updateUI(parsedData);
});

// Di scaleReader.js, emit event setelah parsing:
function emitScaleData(parsedData) {
  if (!parsedData.error) {
    scaleEvents.emit('scaleData', parsedData);
  }
}

// ==========================================
// CONTOH 2: Callback Function
// ==========================================

let uiCallback = null;

// Set callback dari UI
function setUICallback(callback) {
  uiCallback = callback;
}

// Panggil callback setelah parsing
function notifyUI(parsedData) {
  if (uiCallback && !parsedData.error) {
    uiCallback(parsedData);
  }
}

// Di UI, set callback:
setUICallback((data) => {
  updateWeightDisplay(data);
  updateStatusBadge(data);
  updateTimestamp(data);
});

// ==========================================
// CONTOH 3: WebSocket (untuk Web UI)
// ==========================================

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Kirim data ke semua client yang terhubung
  function broadcastScaleData(parsedData) {
    if (!parsedData.error) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(parsedData));
        }
      });
    }
  }
  
  // Gunakan di scaleReader.js setelah parsing
  // broadcastScaleData(parsedData);
});

// ==========================================
// CONTOH 4: HTTP Server (REST API)
// ==========================================

const express = require('express');
const app = express();
let latestData = null;

// Store latest data
function storeLatestData(parsedData) {
  if (!parsedData.error) {
    latestData = parsedData;
  }
}

// Endpoint untuk get latest data
app.get('/api/scale/latest', (req, res) => {
  res.json(latestData);
});

// Endpoint untuk WebSocket-like polling
app.get('/api/scale/poll', (req, res) => {
  res.json({ data: latestData, timestamp: Date.now() });
});

// ==========================================
// CONTOH 5: File-based Communication
// ==========================================

const fs = require('fs');
const dataFile = './latest-scale-data.json';

function writeToFile(parsedData) {
  if (!parsedData.error) {
    fs.writeFileSync(dataFile, JSON.stringify(parsedData, null, 2));
  }
}

// UI bisa membaca file ini secara berkala atau menggunakan file watcher

// ==========================================
// HELPER FUNCTIONS untuk UI
// ==========================================

function formatWeight(data) {
  return `${data.weight.value.toFixed(2)} ${data.weight.unit}`;
}

function getStatusInfo(status) {
  const map = {
    'ST': { label: 'Stable', color: '#4caf50' },
    'US': { label: 'Unstable', color: '#ff9800' },
    'OL': { label: 'Overload', color: '#f44336' },
    'UL': { label: 'Underload', color: '#ff5722' },
  };
  return map[status] || { label: status, color: '#757575' };
}

function formatTimestamp(data) {
  return new Date(data.timestamp).toLocaleString('id-ID');
}

// ==========================================
// CONTOH UPDATE UI (untuk berbagai framework)
// ==========================================

// React
function updateUIReact(parsedData) {
  // Di React component:
  /*
  const [scaleData, setScaleData] = useState(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/scale/latest')
        .then(res => res.json())
        .then(data => setScaleData(data));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div>
      <div>Status: {scaleData?.status}</div>
      <div>Berat: {formatWeight(scaleData)}</div>
    </div>
  );
  */
}

// Vue.js
function updateUIVue(parsedData) {
  // Di Vue component:
  /*
  data() {
    return { scaleData: null }
  },
  mounted() {
    setInterval(async () => {
      const res = await fetch('/api/scale/latest');
      this.scaleData = await res.json();
    }, 1000);
  }
  */
}

// Vanilla JavaScript (DOM)
function updateUIDOM(parsedData) {
  // Update langsung ke DOM
  const weightEl = document.getElementById('weight');
  const statusEl = document.getElementById('status');
  const timeEl = document.getElementById('timestamp');
  
  if (weightEl) {
    weightEl.textContent = formatWeight(parsedData);
  }
  
  if (statusEl) {
    const statusInfo = getStatusInfo(parsedData.status);
    statusEl.textContent = statusInfo.label;
    statusEl.style.color = statusInfo.color;
  }
  
  if (timeEl) {
    timeEl.textContent = formatTimestamp(parsedData);
  }
}

// ==========================================
// INTEGRASI DENGAN scaleReader.js
// ==========================================

/*
// Tambahkan di scaleReader.js setelah parsing:

const parsedData = parseScaleData(data);

// Pilih salah satu metode di atas:
// 1. Event Emitter
emitScaleData(parsedData);

// 2. Callback
notifyUI(parsedData);

// 3. WebSocket
broadcastScaleData(parsedData);

// 4. File
writeToFile(parsedData);

// 5. HTTP API
storeLatestData(parsedData);
*/

module.exports = {
  scaleEvents,
  setUICallback,
  notifyUI,
  formatWeight,
  getStatusInfo,
  formatTimestamp
};

