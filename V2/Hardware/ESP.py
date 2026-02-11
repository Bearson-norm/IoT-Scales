"""
Test Raw ESC/POS Commands untuk Xprinter XP-420B
Kirim command ESC/POS langsung ke printer
"""

import win32print
import win32ui

class RawPrinter:
    def __init__(self, printer_name):
        self.printer_name = printer_name
        self.hPrinter = None
    
    def open(self):
        """Buka koneksi ke printer"""
        try:
            self.hPrinter = win32print.OpenPrinter(self.printer_name)
            print(f"✓ Koneksi ke '{self.printer_name}' berhasil!")
            return True
        except Exception as e:
            print(f"✗ Gagal buka printer: {e}")
            return False
    
    def send_raw(self, data):
        """Kirim raw bytes ke printer"""
        try:
            if isinstance(data, str):
                data = data.encode('cp437')  # Encoding untuk ESC/POS
            
            job = win32print.StartDocPrinter(self.hPrinter, 1, ("Raw Print Job", None, "RAW"))
            win32print.StartPagePrinter(self.hPrinter)
            win32print.WritePrinter(self.hPrinter, data)
            win32print.EndPagePrinter(self.hPrinter)
            win32print.EndDocPrinter(self.hPrinter)
            return True
        except Exception as e:
            print(f"✗ Error kirim data: {e}")
            return False
    
    def close(self):
        """Tutup koneksi"""
        if self.hPrinter:
            win32print.ClosePrinter(self.hPrinter)
            print("✓ Koneksi ditutup")


# ESC/POS Commands
ESC = b'\x1b'
GS = b'\x1d'

def test_1_minimal():
    """Test paling minimal - hanya text dan cut"""
    print("\n=== TEST 1: MINIMAL (Text + Cut) ===")
    
    printer = RawPrinter("Xprinter XP-420B")
    if not printer.open():
        return False
    
    try:
        # Initialize printer
        data = ESC + b'@'  # Reset printer
        
        # Print text
        data += b'HELLO WORLD\n'
        data += b'Test Print ESC/POS\n'
        data += b'Xprinter XP-420B\n'
        
        # Feed lines
        data += b'\n\n\n'
        
        # Cut paper (full cut)
        data += GS + b'V' + b'\x00'
        
        result = printer.send_raw(data)
        
        if result:
            print("✓ Data terkirim! Cek printer Anda.")
        else:
            print("✗ Gagal kirim data")
        
        return result
        
    finally:
        printer.close()


def test_2_formatting():
    """Test dengan formatting"""
    print("\n=== TEST 2: FORMATTING ===")
    
    printer = RawPrinter("Xprinter XP-420B")
    if not printer.open():
        return False
    
    try:
        data = ESC + b'@'  # Initialize
        
        # Center align
        data += ESC + b'a' + b'\x01'
        
        # Double size
        data += GS + b'!' + b'\x11'
        data += b'TOKO SAYA\n'
        
        # Normal size
        data += GS + b'!' + b'\x00'
        data += b'Jl. Contoh No. 123\n'
        
        # Left align
        data += ESC + b'a' + b'\x00'
        
        # Bold ON
        data += ESC + b'E' + b'\x01'
        data += b'STRUK PEMBELIAN\n'
        
        # Bold OFF
        data += ESC + b'E' + b'\x00'
        
        data += b'-----------------------------------\n'
        data += b'Item 1               Rp 10.000\n'
        data += b'Item 2               Rp 15.000\n'
        data += b'-----------------------------------\n'
        
        # Bold ON
        data += ESC + b'E' + b'\x01'
        data += b'TOTAL:               Rp 25.000\n'
        data += ESC + b'E' + b'\x00'
        
        # Feed and cut
        data += b'\n\n\n'
        data += GS + b'V' + b'\x00'
        
        result = printer.send_raw(data)
        
        if result:
            print("✓ Data terkirim! Cek printer Anda.")
        
        return result
        
    finally:
        printer.close()


def test_3_barcode():
    """Test barcode"""
    print("\n=== TEST 3: BARCODE ===")
    
    printer = RawPrinter("Xprinter XP-420B")
    if not printer.open():
        return False
    
    try:
        data = ESC + b'@'  # Initialize
        
        # Center align
        data += ESC + b'a' + b'\x01'
        
        data += b'BARCODE TEST\n\n'
        
        # Barcode settings
        data += GS + b'H' + b'\x02'  # HRI position: below
        data += GS + b'h' + b'\x50'  # Height: 80 dots
        data += GS + b'w' + b'\x02'  # Width: 2
        
        # Print CODE128 barcode
        barcode_data = b'1234567890'
        data += GS + b'k' + b'\x49' + bytes([len(barcode_data)]) + barcode_data
        
        # Feed and cut
        data += b'\n\n\n\n'
        data += GS + b'V' + b'\x00'
        
        result = printer.send_raw(data)
        
        if result:
            print("✓ Data terkirim! Cek printer Anda.")
        
        return result
        
    finally:
        printer.close()


