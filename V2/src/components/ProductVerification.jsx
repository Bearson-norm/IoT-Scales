import React, { useState } from 'react'
import { QrCode, X, Check, AlertCircle } from 'lucide-react'

const ProductVerification = ({ ingredient, onVerify, onClose }) => {
  const [scannedCode, setScannedCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)

  const handleScan = (e) => {
    setScannedCode(e.target.value)
    setVerificationResult(null)
  }

  const handleVerify = () => {
    if (!scannedCode.trim()) return

    setIsVerifying(true)
    
    // Simulate verification process
    setTimeout(() => {
      const isValid = scannedCode.trim() === ingredient.id
      setVerificationResult(isValid)
      setIsVerifying(false)
      
      if (isValid) {
        setTimeout(() => {
          onVerify(true)
        }, 1000)
      }
    }, 1500)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  const getVerificationMessage = () => {
    if (verificationResult === true) {
      return {
        text: 'Verifikasi Berhasil!',
        color: '#27ae60',
        icon: <Check size={20} />
      }
    } else if (verificationResult === false) {
      return {
        text: 'Kode tidak cocok! Periksa kembali barcode.',
        color: '#e74c3c',
        icon: <AlertCircle size={20} />
      }
    }
    return null
  }

  const verificationMessage = getVerificationMessage()

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title">
          <QrCode size={28} />
          Verify Product
        </div>
        
        <div className="modal-content">
          <div style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              marginBottom: '10px',
              color: '#2c3e50'
            }}>
              Verifikasi kode produk dengan kode pada kartu bahan
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input
              type="text"
              className="form-input readonly"
              value={ingredient.name}
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label">Product Code</label>
            <input
              type="text"
              className="form-input readonly"
              value={ingredient.id}
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label">Scan Product Code</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Product Code"
                value={scannedCode}
                onChange={handleScan}
                onKeyPress={handleKeyPress}
                disabled={isVerifying}
                style={{ paddingRight: '50px' }}
              />
              <button
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#95a5a6',
                  cursor: 'pointer'
                }}
                onClick={() => setScannedCode('')}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {verificationMessage && (
            <div style={{
              background: verificationMessage.color === '#27ae60' ? '#d4edda' : '#f8d7da',
              color: verificationMessage.color,
              padding: '15px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '15px',
              fontWeight: 'bold'
            }}>
              {verificationMessage.icon}
              {verificationMessage.text}
            </div>
          )}

          {isVerifying && (
            <div style={{
              background: '#e3f2fd',
              color: '#1976d2',
              padding: '15px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '15px',
              fontWeight: 'bold'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #1976d2',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Memverifikasi kode...
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            <X size={16} />
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleVerify}
            disabled={!scannedCode.trim() || isVerifying}
          >
            <QrCode size={16} />
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default ProductVerification

