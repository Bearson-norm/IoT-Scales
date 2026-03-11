import React, { useState, useRef, useEffect } from 'react'
import { QrCode, X, Check, AlertCircle } from 'lucide-react'

const ProductVerification = ({ ingredient, onVerify, onClose }) => {
  const [scannedCode, setScannedCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const inputRef = useRef(null)

  // Auto-focus input field when modal opens
  useEffect(() => {
    if (inputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [])

  const handleScan = (e) => {
    setScannedCode(e.target.value)
    setVerificationResult(null)
  }

  const handleVerify = () => {
    if (!scannedCode.trim()) return

    setIsVerifying(true)
    
    // Parse scanned code format: nama_ingredients-dd/mm/yyyy
    // Example: "STRAWBERRY-30/08/2027" or "SALTNIC A6H1007-15/12/2025"
    const scannedValue = scannedCode.trim()
    
    // Check if format contains date (has -dd/mm/yyyy pattern)
    const datePattern = /-(\d{2}\/\d{2}\/\d{4})$/
    const dateMatch = scannedValue.match(datePattern)
    
    let extractedExpDate = null
    let ingredientNameFromScan = scannedValue
    
    if (dateMatch) {
      // Extract exp date and ingredient name
      extractedExpDate = dateMatch[1] // e.g., "30/08/2027"
      ingredientNameFromScan = scannedValue.substring(0, dateMatch.index) // Everything before the date
    }
    
    // Verify: Check if ingredient name matches (case-insensitive, allow spaces/underscores)
    const normalizeName = (name) => {
      return name.toLowerCase()
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/_/g, ' ')   // Replace underscores with spaces
        .trim()
    }
    
    const scannedNameNormalized = normalizeName(ingredientNameFromScan)
    const ingredientNameNormalized = normalizeName(ingredient.name || ingredient.product_name || '')
    
    // Also check code if name doesn't match
    const ingredientCode = ingredient.code || ingredient.id || ''
    const codeMatch = scannedValue === ingredientCode || scannedNameNormalized === normalizeName(ingredientCode)
    
    const nameMatch = scannedNameNormalized === ingredientNameNormalized
    
    const isValid = nameMatch || codeMatch
    
    setVerificationResult(isValid)
    setIsVerifying(false)
    
    if (isValid) {
      // Pass verification result with exp date
      setTimeout(() => {
        onVerify(true, extractedExpDate) // Pass exp date to callback
      }, 1000)
    }
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
              value={ingredient.code || ingredient.id}
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label">Scan Product Code</label>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280' }}>
              Format: nama_ingredients-dd/mm/yyyy (contoh: STRAWBERRY-30/08/2027)
            </div>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                className="form-input"
                placeholder="Product Code atau nama-dd/mm/yyyy"
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

