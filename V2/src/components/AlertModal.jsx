import React from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const AlertModal = ({ isOpen, onClose, type = 'info', title, message, onConfirm }) => {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} color="#10b981" />
      case 'error':
        return <AlertCircle size={24} color="#ef4444" />
      case 'warning':
        return <AlertTriangle size={24} color="#f59e0b" />
      case 'info':
      default:
        return <Info size={24} color="#3b82f6" />
    }
  }

  const getTitleColor = () => {
    switch (type) {
      case 'success':
        return '#10b981'
      case 'error':
        return '#ef4444'
      case 'warning':
        return '#f59e0b'
      case 'info':
      default:
        return '#3b82f6'
    }
  }

  const getDefaultTitle = () => {
    switch (type) {
      case 'success':
        return 'Berhasil'
      case 'error':
        return 'Error'
      case 'warning':
        return 'Peringatan'
      case 'info':
      default:
        return 'Informasi'
    }
  }

  // Split message by newlines to support multi-line messages
  const messageLines = message ? message.split('\n') : []

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
            {getIcon()}
            <h3 
              style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: getTitleColor(),
                margin: 0
              }}
            >
              {title || getDefaultTitle()}
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
            whiteSpace: 'pre-line'
          }}>
            {messageLines.map((line, index) => (
              <div key={index} style={{ marginBottom: index < messageLines.length - 1 ? '8px' : '0' }}>
                {line}
              </div>
            ))}
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
          {onConfirm ? (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff'
                }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: getTitleColor(),
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                OK
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              style={{
                padding: '8px 24px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: getTitleColor(),
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
            >
              OK
            </button>
          )}
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

export default AlertModal