def test_4_qr_code():
    """Test QR Code"""
    print("\n=== TEST 4: QR CODE ===")
    
    printer = RawPrinter("Xprinter XP-420B")
    if not printer.open():
        return False
    
    try:
        data = ESC + b'@'  # Initialize
        
        # Center align
        data += ESC + b'a' + b'\x01'
        data += b'QR CODE TEST\n\n'
        
        # QR Code
        qr_data = b'https://www.google.com'
        
        # Store data
        pL = (len(qr_data) + 3) % 256
        pH = (len(qr_data) + 3) // 256
        data += GS + b'(k' + bytes([pL, pH, 49, 80, 48]) + qr_data
        
        # Set size (module size = 6)
        data += GS + b'(k\x03\x00\x31\x43\x06'
        
        # Print QR
        data += GS + b'(k\x03\x00\x31\x51\x30'
        
        data += b'\n\nScan QR Code\n'
        
        # Feed and cut
        data += b'\n\n\n'
        data += GS + b'V' + b'\x00'
        
        result = printer.send_raw(data)
        
        if result:
            print("✓ Data terkirim! Cek printer Anda.")
        
        return result
        
    finally:
        printer.close()


def test_5_complete_receipt():
    """Test struk lengkap untuk kertas 70x60mm"""
    print("\n=== TEST 5: STRUK LENGKAP ===")
    
    printer = RawPrinter("Xprinter XP-420B")
    if not printer.open():
        return False
    
    try:
        data = ESC + b'@'  # Initialize
        
        # Header - Center, Bold, Double size
        data += ESC + b'a' + b'\x01'  # Center
        data += ESC + b'E' + b'\x01'  # Bold ON
        data += GS + b'!' + b'\x11'   # Double width & height
        data += b'WARUNG MAKAN\n'
        
        # Normal size
        data += GS + b'!' + b'\x00'
        data += ESC + b'E' + b'\x00'  # Bold OFF
        data += b'Jl. Sudirman No. 45\n'
        data += b'Telp: 021-5551234\n'
        
        # Left align
        data += ESC + b'a' + b'\x00'
        data += b'-----------------------------------\n'
        
        # Info
        data += b'Tgl: 15/12/2025    No: 001\n'
        data += b'Kasir: Budi\n'
        data += b'-----------------------------------\n'
        
        # Items
        data += b'Nasi Goreng      1x    Rp 25.000\n'
        data += b'Es Teh Manis     2x    Rp 10.000\n'
        data += b'Ayam Goreng      1x    Rp 30.000\n'
        data += b'-----------------------------------\n'
        
        # Total
        data += ESC + b'E' + b'\x01'  # Bold ON
        data += b'TOTAL:                 Rp 65.000\n'
        data += ESC + b'E' + b'\x00'  # Bold OFF
        
        data += b'Tunai:                 Rp 70.000\n'
        data += b'Kembali:                Rp 5.000\n'
        data += b'-----------------------------------\n'
        
        # Footer - Center
        data += ESC + b'a' + b'\x01'
        data += b'\nTerima Kasih\n'
        data += b'Selamat Datang Kembali\n'
        
        # Feed and cut
        data += b'\n\n\n'
        data += GS + b'V' + b'\x00'
        
        result = printer.send_raw(data)
        
        if result:
            print("✓ Data terkirim! Cek printer Anda.")
        
        return result
        
    finally:
        printer.close()


def check_printer_status():
    """Cek status printer"""
    print("\n=== CEK STATUS PRINTER ===")
    try:
        printer_name = "Xprinter XP-420B"
        handle = win32print.OpenPrinter(printer_name)
        printer_info = win32print.GetPrinter(handle, 2)
        
        print(f"Nama Printer: {printer_info['pPrinterName']}")
        print(f"Port: {printer_info['pPortName']}")
        print(f"Driver: {printer_info['pDriverName']}")
        print(f"Status: {printer_info['Status']}")
        
        # Cek apakah printer ready
        if printer_info['Status'] == 0:
            print("✓ Printer READY")
        else:
            print("⚠ Printer mungkin sedang error atau busy")
        
        win32print.ClosePrinter(handle)
        
    except Exception as e:
        print(f"✗ Error cek status: {e}")


def main():
    print("=" * 50)
    print("XPRINTER XP-420B - RAW ESC/POS TEST")
    print("=" * 50)
    
    # Cek status printer dulu
    check_printer_status()
    
    print("\n\nPilih test:")
    print("1. Test Minimal (Text + Cut) - MULAI DARI INI")
    print("2. Test Formatting (Bold, Size, Align)")
    print("3. Test Barcode")
    print("4. Test QR Code")
    print("5. Test Struk Lengkap")
    print("6. Jalankan SEMUA test")
    print("0. Keluar")
    
    choice = input("\nPilihan (0-6): ").strip()
    
    if choice == '1':
        test_1_minimal()
    elif choice == '2':
        test_2_formatting()
    elif choice == '3':
        test_3_barcode()
    elif choice == '4':
        test_4_qr_code()
    elif choice == '5':
        test_5_complete_receipt()
    elif choice == '6':
        import time
        print("\n🚀 Menjalankan semua test...")
        test_1_minimal()
        time.sleep(2)
        test_2_formatting()
        time.sleep(2)
        test_3_barcode()
        time.sleep(2)
        test_4_qr_code()
        time.sleep(2)
        test_5_complete_receipt()
        print("\n✓ SEMUA TEST SELESAI!")
    elif choice == '0':
        print("Keluar...")
    else:
        print("Pilihan tidak valid!")


if __name__ == "__main__":
    main()