const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

/**
 * Class untuk mencetak label thermal dengan ZPL
 * Ukuran kertas: 100mm x 72mm
 */
class ThermalLabelPrinter {
  constructor(options = {}) {
    // Konfigurasi default untuk printer thermal 100x72mm
    this.config = {
      printerIP: options.printerIP || null,
      printerPort: options.printerPort || 9100,
      printerName: options.printerName || null, // Nama printer Windows
      comPort: options.comPort || null, // COM port untuk USB (contoh: 'COM3')
      printMethod: options.printMethod || 'auto', // 'network', 'windows', 'com', 'auto'
      labelWidth: 100, // mm
      labelHeight: 72, // mm
      dpi: options.dpi || 203, // DPI printer (203 atau 300)
      ...options
    };
    
    // Konversi mm ke dots (berdasarkan DPI)
    this.dotsPerMM = this.config.dpi / 25.4;
    this.widthInDots = Math.round(this.config.labelWidth * this.dotsPerMM);
    this.heightInDots = Math.round(this.config.labelHeight * this.dotsPerMM);
  }

  /**
   * Generate ZPL command untuk label 100x72mm
   * @param {Object} data - Data untuk label
   * @returns {String} ZPL command string
   */
  generateZPL(data = {}) {
    const {
      text = 'Label Test',
      barcode = null,
      qrCode = null,
      fontSize = 30,
      x = 10,
      y = 10
    } = data;

    // ZPL Header - Konfigurasi label
    let zpl = '^XA'; // Start of label
    
    // Set label size (100mm x 72mm)
    // ^LL = Label Length (height in dots)
    // ^PW = Print Width (width in dots)
    zpl += `^LL${this.heightInDots}`;
    zpl += `^PW${this.widthInDots}`;
    zpl += `^PO0`; // Print orientation (0 = normal)
    
    // Text Field
    if (text) {
      // ^FO = Field Origin (x, y position)
      // ^A0 = Font type (0 = default scalable font)
      // ^FD = Field Data (text content)
      // ^FS = Field Separator (end of field)
      zpl += `^FO${Math.round(x * this.dotsPerMM)},${Math.round(y * this.dotsPerMM)}`;
      zpl += `^A0N,${Math.round(fontSize * this.dotsPerMM / 10)},${Math.round(fontSize * this.dotsPerMM / 10)}`;
      zpl += `^FD${text}^FS`;
    }
    
    // Barcode (Code 128)
    if (barcode) {
      const barcodeY = y + (text ? fontSize + 10 : 0);
      zpl += `^FO${Math.round(x * this.dotsPerMM)},${Math.round(barcodeY * this.dotsPerMM)}`;
      zpl += `^BCN,${Math.round(20 * this.dotsPerMM / 10)},Y,N,N`;
      zpl += `^FD${barcode}^FS`;
    }
    
    // QR Code
    if (qrCode) {
      const qrY = y + (text ? fontSize + 10 : 0) + (barcode ? 40 : 0);
      zpl += `^FO${Math.round(x * this.dotsPerMM)},${Math.round(qrY * this.dotsPerMM)}`;
      zpl += `^BQN,2,5`; // QR Code model 2, size 5
      zpl += `^FDQA,${qrCode}^FS`;
    }
    
    zpl += '^XZ'; // End of label
    
    return zpl;
  }

  /**
   * Generate ZPL untuk label dengan template custom
   * @param {Object} template - Template data untuk label
   * @returns {String} ZPL command string
   */
  generateCustomZPL(template) {
    let zpl = '^XA';
    zpl += `^LL${this.heightInDots}`;
    zpl += `^PW${this.widthInDots}`;
    zpl += `^PO0`;
    
    // Process template elements
    if (template.elements) {
      template.elements.forEach(element => {
        const x = Math.round((element.x || 0) * this.dotsPerMM);
        const y = Math.round((element.y || 0) * this.dotsPerMM);
        
        switch (element.type) {
          case 'text':
            zpl += `^FO${x},${y}`;
            zpl += `^A0N,${Math.round((element.fontSize || 30) * this.dotsPerMM / 10)},${Math.round((element.fontSize || 30) * this.dotsPerMM / 10)}`;
            zpl += `^FD${element.content || ''}^FS`;
            break;
            
          case 'barcode':
            zpl += `^FO${x},${y}`;
            zpl += `^BCN,${Math.round((element.height || 20) * this.dotsPerMM / 10)},Y,N,N`;
            zpl += `^FD${element.content || ''}^FS`;
            break;
            
          case 'qrcode':
            zpl += `^FO${x},${y}`;
            zpl += `^BQN,2,${element.size || 5}`;
            zpl += `^FDQA,${element.content || ''}^FS`;
            break;
            
          case 'box':
            zpl += `^FO${x},${y}`;
            zpl += `^GB${Math.round((element.width || 50) * this.dotsPerMM)},${Math.round((element.height || 20) * this.dotsPerMM)},${element.thickness || 2}^FS`;
            break;
        }
      });
    }
    
    zpl += '^XZ';
    return zpl;
  }

