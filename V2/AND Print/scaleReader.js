const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

/**
 * Program untuk membaca data timbangan via RS232
 * Format data lengkap: ST,-000000.8  g,11:06:00,03/12/2025,36
 * Format data sederhana: ST,+000000.0  g (hanya status dan berat)
 * 
 * Konfigurasi default:
 * - Baud Rate: 2400
 * - Data Bits: 7
 * - Parity: Even
 * - Stop Bits: 1
 * - Delimiter: CR/LF (\r\n)
 */

// Konfigurasi Serial Port
const SERIAL_CONFIG = {
  // Ganti dengan COM port yang sesuai (contoh: 'COM3' untuk Windows, '/dev/ttyUSB0' untuk Linux)
  path: process.env.COM_PORT || 'COM5',
  baudRate: parseInt(process.env.BAUD_RATE || '2400'),
  dataBits: parseInt(process.env.DATA_BITS || '7'),
  stopBits: parseInt(process.env.STOP_BITS || '1'),
  parity: process.env.PARITY || 'even', // even parity untuk timbangan AND
};

// Mode debug - set true untuk melihat raw bytes
const DEBUG_MODE = process.env.DEBUG === 'true' || false;

// Fungsi untuk membersihkan karakter yang tidak valid
function cleanData(data) {
  // Hapus karakter control dan karakter yang tidak dapat dicetak
  // Tapi pertahankan karakter penting seperti koma, titik, angka, huruf
  return data
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Hapus control characters
    .replace(/\?/g, '') // Hapus karakter '?' yang muncul karena encoding error
    .trim();
}

// Parsing data timbangan
function parseScaleData(data) {
  try {
    // Hapus whitespace di awal dan akhir
    let cleanData = data.trim();
    
    // Bersihkan karakter yang tidak valid
    cleanData = cleanData.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Bersihkan karakter '?' yang muncul karena encoding error
    cleanData = cleanData.replace(/\?([A-Za-z0-9\s,\.\-\+])/g, '$1'); // Hapus ? sebelum karakter valid
    cleanData = cleanData.replace(/([A-Za-z0-9\s,\.\-\+])\?/g, '$1'); // Hapus ? setelah karakter valid
    
    // Split berdasarkan koma
    const parts = cleanData.split(',');
    
    // Format 1: Lengkap dengan waktu dan tanggal (5 bagian)
    // Contoh: ST,-000000.8  g,11:06:00,03/12/2025,36
    if (parts.length >= 5) {
      const status = parts[0].trim();
      const weightRaw = parts[1].trim();
      const time = parts[2].trim();
      const date = parts[3].trim();
      const additionalValue = parts[4].trim();
      
      // Extract weight value
      const weightMatch = weightRaw.match(/(-?\d+\.?\d*)\s*(kg|g|lb|oz)?/i);
      const weightValue = weightMatch ? parseFloat(weightMatch[1]) : null;
      const weightUnit = weightMatch && weightMatch[2] ? weightMatch[2] : 'g';
      
      return {
        raw: cleanData,
        status: status,
        weight: {
          value: weightValue,
          unit: weightUnit,
          raw: weightRaw
        },
        time: time,
        date: date,
        additionalValue: additionalValue,
        timestamp: new Date().toISOString()
      };
    }
    
    // Format 2: Hanya status dan berat (2 bagian) - format sederhana
    // Contoh: ST,+000000.0  g
    if (parts.length >= 2) {
      const status = parts[0].trim();
      const weightRaw = parts[1] ? parts[1].trim() : '';
      
      // Extract weight value (contoh: +000000.0  g -> 0.0)
      const weightMatch = weightRaw.match(/([+\-]?\d+\.?\d*)\s*(kg|g|lb|oz)?/i);
      const weightValue = weightMatch ? parseFloat(weightMatch[1]) : null;
      const weightUnit = weightMatch && weightMatch[2] ? weightMatch[2] : 
                         (weightRaw.match(/(kg|g|lb|oz)/i) ? weightRaw.match(/(kg|g|lb|oz)/i)[1] : 'g');
      
      return {
        raw: cleanData,
        status: status,
        weight: {
          value: weightValue,
          unit: weightUnit,
          raw: weightRaw
        },
        time: null,
        date: null,
        additionalValue: null,
        timestamp: new Date().toISOString()
      };
    }
    
    // Jika format tidak dikenal
    throw new Error(`Format data tidak dikenal. Jumlah bagian: ${parts.length}. Data: ${cleanData.substring(0, 100)}`);
    
  } catch (error) {
    return {
      raw: data,
      error: error.message
    };
  }
}

