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
import MOScanModal from './components/MOScanModal'
import { getCurrentTime } from './utils/timeUtils.js'
// historyStore removed; history now persisted in PostgreSQL via server endpoints

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
  const [showMOScanModal, setShowMOScanModal] = useState(false)
  const [isWeighingActive, setIsWeighingActive] = useState(false)
  const [currentWeight, setCurrentWeight] = useState(0)
  const [scaleConnected, setScaleConnected] = useState(false)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Poll scale for real-time weight reading
  useEffect(() => {
    if (!isWeighingActive || !selectedIngredient) {
      setCurrentWeight(0)
      return
    }

    let interval = null
    const pollScale = async () => {
      try {
        const resp = await fetch('/api/scale/read')
        if (!resp.ok) {
          if (resp.status === 429 || resp.status === 409 || resp.status === 504) {
            // Throttled, busy, or timeout - skip this poll silently
            return
          }
          // For other errors, also skip silently
          return
        }
        const data = await resp.json()
        if (data.success && data.weight !== undefined) {
          const weightGrams = data.unit === 'kg' ? data.weight * 1000 : data.weight
          setCurrentWeight(weightGrams)
          // Update ingredient current weight in recipe
          setRecipe(prev => prev.map(ing => 
            ing.id === selectedIngredient.id 
              ? { ...ing, currentWeight: weightGrams }
              : ing
          ))
        }
      } catch (e) {
        // Silent fail on scale read error (network errors, etc)
        if (e.name !== 'AbortError') {
          console.debug('Scale read error (silent):', e.message)
        }
      }
    }

    // Poll every 1500ms (reduced frequency to reduce server load and prevent timeout)
    interval = setInterval(pollScale, 1500)
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isWeighingActive, selectedIngredient])


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

  // Handle MO scan completion
  const handleStartWeighing = (moData) => {
    setWorkOrder({
      workOrder: moData.moNumber,
      formulaName: moData.skuName,
      orderQty: parseFloat(moData.quantity),
      sku: moData.formulationCode,
      mo: moData.moNumber,
      formulationId: moData.formulationId
    })
    
    // Load ingredients from formulation
    const ingredients = moData.ingredients.map(ingredient => ({
      id: ingredient.formulation_ingredient_id || ingredient.ingredient_id || ingredient.id,
      code: ingredient.product_code,
      name: ingredient.product_name,
      currentWeight: 0,
      targetWeight: parseFloat(ingredient.target_mass),
      status: 'pending'
    }))
    
    setRecipe(ingredients)
    setIsWeighingActive(true)
    setShowMOScanModal(false)

    // Try resume MO if exists on server
    (async () => {
      try {
        const resp = await fetch(`/api/work-orders/${encodeURIComponent(moData.moNumber)}`)
        const data = await resp.json()
        if (data && data.success && data.data) {
          const wo = data.data.workOrder
          const ings = data.data.ingredients || []
          const mapped = ings.map(it => ({
            id: it.ingredient_id || it.product_code,
            name: it.product_name,
            currentWeight: parseFloat(it.actual_mass) || 0,
            targetWeight: parseFloat(it.target_mass) || 0,
            status: it.status || 'pending'
          }))
          setRecipe(mapped)
        }
      } catch (e) {
        // ignore resume error, continue fresh
      }
    })()

    // Ensure Work Order appears in history immediately by creating/updating record
    ;(async () => {
      try {
        await fetch('/api/weighing/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moNumber: moData.moNumber,
            formulationId: moData.formulationId,
            ingredients: [],
            progress: {
              totalQuantity: parseFloat(moData.quantity) || 0,
              completedIngredients: 0,
              totalIngredients: ingredients.length
            }
          })
        })
      } catch (e) {
        console.error('Failed to create work order history at start', e)
      }
    })()
  }

  // Handle weighing completion
  const handleWeighingComplete = async () => {
    if (!workOrder) return;
    
    try {
      const response = await fetch('/api/weighing/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moNumber: workOrder.mo,
          ingredients: recipe
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Penimbangan berhasil diselesaikan!');
        resetWeighing();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error completing weighing:', error);
      alert('Error menyelesaikan penimbangan');
    }
  }

  // Handle save progress
  const handleSaveProgress = async () => {
    if (!workOrder) return;
    
    try {
      const response = await fetch('/api/weighing/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moNumber: workOrder.mo,
          formulationId: workOrder.formulationId,
          ingredients: recipe,
          progress: {
            totalQuantity: workOrder.orderQty,
            completedIngredients: recipe.filter(ing => ing.status === 'completed').length,
            totalIngredients: recipe.length
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Progress berhasil disimpan!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      alert('Error menyimpan progress');
    }
  }

  // Reset weighing process
  const resetWeighing = () => {
    setWorkOrder(null)
    setRecipe([])
    setSelectedIngredient(null)
    setIsWeighingActive(false)
    setCurrentWeight(0)
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
              onStartMOScan={() => setShowMOScanModal(true)}
              isWeighingActive={isWeighingActive}
            />
            <RightPanel 
              workOrder={workOrder}
              selectedIngredient={selectedIngredient}
              currentPage={currentPage}
              currentWeight={currentWeight}
              scaleConnected={scaleConnected}
              onSaveProgress={handleSaveProgress}
              onCompleteWeighing={handleWeighingComplete}
              isWeighingActive={isWeighingActive}
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
              onStartMOScan={() => setShowMOScanModal(true)}
              isWeighingActive={isWeighingActive}
            />
            <RightPanel 
              workOrder={workOrder}
              selectedIngredient={selectedIngredient}
              currentPage={currentPage}
              currentWeight={currentWeight}
              scaleConnected={scaleConnected}
              onSaveProgress={handleSaveProgress}
              onCompleteWeighing={handleWeighingComplete}
              isWeighingActive={isWeighingActive}
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
          onStartMOScan={() => setShowMOScanModal(true)}
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

      {showMOScanModal && (
        <MOScanModal
          isOpen={showMOScanModal}
          onClose={() => setShowMOScanModal(false)}
          onStartWeighing={handleStartWeighing}
        />
      )}
    </div>
  )
}

export default App
