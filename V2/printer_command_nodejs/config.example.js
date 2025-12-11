/**
 * File konfigurasi contoh untuk Thermal Label Printer
 * Copy file ini ke config.js dan edit sesuai kebutuhan
 */

module.exports = {
  // Konfigurasi printer
  printer: {
    // IP address printer (untuk printer network)
    printerIP: '192.168.1.100',
    
    // Port printer (default 9100 untuk ZPL)
    printerPort: 9100,
    
    // DPI printer (203 atau 300)
    dpi: 203,
    
    // Ukuran label dalam mm
    labelWidth: 100,  // 100mm
    labelHeight: 72   // 72mm
  },
  
  // Template label default
  defaultLabel: {
    fontSize: 30,
    x: 10,
    y: 10
  },
  
  // Contoh template untuk berbagai jenis label
  templates: {
    // Template untuk label produk
    product: {
      elements: [
        {
          type: 'text',
          content: '{{productName}}',
          x: 10,
          y: 5,
          fontSize: 28
        },
        {
          type: 'text',
          content: 'SKU: {{sku}}',
          x: 10,
          y: 20,
          fontSize: 20
        },
        {
          type: 'barcode',
          content: '{{barcode}}',
          x: 10,
          y: 35,
          height: 25
        },
        {
          type: 'text',
          content: 'Rp {{price}}',
          x: 10,
          y: 62,
          fontSize: 22
        }
      ]
    },
    
    // Template untuk label shipping
    shipping: {
      elements: [
        {
          type: 'text',
          content: 'KEPADA:',
          x: 10,
          y: 5,
          fontSize: 20
        },
        {
          type: 'text',
          content: '{{recipientName}}',
          x: 10,
          y: 15,
          fontSize: 25
        },
        {
          type: 'text',
          content: '{{address}}',
          x: 10,
          y: 28,
          fontSize: 18
        },
        {
          type: 'barcode',
          content: '{{trackingNumber}}',
          x: 10,
          y: 45,
          height: 20
        },
        {
          type: 'qrcode',
          content: '{{trackingUrl}}',
          x: 60,
          y: 45,
          size: 5
        }
      ]
    },
    
    // Template untuk label inventory
    inventory: {
      elements: [
        {
          type: 'text',
          content: '{{itemName}}',
          x: 10,
          y: 10,
          fontSize: 30
        },
        {
          type: 'barcode',
          content: '{{itemCode}}',
          x: 10,
          y: 30,
          height: 25
        },
        {
          type: 'text',
          content: 'Qty: {{quantity}}',
          x: 10,
          y: 58,
          fontSize: 22
        }
      ]
    }
  }
};


