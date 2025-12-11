import React from 'react'
import { Printer, Save, X } from 'lucide-react'

const PrintConfirmationModal = ({ isOpen, onClose, onSaveAndPrint, onSaveOnly, ingredientName, currentWeight, targetWeight }) => {
  if (!isOpen) return null

  return (
    <div 
      className="modal-backdrop" 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0, 0, 0, 0.5)', 
        zIndex: 10000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '16px',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="modal-content" 
        style={{ 
          width: '100%',
          maxWidth: '500px', 
          background: '#fff', 
          borderRadius: '12px', 
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
          animation: 'slideUp 0.3s ease-out',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div 
          className="modal-header" 
          style={{ 
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f9fafb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Printer size={24} color="#3b82f6" />
            <h3 
              style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#3b82f6',
                margin: 0
              }}
            >
              Konfirmasi Print Penimbangan
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
              e.currentTarget.style.color = '#1f2937'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#6b7280'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div 
          className="modal-body" 
          style={{ 
            padding: '24px',
            maxHeight: '60vh',
            overflowY: 'auto'
          }}
        >
          <div style={{ 
            fontSize: '14px', 
            color: '#374151',
            lineHeight: '1.6',
            marginBottom: '16px'
          }}>
            <p style={{ marginBottom: '12px' }}>
              Apakah Anda ingin mencetak label setelah menyimpan data penimbangan?
            </p>
            
            {/* Display weighing information */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginTop: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Detail Penimbangan:</div>
              <div style={{ fontSize: '13px', color: '#374151' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Bahan:</strong> {ingredientName || 'N/A'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Berat Saat Ini:</strong> {currentWeight ? `${parseFloat(currentWeight).toFixed(1)} g` : '0.0 g'}
                </div>
                <div>
                  <strong>Target Berat:</strong> {targetWeight ? `${parseFloat(targetWeight).toFixed(1)} g` : '0.0 g'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div 
          className="modal-footer" 
          style={{ 
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: '#f9fafb'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff'
            }}
          >
            <X size={16} />
            Batal
          </button>
          <button
            onClick={() => {
              onSaveOnly()
              onClose()
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: '1px solid #3b82f6',
              backgroundColor: '#fff',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff'
            }}
          >
            <Save size={16} />
            Simpan Saja
          </button>
          <button
            onClick={() => {
              onSaveAndPrint()
              onClose()
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            <Printer size={16} />
            Simpan & Print
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default PrintConfirmationModal





