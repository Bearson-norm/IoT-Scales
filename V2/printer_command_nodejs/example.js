const ThermalLabelPrinter = require('./index.js');

/**
 * Contoh penggunaan Thermal Label Printer
 */

// Konfigurasi printer
// Opsi 1: Print via Windows Printer Queue (disarankan untuk Windows)
const printer = new ThermalLabelPrinter({
  printerName: 'Xprinter XP-420B',  // Ganti dengan nama printer Windows (jalankan: node list-printers.js)
  printMethod: 'windows', // 'windows', 'network', 'com', atau 'auto'
  dpi: 203
});

// Opsi 2: Print via Network (TCP/IP)
// const printer = new ThermalLabelPrinter({
//   printerIP: '192.168.1.100',
//   printerPort: 9100,
//   printMethod: 'network',
//   dpi: 203
// });

// Opsi 3: Print via COM Port (USB)
// const printer = new ThermalLabelPrinter({
//   comPort: 'COM3', // Ganti dengan COM port printer Anda
//   printMethod: 'com',
//   dpi: 203
// });

async function contohPenggunaan() {
  try {
    console.log('=== Contoh 1: Label Sederhana dengan Text ===\n');
    await printer.printLabel({
      text: 'PRODUK ABC',
      fontSize: 35,
      x: 10,
      y: 10
    });

    // Tunggu 2 detik sebelum print berikutnya
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== Contoh 2: Label dengan Barcode ===\n');
    await printer.printLabel({
      text: 'SKU: ABC123',
      barcode: '1234567890123',
      fontSize: 25,
      x: 10,
      y: 10
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== Contoh 3: Label dengan QR Code ===\n');
    await printer.printLabel({
      text: 'Scan untuk info',
      qrCode: 'https://example.com/product/123',
      fontSize: 25,
      x: 10,
      y: 10
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== Contoh 4: Label Lengkap (Text + Barcode + QR) ===\n');
    await printer.printLabel({
      text: 'PRODUK XYZ',
      barcode: '9876543210987',
      qrCode: 'https://example.com/product/xyz',
      fontSize: 30,
      x: 10,
      y: 10
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== Contoh 5: Label Custom Template ===\n');
    await printer.printCustomLabel({
      elements: [
        {
          type: 'text',
          content: 'TOKO ABC',
          x: 10,
          y: 5,
          fontSize: 28
        },
        {
          type: 'text',
          content: 'Jl. Contoh No. 123',
          x: 10,
          y: 20,
          fontSize: 20
        },
        {
          type: 'barcode',
          content: '1234567890',
          x: 10,
          y: 35,
          height: 25
        },
        {
          type: 'qrcode',
          content: 'https://tokabc.com/product/123',
          x: 60,
          y: 35,
          size: 6
        },
        {
          type: 'box',
          x: 5,
          y: 2,
          width: 90,
          height: 68,
          thickness: 2
        }
      ]
    });

    console.log('\n✅ Semua label berhasil dicetak!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Fungsi untuk generate ZPL tanpa print (untuk testing/preview)
function generateZPLPreview() {
  try {
    console.log('=== Preview ZPL Command ===\n');
    
    const zpl = printer.generateZPL({
      text: 'CONTOH LABEL',
      barcode: '123456789',
      qrCode: 'https://example.com',
      fontSize: 30,
      x: 10,
      y: 10
    });
    
    console.log(zpl);
    console.log('\n=== Menyimpan ke file ===\n');
    printer.saveZPLToFile(zpl, 'preview-label.zpl');
    console.log('ZPL disimpan ke: preview-label.zpl');
  } catch (error) {
    console.error('❌ Error saat generate ZPL:', error.message);
    process.exit(1);
  }
}

// Jalankan contoh
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--preview') || args.includes('-p')) {
    // Hanya generate ZPL tanpa print
    generateZPLPreview();
  } else if (args.includes('--list') || args.includes('-l')) {
    // List printer Windows
    const { listPrinters } = require('./list-printers.js');
    listPrinters();
  } else {
    // Print ke printer
    console.log('⚠️  Pastikan printer sudah dikonfigurasi di config!\n');
    console.log('Untuk melihat printer Windows tersedia, jalankan: node example.js --list');
    console.log('Untuk preview ZPL tanpa print, jalankan: node example.js --preview\n');
    console.log('---\n');
    
    // Print ke printer
    contohPenggunaan().catch(error => {
      console.error('❌ Error saat print:', error.message);
      process.exit(1);
    });
  }
}

module.exports = { contohPenggunaan, generateZPLPreview };

