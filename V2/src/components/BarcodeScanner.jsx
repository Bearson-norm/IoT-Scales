import React, { useState, useRef, useEffect } from 'react'
import { QrCode, X, Camera } from 'lucide-react'

const BarcodeScanner = ({ type, onScan, onClose }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState('')
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

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

  const startCamera = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
      }
    } catch (err) {
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.')
      console.error('Camera error:', err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
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

  // Simulate barcode detection (in real app, use a barcode scanning library)
  const simulateBarcodeDetection = () => {
    const mockData = {
      mo: 'PROD/MO/25739',
      sku: 'SKU001',
      quantity: '99000.0',
      ingredient: 'RMLIQ00131'
    }
    
    setTimeout(() => {
      if (isScanning) {
        setScannedData(mockData[type] || 'MOCK_DATA')
        handleSubmit()
      }
    }, 2000)
  }

  useEffect(() => {
    if (isScanning) {
      simulateBarcodeDetection()
    }
  }, [isScanning])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title">
          <QrCode size={28} />
          {getScanTitle()}
        </div>
        
        <div className="modal-content">
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
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              width: '100%', 
              height: '300px', 
              background: '#f0f0f0', 
              border: '2px dashed #ccc',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '15px'
            }}>
              {isScanning ? (
                <div>
                  <video 
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}>
                    Arahkan kamera ke barcode
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#666' }}>
                  <Camera size={48} style={{ marginBottom: '10px' }} />
                  <div>Kamera siap untuk scan</div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button 
                className="btn btn-primary"
                onClick={isScanning ? stopCamera : startCamera}
                style={{ flex: 1 }}
              >
                {isScanning ? 'Stop Camera' : 'Start Camera'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Manual Input</label>
            <input
              type="text"
              className="form-input"
              placeholder={getScanPlaceholder()}
              value={scannedData}
              onChange={handleManualInput}
              onKeyPress={handleKeyPress}
            />
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
    </div>
  )
}

export default BarcodeScanner