// Fungsi untuk menampilkan data yang sudah di-parse
function displayData(parsedData) {
  if (parsedData.error) {
    console.error(`[ERROR] ${parsedData.error}`);
    console.error(`[RAW DATA] ${parsedData.raw}`);
    return;
  }
  
  console.log('\n=== Data Timbangan ===');
  console.log(`Status: ${parsedData.status}`);
  console.log(`Berat: ${parsedData.weight.value} ${parsedData.weight.unit}`);
  
  // Tampilkan waktu dan tanggal hanya jika ada
  if (parsedData.time) {
    console.log(`Waktu: ${parsedData.time}`);
  }
  if (parsedData.date) {
    console.log(`Tanggal: ${parsedData.date}`);
  }
  if (parsedData.additionalValue) {
    console.log(`Nilai Tambahan: ${parsedData.additionalValue}`);
  }
  
  console.log(`Timestamp: ${parsedData.timestamp}`);
  console.log(`Raw Data: ${parsedData.raw}`);
  console.log('======================\n');
}

// Fungsi utama
async function startReading() {
  console.log('=== Program Pembaca Timbangan RS232 ===');
  console.log(`Mencoba koneksi ke: ${SERIAL_CONFIG.path}`);
  console.log(`Baud Rate: ${SERIAL_CONFIG.baudRate}`);
  console.log(`Data Bits: ${SERIAL_CONFIG.dataBits}`);
  console.log(`Stop Bits: ${SERIAL_CONFIG.stopBits}`);
  console.log(`Parity: ${SERIAL_CONFIG.parity}`);
  console.log(`Debug Mode: ${DEBUG_MODE ? 'ON' : 'OFF'}`);
  console.log('Menunggu data dari timbangan...\n');
  console.log('Tips: Set DEBUG=true untuk melihat raw bytes (contoh: DEBUG=true npm start)\n');

  try {
    // Buat koneksi serial port
    const port = new SerialPort({
      path: SERIAL_CONFIG.path,
      baudRate: SERIAL_CONFIG.baudRate,
      dataBits: SERIAL_CONFIG.dataBits,
      stopBits: SERIAL_CONFIG.stopBits,
      parity: SERIAL_CONFIG.parity,
    });

    // Pilih mode: 'parser' (default) atau 'raw' (jika parser tidak bekerja)
    const MODE = process.env.MODE || 'parser';
    
    if (MODE === 'raw') {
      // Mode RAW: membaca data langsung tanpa parser
      console.log('[INFO] Menggunakan mode RAW (tanpa parser)\n');
      
      let dataBuffer = '';
      
      port.on('readable', () => {
        let chunk;
        while ((chunk = port.read()) !== null) {
          const dataStr = chunk.toString();
          dataBuffer += dataStr;
          
          if (DEBUG_MODE) {
            console.log('\n[DEBUG] Raw Chunk (Hex):', chunk.toString('hex'));
            console.log('[DEBUG] Raw Chunk (String):', JSON.stringify(dataStr));
            console.log('[DEBUG] Buffer Length:', dataBuffer.length);
          }
          
          // Coba berbagai delimiter untuk split data (prioritas CR/LF)
          const delimiters = ['\r\n', '\n', '\r'];
          let foundDelimiter = false;
          let lines = [];
          
          for (const delim of delimiters) {
            if (dataBuffer.includes(delim)) {
              lines = dataBuffer.split(delim);
              foundDelimiter = true;
              // Simpan sisa data yang belum lengkap
              dataBuffer = lines.pop() || '';
              break;
            }
          }
          
          // Jika tidak ada delimiter, tunggu data lebih banyak
          if (!foundDelimiter) {
            // Cek apakah buffer terlalu besar
            if (dataBuffer.length > 200) {
              if (DEBUG_MODE) {
                console.log('[DEBUG] Buffer terlalu besar, mencoba parse:', dataBuffer);
              }
              const parsedData = parseScaleData(dataBuffer);
              if (!parsedData.error) {
                displayData(parsedData);
              }
              dataBuffer = '';
            }
            continue;
          }
          
          // Process setiap line
          for (const line of lines) {
            if (line.trim().length > 0) {
              if (DEBUG_MODE) {
                console.log('[DEBUG] Processing line:', JSON.stringify(line));
              }
              const parsedData = parseScaleData(line.trim());
              displayData(parsedData);
            }
          }
        }
      });
      
    } else {
      // Mode PARSER: menggunakan ReadlineParser (default)
      console.log('[INFO] Menggunakan mode PARSER\n');
      
      const delimiter = process.env.DELIMITER || '\r\n';
      const parser = port.pipe(new ReadlineParser({ delimiter: delimiter }));

      // Event handler untuk data yang diterima
      parser.on('data', (data) => {
        // Tampilkan raw data jika debug mode
        if (DEBUG_MODE) {
          console.log('\n[DEBUG] Parsed Line:', JSON.stringify(data));
          console.log('[DEBUG] Line Length:', data.length);
          console.log('[DEBUG] Line Bytes (Hex):', Buffer.from(data).toString('hex'));
        }
        
        const parsedData = parseScaleData(data);
        displayData(parsedData);
        
        // Di sini Anda bisa menambahkan logic untuk:
        // - Menyimpan ke database
        // - Mengirim ke API
        // - Menulis ke file
        // - dll
      });
    }
    
    // Event handler untuk raw data (untuk debugging di mode parser)
    if (DEBUG_MODE && MODE === 'parser') {
      port.on('data', (data) => {
        console.log('\n[DEBUG] Raw Bytes (Hex):', data.toString('hex'));
        console.log('[DEBUG] Raw Bytes (String):', JSON.stringify(data.toString()));
        console.log('[DEBUG] Raw Bytes Length:', data.length);
      });
    }

    // Event handler untuk error
    port.on('error', (err) => {
      console.error('[ERROR] Serial Port Error:', err.message);
      console.error('Pastikan:');
      console.error('1. COM port sudah benar');
      console.error('2. Timbangan sudah terhubung');
      console.error('3. Tidak ada program lain yang menggunakan COM port tersebut');
    });

    // Event handler untuk koneksi terbuka
    port.on('open', () => {
      console.log(`✓ Koneksi berhasil! Port ${SERIAL_CONFIG.path} terbuka.\n`);
    });

    // Event handler untuk koneksi ditutup
    port.on('close', () => {
      console.log('\n[INFO] Koneksi serial port ditutup.');
    });

    // Handle proses termination (Ctrl+C)
    process.on('SIGINT', async () => {
      console.log('\n\n[INFO] Menghentikan program...');
      try {
        await port.close();
        console.log('[INFO] Port berhasil ditutup.');
      } catch (err) {
        console.error('[ERROR] Error saat menutup port:', err.message);
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('[ERROR] Gagal membuat koneksi:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Periksa apakah COM port sudah benar');
    console.error('2. Install driver untuk USB-to-Serial adapter jika menggunakan adapter');
    console.error('3. Periksa permission untuk akses serial port');
    console.error('4. Coba jalankan dengan administrator/sudo');
    process.exit(1);
  }
}

// Jalankan program
startReading();

