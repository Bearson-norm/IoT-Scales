// Alert Modal utility - provides a simple way to show alerts using React context
// This will be used with a context provider in App.jsx

import React, { createContext, useContext, useState, useCallback } from 'react'
import AlertModal from '../components/AlertModal'

const AlertModalContext = createContext(null)

export const AlertModalProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'info',
    title: null,
    message: '',
    onConfirm: null
  })

  const showAlert = useCallback((type, message, title = null, onConfirm = null) => {
    setAlertState({
      isOpen: true,
      type,
      title,
      message,
      onConfirm
    })
  }, [])

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      isOpen: false
    }))
  }, [])

  // Convenience methods
  const alert = {
    success: (message, title = null) => showAlert('success', message, title),
    error: (message, title = null) => showAlert('error', message, title),
    warning: (message, title = null) => showAlert('warning', message, title),
    info: (message, title = null) => showAlert('info', message, title),
    confirm: (message, title = null, onConfirm = null) => showAlert('warning', message, title, onConfirm)
  }

  return (
    <AlertModalContext.Provider value={{ showAlert, hideAlert, alert }}>
      {children}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onConfirm={alertState.onConfirm}
      />
    </AlertModalContext.Provider>
  )
}

export const useAlert = () => {
  const context = useContext(AlertModalContext)
  if (!context) {
    throw new Error('useAlert must be used within AlertModalProvider')
  }
  return context
}


