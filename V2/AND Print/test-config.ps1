# Script untuk test berbagai konfigurasi RS232
# Penggunaan: .\test-config.ps1 COM5

param(
    [string]$ComPort = "COM5"
)

Write-Host "=== Testing RS232 Configuration ===" -ForegroundColor Green
Write-Host "COM Port: $ComPort" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tekan Ctrl+C untuk skip ke konfigurasi berikutnya"
Write-Host ""

# Test 1: 7N1 (7 data bits, No parity, 1 stop bit) - 2400 baud
Write-Host "=== Test 1: 7N1 @ 2400 ===" -ForegroundColor Cyan
$env:COM_PORT = $ComPort
$env:BAUD_RATE = "2400"
$env:DATA_BITS = "7"
$env:PARITY = "none"
$env:STOP_BITS = "1"
$env:MODE = "raw"
$env:DEBUG = "true"
npm start

Write-Host ""
Write-Host "Press any key to continue to next test..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Test 2: 7E1 (7 data bits, Even parity, 1 stop bit) - 2400 baud
Write-Host "=== Test 2: 7E1 @ 2400 ===" -ForegroundColor Cyan
$env:COM_PORT = $ComPort
$env:BAUD_RATE = "2400"
$env:DATA_BITS = "7"
$env:PARITY = "even"
$env:STOP_BITS = "1"
$env:MODE = "raw"
$env:DEBUG = "true"
npm start

Write-Host ""
Write-Host "Press any key to continue to next test..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Test 3: 8N1 (8 data bits, No parity, 1 stop bit) - 2400 baud
Write-Host "=== Test 3: 8N1 @ 2400 ===" -ForegroundColor Cyan
$env:COM_PORT = $ComPort
$env:BAUD_RATE = "2400"
$env:DATA_BITS = "8"
$env:PARITY = "none"
$env:STOP_BITS = "1"
$env:MODE = "raw"
$env:DEBUG = "true"
npm start

Write-Host ""
Write-Host "Press any key to continue to next test..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Test 4: 7N1 @ 9600
Write-Host "=== Test 4: 7N1 @ 9600 ===" -ForegroundColor Cyan
$env:COM_PORT = $ComPort
$env:BAUD_RATE = "9600"
$env:DATA_BITS = "7"
$env:PARITY = "none"
$env:STOP_BITS = "1"
$env:MODE = "raw"
$env:DEBUG = "true"
npm start

Write-Host ""
Write-Host "Testing selesai!" -ForegroundColor Green

