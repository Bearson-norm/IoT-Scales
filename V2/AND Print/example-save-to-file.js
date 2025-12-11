/**
 * Contoh penggunaan: Menyimpan data timbangan ke file CSV
 * 
 * Untuk menggunakan contoh ini:
 * 1. Install fs-extra: npm install fs-extra
 * 2. Import fungsi parseScaleData dari scaleReader.js atau copy logic-nya
 * 3. Jalankan program ini
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const fs = require('fs-extra');
const path = require('path');

const COM_PORT = process.env.COM_PORT || 'COM3';
const BAUD_RATE = parseInt(process.env.BAUD_RATE || '9600');
const CSV_FILE = path.join(__dirname, 'scale_data.csv');

// Fungsi untuk parse data (sama seperti di scaleReader.js)
function parseScaleData(data) {
  try {
    const cleanData = data.trim();
    const parts = cleanData.split(',');
    
    if (parts.length !== 5) {
      throw new Error(`Format data tidak valid`);
    }
    
    const weightMatch = parts[1].trim().match(/(-?\d+\.?\d*)\s*(kg|g|lb|oz)?/i);
    const weightValue = weightMatch ? parseFloat(weightMatch[1]) : null;
    const weightUnit = weightMatch && weightMatch[2] ? weightMatch[2] : 'g';
    
    return {
      status: parts[0].trim(),
      weight: weightValue,
      unit: weightUnit,
      time: parts[2].trim(),
      date: parts[3].trim(),
      additionalValue: parts[4].trim(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return null;
  }
}

// Inisialisasi CSV file dengan header
async function initCSV() {
  const header = 'Timestamp,Date,Time,Status,Weight,Unit,Additional Value\n';
  if (!(await fs.pathExists(CSV_FILE))) {
    await fs.writeFile(CSV_FILE, header);
    console.log(`File CSV dibuat: ${CSV_FILE}`);
  }
}

// Simpan data ke CSV
async function saveToCSV(parsedData) {
  if (!parsedData) return;
  
  const csvLine = [
    parsedData.timestamp,
    parsedData.date,
    parsedData.time,
    parsedData.status,
    parsedData.weight,
    parsedData.unit,
    parsedData.additionalValue
  ].join(',') + '\n';
  
  await fs.appendFile(CSV_FILE, csvLine);
  console.log(`Data tersimpan: ${parsedData.weight} ${parsedData.unit}`);
}

// Program utama
async function main() {
  await initCSV();
  
  console.log(`Membaca dari ${COM_PORT} dan menyimpan ke ${CSV_FILE}`);
  
  const port = new SerialPort({
    path: COM_PORT,
    baudRate: BAUD_RATE,
  });
  
  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
  
  parser.on('data', async (data) => {
    const parsed = parseScaleData(data);
    if (parsed) {
      await saveToCSV(parsed);
    }
  });
  
  port.on('error', (err) => {
    console.error('Error:', err.message);
  });
  
  process.on('SIGINT', () => {
    console.log('\nProgram dihentikan.');
    port.close();
    process.exit(0);
  });
}

main().catch(console.error);