  /**
   * Print ZPL ke printer via network (TCP/IP)
   * @param {String} zpl - ZPL command string
   * @returns {Promise} Promise yang resolve ketika print selesai
   */
  printViaNetwork(zpl) {
    return new Promise((resolve, reject) => {
      if (!this.config.printerIP) {
        reject(new Error('Printer IP tidak dikonfigurasi'));
        return;
      }

      const socket = new net.Socket();
      
      socket.setTimeout(5000); // 5 second timeout
      
      socket.on('connect', () => {
        console.log(`Terhubung ke printer di ${this.config.printerIP}:${this.config.printerPort}`);
        socket.write(zpl, 'utf8', () => {
          console.log('ZPL command berhasil dikirim');
          socket.end();
        });
      });
      
      socket.on('data', (data) => {
        console.log('Response dari printer:', data.toString());
      });
      
      socket.on('close', () => {
        console.log('Koneksi printer ditutup');
        resolve();
      });
      
      socket.on('error', (error) => {
        console.error('Error koneksi printer:', error.message);
        reject(error);
      });
      
      socket.on('timeout', () => {
        console.error('Timeout koneksi printer');
        socket.destroy();
        reject(new Error('Timeout koneksi printer'));
      });
      
      // Connect ke printer
      socket.connect(this.config.printerPort, this.config.printerIP);
    });
  }

