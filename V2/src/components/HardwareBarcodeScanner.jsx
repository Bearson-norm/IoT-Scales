import React, { useState, useRef, useEffect } from 'react'
import { QrCode, X, Camera, AlertCircle, CheckCircle } from 'lucide-react'

const HardwareBarcodeScanner = ({ type, onScan, onClose }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState('')
  const [error, setError] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [scannerStatus, setScannerStatus] = useState('disconnected')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scannerRef = useRef(null)

  const getScanTitle = () => {
    switch (type) {
      case 'mo':
        return 'Scan Work Order (MO)'
      case 'sku':
        return 'Scan SKU'
      case 'quantity':
        return 'Scan Quantity'
      case 'ingredient':
        return 'Scan Bahan Mentah'
      default:
        return 'Scan Barcode'
    }
  }

  const getScanPlaceholder = () => {
    switch (type) {
      case 'mo':
        return 'Work Order Number'
      case 'sku':
        return 'SKU Code'
      case 'quantity':
        return 'Quantity'
      case 'ingredient':
        return 'Product Code'
      default:
        return 'Barcode'
    }
  }

  // Simulate kassen scanner connection
  const connectKassenScanner = async () => {
    try {
      setError('')
      setScannerStatus('connecting')
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate successful connection
      setIsConnected(true)
      setScannerStatus('connected')
      
      // Simulate scanner ready
      setTimeout(() => {
        setScannerStatus('ready')
      }, 1000)
      
    } catch (err) {
      setError('Gagal terhubung dengan scanner kassen. Pastikan scanner terhubung dan driver terinstall.')
      setScannerStatus('error')
      console.error('Scanner connection error:', err)
    }
  }

  const disconnectScanner = () => {
    setIsConnected(false)
    setScannerStatus('disconnected')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const startScanning = async () => {
    if (!isConnected) {
      setError('Scanner belum terhubung. Silakan hubungkan scanner terlebih dahulu.')
      return
    }

    try {
      setError('')
      setIsScanning(true)
      setScannerStatus('scanning')
      
      // Simulate kassen scanner data reception
      // In real implementation, this would listen to scanner events
      simulateKassenScan()
      
    } catch (err) {
      setError('Gagal memulai scanning. Periksa koneksi scanner.')
      setIsScanning(false)
      setScannerStatus('error')
    }
  }

  const stopScanning = () => {
    setIsScanning(false)
    setScannerStatus('ready')
  }

  // Simulate kassen scanner data reception
  const simulateKassenScan = () => {
    const mockData = {
      mo: 'PROD/MO/25739',
      sku: 'SKU001',
      quantity: '99000.0',
      ingredient: 'RMLIQ00131'
    }
    
    // Simulate scanning delay
    setTimeout(() => {
      if (isScanning) {
        const scannedCode = mockData[type] || 'MOCK_DATA'
        setScannedData(scannedCode)
        setScannerStatus('success')
        
        // Auto submit after successful scan
        setTimeout(() => {
          onScan(type, scannedCode)
        }, 1000)
      }
    }, 3000)
  }

  const handleManualInput = (e) => {
    setScannedData(e.target.value)
  }

  const handleSubmit = () => {
    if (scannedData.trim()) {
      onScan(type, scannedData.trim())
      setScannedData('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const getStatusIcon = () => {
    switch (scannerStatus) {
      case 'connected':
      case 'ready':
        return <CheckCircle size={20} className="text-green-500" />
      case 'scanning':
        return <div className="loading-spinner" />
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />
      default:
        return <AlertCircle size={20} className="text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (scannerStatus) {
      case 'connecting':
        return 'Menghubungkan ke scanner...'
      case 'connected':
        return 'Scanner terhubung'
      case 'ready':
        return 'Scanner siap'
      case 'scanning':
        return 'Scanning... Arahkan barcode ke scanner'
      case 'success':
        return 'Barcode berhasil di-scan!'
      case 'error':
        return 'Error: Periksa koneksi scanner'
      default:
        return 'Scanner tidak terhubung'
    }
  }

  useEffect(() => {
    return () => {
      disconnectScanner()
    }
  }, [])

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-title">
          <QrCode size={28} />
          {getScanTitle()}
        </div>
        
        <div className="modal-content">
          {/* Scanner Status */}
          <div className="scanner-status">
            <div className="status-indicator">
              {getStatusIcon()}
              <span className="status-text">{getStatusText()}</span>
            </div>
          </div>

          {error && (
            <div style={{ 
              background: '#fee', 
              color: '#c33', 
              padding: '10px', 
              borderRadius: '5px', 
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Scanner Controls */}
          <div className="scanner-controls">
            {!isConnected ? (
              <button 
                className="btn btn-primary"
                onClick={connectKassenScanner}
                disabled={scannerStatus === 'connecting'}
              >
                {scannerStatus === 'connecting' ? (
                  <div className="loading-spinner" />
                ) : (
                  <Camera size={20} />
                )}
                Hubungkan Scanner Kassen
              </button>
            ) : (
              <div className="scanner-actions">
                <button 
                  className="btn btn-primary"
                  onClick={isScanning ? stopScanning : startScanning}
                  disabled={scannerStatus === 'scanning'}
                >
                  {isScanning ? 'Stop Scanning' : 'Start Scanning'}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={disconnectScanner}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <div className="manual-input-section">
            <h4 style={{ marginBottom: '15px', color: '#2c3e50' }}>
              Manual Input (Fallback)
            </h4>
            <div className="form-group">
              <label className="form-label">Manual Input</label>
              <input
                type="text"
                className="form-input"
                placeholder={getScanPlaceholder()}
                value={scannedData}
                onChange={handleManualInput}
                onKeyPress={handleKeyPress}
                disabled={isScanning}
              />
            </div>
          </div>

          {/* Scanner Info */}
          <div className="scanner-info">
            <h4 style={{ marginBottom: '10px', color: '#2c3e50' }}>
              Informasi Scanner
            </h4>
            <div className="info-grid">
              <div className="info-item">
                <strong>Type:</strong> Kassen Barcode Scanner
              </div>
              <div className="info-item">
                <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="info-item">
                <strong>Mode:</strong> {isScanning ? 'Scanning' : 'Standby'}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            <X size={16} />
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={!scannedData.trim()}
          >
            <QrCode size={16} />
            Submit
          </button>
        </div>
      </div>

      <style jsx>{`
        .scanner-status {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: bold;
        }

        .status-text {
          color: #2c3e50;
        }

        .scanner-controls {
          margin-bottom: 25px;
          text-align: center;
        }

        .scanner-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .manual-input-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .scanner-info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #2196f3;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .info-item {
          font-size: 14px;
          color: #2c3e50;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default HardwareBarcodeScanner

