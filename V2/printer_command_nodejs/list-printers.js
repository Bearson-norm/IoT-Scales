const ThermalLabelPrinter = require('./index.js');

/**
 * Script untuk list semua printer Windows yang tersedia
 */

async function listPrinters() {
  try {
    console.log('🔍 Mencari printer Windows yang tersedia...\n');
    
    const printers = await ThermalLabelPrinter.listWindowsPrinters();
    
    if (printers.length === 0) {
      console.log('❌ Tidak ada printer yang ditemukan.');
      console.log('   Pastikan printer sudah terinstall di Windows.');
      return;
    }
    
    console.log(`✅ Ditemukan ${printers.length} printer:\n`);
    printers.forEach((printer, index) => {
      console.log(`   ${index + 1}. ${printer}`);
    });
    
    console.log('\n📝 Cara menggunakan:');
    console.log('   Set printerName di config dengan salah satu nama di atas.');
    console.log('   Contoh:');
    console.log('   const printer = new ThermalLabelPrinter({');
    console.log(`     printerName: '${printers[0]}',`);
    console.log('     printMethod: \'windows\'');
    console.log('   });');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('hanya tersedia di Windows')) {
      console.log('\n💡 Script ini hanya berjalan di Windows.');
    }
  }
}

if (require.main === module) {
  listPrinters();
}

module.exports = { listPrinters };


