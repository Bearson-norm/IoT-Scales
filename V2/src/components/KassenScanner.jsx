import React, { useState, useEffect, useRef } from 'react';
import { Camera, Scan, AlertCircle, CheckCircle } from 'lucide-react';

const KassenScanner = ({ onScan, onError, isActive = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannerConnected, setScannerConnected] = useState(false);
  const [lastScanResult, setLastScanResult] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Initialize scanner connection
  useEffect(() => {
    initializeScanner();
    return () => {
      cleanup();
    };
  }, []);

  // Start/stop scanning based on isActive prop
  useEffect(() => {
    if (isActive && scannerConnected) {
      startScanning();
    } else {
      stopScanning();
    }
  }, [isActive, scannerConnected]);

  const initializeScanner = async () => {
    try {
      // Check if scanner is available (simulate Kassen RS720W)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No camera/scanner found');
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: videoDevices[0].deviceId,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setScannerConnected(true);
      console.log('Kassen RS720W Scanner connected');
    } catch (error) {
      console.error('Scanner initialization failed:', error);
      setScannerConnected(false);
      onError && onError(error.message);
    }
  };

  const startScanning = () => {
    if (!scannerConnected) return;

    setIsScanning(true);
    
    // Simulate QR code scanning with interval
    scanIntervalRef.current = setInterval(() => {
      // Simulate scanning process
      const mockQRData = generateMockQRData();
      if (mockQRData) {
        handleScanResult(mockQRData);
      }
    }, 2000); // Scan every 2 seconds
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const generateMockQRData = () => {
    // Simulate QR code detection (in real implementation, this would be actual QR detection)
    const mockData = [
      'INGREDIENT_MENTHOL_C8J3010',
      'INGREDIENT_PEPPERMINT_C8J3012',
      'INGREDIENT_SWEETNER_A6H1010',
      'INGREDIENT_CREAM_BASE_PRD005'
    ];
    
    // Randomly return a QR code (simulate detection)
    if (Math.random() > 0.7) {
      return mockData[Math.floor(Math.random() * mockData.length)];
    }
    return null;
  };

  const handleScanResult = (qrData) => {
    setLastScanResult(qrData);
    onScan && onScan(qrData);
    stopScanning();
  };

  const cleanup = () => {
    stopScanning();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScannerConnected(false);
  };

  const manualScan = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  return (
    <div className="w-full">
      {/* Scanner Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Camera className={`mr-2 ${scannerConnected ? 'text-green-500' : 'text-red-500'}`} size={20} />
          <span className={`text-sm ${scannerConnected ? 'text-green-600' : 'text-red-600'}`}>
            {scannerConnected ? 'Kassen RS720W Ready' : 'Scanner Disconnected'}
          </span>
        </div>
        <button
          onClick={manualScan}
          disabled={!scannerConnected}
          className={`px-3 py-1 rounded-md text-sm flex items-center ${
            isScanning
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:bg-gray-400 disabled:cursor-not-allowed`}
        >
          {isScanning ? (
            <>
              <AlertCircle className="mr-1" size={14} />
              Stop Scan
            </>
          ) : (
            <>
              <Scan className="mr-1" size={14} />
              Start Scan
            </>
          )}
        </button>
      </div>

      {/* Video Preview */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-48 object-cover"
        />
        
        {/* Scanning Overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black bg-opacity-50 rounded-lg p-4">
              <div className="flex items-center text-white">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                <span>Scanning QR Code...</span>
              </div>
            </div>
          </div>
        )}

        {/* Scan Success Overlay */}
        {lastScanResult && !isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-green-500 bg-opacity-90 rounded-lg p-4">
              <div className="flex items-center text-white">
                <CheckCircle className="mr-3" size={24} />
                <div>
                  <div className="font-medium">QR Code Detected!</div>
                  <div className="text-sm opacity-90">{lastScanResult}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <h4 className="font-medium text-blue-800 mb-2">Instruksi Scanner:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Pastikan QR Code terlihat jelas di area kamera</li>
          <li>• Scanner akan otomatis mendeteksi QR Code</li>
          <li>• Tunggu konfirmasi sebelum melanjutkan</li>
          <li>• Jika gagal, klik "Start Scan" untuk mencoba lagi</li>
        </ul>
      </div>

      {/* Last Scan Result */}
      {lastScanResult && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-3">
          <h4 className="font-medium text-gray-800 mb-1">Hasil Scan Terakhir:</h4>
          <div className="text-sm text-gray-600 font-mono bg-white border border-gray-300 rounded px-2 py-1">
            {lastScanResult}
          </div>
        </div>
      )}
    </div>
  );
};

export default KassenScanner;




