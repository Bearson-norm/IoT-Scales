import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import Header from './components/Header'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import RecipePanel from './components/RecipePanel'
import Footer from './components/Footer'
import BarcodeScanner from './components/BarcodeScanner'
import HardwareBarcodeScanner from './components/HardwareBarcodeScanner'
import ProductVerification from './components/ProductVerification'
import Database from './components/DatabaseSKU'
import DatabaseImport from './components/DatabaseImport'
import Settings from './components/Settings'
import History from './components/History'
import { getCurrentTime } from './utils/timeUtils.js'

function App() {
  const [currentTime, setCurrentTime] = useState(getCurrentTime())
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('home')
  const [workOrder, setWorkOrder] = useState(null)
  const [recipe, setRecipe] = useState([])
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showProductVerification, setShowProductVerification] = useState(false)
  const [scanType, setScanType] = useState('') // 'mo', 'sku', 'quantity', 'ingredient'
  const [useHardwareScanner, setUseHardwareScanner] = useState(true) // Toggle untuk scanner hardware

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [])


  const handleBarcodeScan = (type, data) => {
    if (type === 'mo') {
      // Simulate MO scan - get work order data
      const mockWorkOrder = {
        workOrder: data,
        formulaName: 'MIXING - ICY MINT',
        orderQty: 99000.0,
        sku: 'SKU001',
        mo: data
      }
      setWorkOrder(mockWorkOrder)
      setShowBarcodeScanner(false)
    } else if (type === 'sku') {
      // Simulate SKU scan - get recipe data
      const mockRecipe = [
        {
          id: 'RMLIQ00138',
          name: 'SALTNIC A6H1007',
          currentWeight: 0,
          targetWeight: 11880.0,
          status: 'pending'
        },
        {
          id: 'RMLIQ00131',
          name: 'PROPYLENE GLYCOL (PG)',
          currentWeight: 0,
          targetWeight: 5445.0,
          status: 'pending'
        },
        {
          id: 'RMLIQ00187',
          name: 'VEGETABLE GLYCERIN (VG)',
          currentWeight: 0,
          targetWeight: 39600.0,
          status: 'pending'
        }
      ]
      setRecipe(mockRecipe)
      setShowBarcodeScanner(false)
    } else if (type === 'quantity') {
      // Update work order with quantity
      if (workOrder) {
        setWorkOrder({...workOrder, orderQty: parseFloat(data)})
      }
      setShowBarcodeScanner(false)
    }
  }

  const handleIngredientClick = (ingredient) => {
    setSelectedIngredient(ingredient)
    setShowProductVerification(true)
  }

  const handleProductVerification = (isValid) => {
    if (isValid && selectedIngredient) {
      setShowProductVerification(false)
      // Start weighing process
      setSelectedIngredient({...selectedIngredient, status: 'weighing'})
    } else {
      setShowProductVerification(false)
    }
  }

  const handleStartScan = (type) => {
    setScanType(type)
    setShowBarcodeScanner(true)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <div className="home-content">
            <RecipePanel 
              workOrder={workOrder}
              recipe={recipe}
              onIngredientClick={handleIngredientClick}
              onStartScan={handleStartScan}
            />
            <RightPanel 
              workOrder={workOrder}
              selectedIngredient={selectedIngredient}
              currentPage={currentPage}
            />
          </div>
        )
      case 'database':
        return <Database />
      case 'database-import':
        return <DatabaseImport />
      case 'settings':
        return <Settings />
      case 'history':
        return <History />
      default:
        return (
          <div className="home-content">
            <RecipePanel 
              workOrder={workOrder}
              recipe={recipe}
              onIngredientClick={handleIngredientClick}
              onStartScan={handleStartScan}
            />
            <RightPanel 
              workOrder={workOrder}
              selectedIngredient={selectedIngredient}
              currentPage={currentPage}
            />
          </div>
        )
    }
  }

  const handleLogin = (user) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setWorkOrder(null)
    setRecipe([])
    setSelectedIngredient(null)
  }

  const handleRefresh = () => {
    // Refresh data
    console.log('Refreshing data...')
  }

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <Header 
        currentUser={currentUser}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
      />
      
      <div className="main-content">
        <LeftPanel 
          workOrder={workOrder}
          recipe={recipe}
          onIngredientClick={handleIngredientClick}
          onStartScan={handleStartScan}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
        {renderCurrentPage()}
      </div>

      <Footer currentTime={currentTime} />

      {showBarcodeScanner && (
        useHardwareScanner ? (
          <HardwareBarcodeScanner 
            type={scanType}
            onScan={handleBarcodeScan}
            onClose={() => setShowBarcodeScanner(false)}
          />
        ) : (
          <BarcodeScanner 
            type={scanType}
            onScan={handleBarcodeScan}
            onClose={() => setShowBarcodeScanner(false)}
          />
        )
      )}

      {showProductVerification && selectedIngredient && (
        <ProductVerification 
          ingredient={selectedIngredient}
          onVerify={handleProductVerification}
          onClose={() => setShowProductVerification(false)}
        />
      )}
    </div>
  )
}

export default App