  /**
   * Print ZPL ke printer via Windows print queue (printer name) - RAW mode
   * Menggunakan Win32 API WritePrinter untuk mengirim data sebagai RAW
   * @param {String} zpl - ZPL command string
   * @returns {Promise} Promise yang resolve ketika print selesai
   */
  printViaWindows(zpl) {
    return new Promise((resolve, reject) => {
      if (!this.config.printerName) {
        reject(new Error('Nama printer Windows tidak dikonfigurasi'));
        return;
      }

      if (os.platform() !== 'win32') {
        reject(new Error('Print via Windows hanya tersedia di Windows'));
        return;
      }

      // Simpan ZPL ke temporary file
      const tempFile = path.join(os.tmpdir(), `zpl_${Date.now()}.zpl`);
      fs.writeFileSync(tempFile, zpl, 'utf8');

      // Escape untuk PowerShell
      const printerName = this.config.printerName.replace(/'/g, "''").replace(/\$/g, '`$');
      const escapedPath = tempFile.replace(/\\/g, '\\\\').replace(/'/g, "''");
      
      // Gunakan PowerShell dengan Win32 API WritePrinter untuk RAW printing
      // Ini memastikan data dikirim sebagai RAW (binary) bukan formatted text
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

$printerName = '${printerName}';
$filePath = '${escapedPath}';

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

      // Simpan PowerShell script ke file untuk menghindari masalah escaping
      const psScriptFile = path.join(os.tmpdir(), `zpl_print_${Date.now()}.ps1`);
      fs.writeFileSync(psScriptFile, psScript, 'utf8');

      const command = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptFile}"`;

      exec(command, { windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        // Hapus temporary files
        try {
          fs.unlinkSync(tempFile);
          fs.unlinkSync(psScriptFile);
        } catch (e) {
          // Ignore error jika file sudah terhapus
        }

        if (error) {
          console.error('Error print via Windows:', error.message);
          if (stderr) console.error('Stderr:', stderr);
          reject(new Error(`Print gagal: ${error.message}. Pastikan printer "${this.config.printerName}" sudah terinstall dan support RAW printing.`));
          return;
        }

        console.log(`✅ ZPL RAW data berhasil dikirim ke printer: ${this.config.printerName}`);
        if (stdout) console.log(stdout);
        resolve();
      });
    });
  }

  /**
   * Print ZPL ke printer via COM port (USB Serial)
   * @param {String} zpl - ZPL command string
   * @returns {Promise} Promise yang resolve ketika print selesai
   */
  async printViaCOM(zpl) {
    if (!this.config.comPort) {
      throw new Error('COM port tidak dikonfigurasi');
    }

    try {
      // Dynamic import untuk serialport (optional dependency)
      const { SerialPort } = await import('serialport').catch(() => {
        throw new Error('SerialPort tidak tersedia. Install dengan: npm install serialport');
      });

      return new Promise((resolve, reject) => {
        const port = new SerialPort({
          path: this.config.comPort,
          baudRate: 9600, // Default baud rate untuk thermal printer
          autoOpen: false
        });

        port.open((err) => {
          if (err) {
            console.error(`Error membuka port ${this.config.comPort}:`, err.message);
            reject(err);
            return;
          }

          console.log(`Terhubung ke printer di ${this.config.comPort}`);
          
          port.write(zpl, 'utf8', (err) => {
            if (err) {
              console.error('Error mengirim data:', err.message);
              port.close();
              reject(err);
              return;
            }

            console.log('ZPL command berhasil dikirim');
            
            // Tunggu sebentar sebelum close
            setTimeout(() => {
              port.close((err) => {
                if (err) {
                  console.error('Error menutup port:', err.message);
                } else {
                  console.log('Port ditutup');
                }
                resolve();
              });
            }, 500);
          });
        });

        port.on('error', (err) => {
          console.error('Port error:', err.message);
          reject(err);
        });
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * List semua printer Windows yang tersedia
   * @returns {Promise<Array>} Array of printer names
   */
  static listWindowsPrinters() {
    return new Promise((resolve, reject) => {
      if (os.platform() !== 'win32') {
        reject(new Error('List printer hanya tersedia di Windows'));
        return;
      }

      // Gunakan PowerShell untuk list printer
      const command = 'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"';
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error listing printers:', error.message);
          if (stderr) console.error('Stderr:', stderr);
          reject(error);
          return;
        }

        const printers = stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

        resolve(printers);
      });
    });
  }

  /**
   * Print ZPL menggunakan method yang sesuai (auto-detect atau manual)
   * @param {String} zpl - ZPL command string
   * @returns {Promise}
   */
  async printZPL(zpl) {
    const method = this.config.printMethod;

    if (method === 'network') {
      return await this.printViaNetwork(zpl);
    } else if (method === 'windows') {
      return await this.printViaWindows(zpl);
    } else if (method === 'com') {
      return await this.printViaCOM(zpl);
    } else if (method === 'auto') {
      // Auto-detect: coba Windows dulu, lalu Network, lalu COM
      if (this.config.printerName) {
        try {
          return await this.printViaWindows(zpl);
        } catch (error) {
          console.warn('Print via Windows gagal, mencoba metode lain...');
        }
      }
      
      if (this.config.printerIP) {
        try {
          return await this.printViaNetwork(zpl);
        } catch (error) {
          console.warn('Print via Network gagal, mencoba metode lain...');
        }
      }
      
      if (this.config.comPort) {
        return await this.printViaCOM(zpl);
      }
      
      throw new Error('Tidak ada metode print yang dikonfigurasi. Set printerName, printerIP, atau comPort');
    } else {
      throw new Error(`Print method tidak valid: ${method}. Gunakan: 'network', 'windows', 'com', atau 'auto'`);
    }
  }

  /**
   * Print label dengan data sederhana
   * @param {Object} data - Data untuk label
   * @returns {Promise}
   */
  async printLabel(data) {
    const zpl = this.generateZPL(data);
    console.log('ZPL Command:');
    console.log(zpl);
    console.log('\n---\n');
    
    return await this.printZPL(zpl);
  }

  /**
   * Print label dengan template custom
   * @param {Object} template - Template data
   * @returns {Promise}
   */
  async printCustomLabel(template) {
    const zpl = this.generateCustomZPL(template);
    console.log('ZPL Command:');
    console.log(zpl);
    console.log('\n---\n');
    
    return await this.printZPL(zpl);
  }

  /**
   * Simpan ZPL ke file untuk testing
   * @param {String} zpl - ZPL command string
   * @param {String} filename - Nama file
   */
  saveZPLToFile(zpl, filename = 'output.zpl') {
    fs.writeFileSync(filename, zpl, 'utf8');
    console.log(`ZPL disimpan ke file: ${filename}`);
  }
}

module.exports = ThermalLabelPrinter;

// Contoh penggunaan jika dijalankan langsung
if (require.main === module) {
  // Contoh 1: Print label sederhana
  const printer = new ThermalLabelPrinter({
    printerIP: '192.168.1.100', // Ganti dengan IP printer Anda
    printerPort: 9100,
    dpi: 203
  });

  // Uncomment untuk test print
  // printer.printLabel({
  //   text: 'Label Test 100x72mm',
  //   barcode: '123456789',
  //   fontSize: 30,
  //   x: 10,
  //   y: 10
  // }).catch(console.error);
  
  // Simpan ZPL ke file untuk preview/testing
  const zpl = printer.generateZPL({
    text: 'Label Test 100x72mm',
    barcode: '123456789',
    qrCode: 'https://example.com',
    fontSize: 30,
    x: 10,
    y: 10
  });
  
  printer.saveZPLToFile(zpl, 'test-label.zpl');
  console.log('\nContoh penggunaan:');
  console.log('1. Edit IP printer di config');
  console.log('2. Jalankan: node example.js');
}

