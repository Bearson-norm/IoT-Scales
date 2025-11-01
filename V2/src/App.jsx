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
import HistoryDetail from './components/HistoryDetail'
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
          
          // Accumulate with previously saved weight (if any)
          // Use savedWeight from selectedIngredient which is loaded from database
          const savedWeight = selectedIngredient.savedWeight || 0
          const totalWeight = savedWeight + weightGrams
          
          setCurrentWeight(weightGrams) // Current reading from scale
          
          // Update ingredient current weight in recipe (accumulated total)
          setRecipe(prev => prev.map(ing => 
            ing.id === selectedIngredient.id 
              ? { 
                  ...ing, 
                  currentWeight: weightGrams, // Current scale reading
                  totalWeight: totalWeight, // Accumulated total (saved + current)
                  savedWeight: savedWeight // Keep saved weight (don't change it until save)
                }
              : ing
          ))
          
          // Also update selectedIngredient state to reflect the saved weight
          setSelectedIngredient(prev => ({
            ...prev,
            savedWeight: savedWeight,
            totalWeight: totalWeight
          }))
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

  const handleIngredientClick = async (ingredient) => {
    // Load saved weight from database if work order exists
    let savedWeight = ingredient.savedWeight || ingredient.totalWeight || ingredient.actualWeight || 0;
    
    if (workOrder && workOrder.mo) {
      try {
        const resp = await fetch(`/api/work-orders/${encodeURIComponent(workOrder.mo)}`);
        const data = await resp.json();
        if (data && data.success && data.data && data.data.ingredients) {
          const savedIngredient = data.data.ingredients.find(
            ing => (ing.ingredient_id || ing.id) === ingredient.id
          );
          if (savedIngredient) {
            savedWeight = parseFloat(savedIngredient.actual_mass || 0);
            console.log(`📊 Loaded saved weight for ${ingredient.name}: ${savedWeight}g`);
          }
        }
      } catch (e) {
        console.warn('Failed to load saved weight from database:', e);
      }
    }
    
    // Load saved weight and tracking data from ingredient
    const ingredientWithSaved = {
      ...ingredient,
      savedWeight: savedWeight,
      totalWeight: savedWeight, // Start with saved weight
      currentWeight: 0, // Reset current reading for new measurement
      // Preserve tracking fields if available
      progressPercentage: ingredient.progressPercentage || 0,
      remainingWeight: ingredient.remainingWeight || (ingredient.targetWeight - savedWeight),
      isWithinTolerance: ingredient.isWithinTolerance,
      toleranceMin: ingredient.toleranceMin,
      toleranceMax: ingredient.toleranceMax,
      weighingStartedAt: ingredient.weighingStartedAt,
      weighingUpdatedAt: ingredient.weighingUpdatedAt,
      weighingCompletedAt: ingredient.weighingCompletedAt
    };
    
    console.log(`📊 Resuming ingredient ${ingredient.name}:`);
    console.log(`   - Saved weight: ${savedWeight}g`);
    console.log(`   - Target: ${ingredient.targetWeight}g`);
    console.log(`   - Progress: ${ingredient.progressPercentage || 0}%`);
    console.log(`   - Remaining: ${ingredient.remainingWeight || (ingredient.targetWeight - savedWeight)}g`);
    
    setSelectedIngredient(ingredientWithSaved);
    setShowProductVerification(true);
  }

  const handleProductVerification = (isValid) => {
    if (isValid && selectedIngredient) {
      setShowProductVerification(false)
      // Start weighing process
      setSelectedIngredient({...selectedIngredient, status: 'weighing'})
      setIsWeighingActive(true) // Activate weighing to start scale polling
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
    
    // Check if this is a resume operation (has existing progress)
    if (moData.isResume && moData.ingredients && moData.ingredients.length > 0) {
      // Resume mode: Load ingredients with existing progress from database
      console.log('📋 Resuming work order with existing progress')
      console.log('📋 Resume data received:', {
        ingredientCount: moData.ingredients.length,
        firstIngredient: moData.ingredients[0]
      })
      
      const mapped = moData.ingredients.map(it => {
        const ingredientId = it.ingredient_id || it.formulation_ingredient_id || it.id
        const actualMass = parseFloat(it.actual_mass || 0) || 0
        const targetMass = parseFloat(it.target_mass || 0) || 0
        const savedWeight = actualMass
        
        return {
          id: ingredientId,
          code: it.product_code || '',
          name: it.product_name || 'Unknown',
          currentWeight: 0, // Reset current reading for new measurement session
          targetWeight: targetMass,
          status: it.status || 'pending',
          savedWeight: savedWeight, // Load saved/accumulated weight from database
          totalWeight: savedWeight, // Set total to saved weight
          actualWeight: savedWeight,
          // Include all tracking fields from database
          progressPercentage: parseFloat(it.progress_percentage || ((targetMass > 0 ? (actualMass / targetMass * 100) : 0))) || 0,
          remainingWeight: parseFloat(it.remaining_weight || Math.max(0, targetMass - actualMass)) || 0,
          isWithinTolerance: it.is_within_tolerance,
          toleranceMin: parseFloat(it.tolerance_min || 0) || 0,
          toleranceMax: parseFloat(it.tolerance_max || 0) || 0,
          weighingStartedAt: it.weighing_started_at,
          weighingUpdatedAt: it.weighing_updated_at,
          weighingCompletedAt: it.weighing_completed_at,
          weighingNotes: it.weighing_notes || ''
        }
      })
      
      console.log('📋 Mapped ingredients for resume:', mapped.map(ing => ({
        id: ing.id,
        name: ing.name,
        savedWeight: ing.savedWeight,
        totalWeight: ing.totalWeight,
        targetWeight: ing.targetWeight,
        status: ing.status
      })))
      
      // Verify that saved weights are loaded correctly
      const totalSavedWeight = mapped.reduce((sum, ing) => sum + (ing.savedWeight || 0), 0)
      console.log(`📊 Resume verification: ${mapped.length} ingredients, total saved weight: ${totalSavedWeight.toFixed(1)}g`)
      
      setRecipe(mapped)
      setIsWeighingActive(true)
      setShowMOScanModal(false)
      
      // Show resume notification with detailed info
      const completedCount = mapped.filter(ing => ing.status === 'completed').length
      const inProgressCount = mapped.filter(ing => {
        const status = ing.status || 'pending'
        const hasWeight = (ing.savedWeight || 0) > 0
        return status === 'weighing' || (status === 'pending' && hasWeight)
      }).length
      const totalWithProgress = mapped.filter(ing => (ing.savedWeight || 0) > 0).length
      
      alert(`✅ Work Order Diresume!\n\nProgress:\n- ${completedCount}/${mapped.length} bahan selesai\n- ${inProgressCount} bahan sedang ditimbang\n- ${totalWithProgress} bahan memiliki saved weight\n\nLanjutkan penimbangan dari progress sebelumnya.`)
      return
    }
    
    // New work order mode: Load ingredients from formulation
    const ingredients = moData.ingredients.map(ingredient => ({
      id: ingredient.formulation_ingredient_id || ingredient.ingredient_id || ingredient.id,
      code: ingredient.product_code || '',
      name: ingredient.product_name || 'Unknown',
      currentWeight: 0,
      targetWeight: parseFloat(ingredient.target_mass || 0) || 0,
      status: 'pending',
      savedWeight: 0,
      totalWeight: 0,
      actualWeight: 0
    }))
    
    setRecipe(ingredients)
    setIsWeighingActive(true)
    setShowMOScanModal(false)

    // Try to check for existing progress on server (fallback check)
    (async () => {
      try {
        const resp = await fetch(`/api/work-orders/${encodeURIComponent(moData.moNumber)}`)
        const data = await resp.json()
        if (data && data.success && data.data) {
          const wo = data.data.workOrder
          const ings = data.data.ingredients || []
          const hasProgress = ings.some(ing => {
            const actualMass = parseFloat(ing.actual_mass || 0) || 0
            return actualMass > 0
          })
          
          if (hasProgress) {
            const mapped = ings.map(it => ({
              id: it.ingredient_id || it.product_code,
              name: it.product_name || 'Unknown',
              code: it.product_code || '',
              currentWeight: 0,
              targetWeight: parseFloat(it.target_mass || 0) || 0,
              status: it.status || 'pending',
              savedWeight: parseFloat(it.actual_mass || 0) || 0,
              totalWeight: parseFloat(it.actual_mass || 0) || 0,
              actualWeight: parseFloat(it.actual_mass || 0) || 0,
              progressPercentage: parseFloat(it.progress_percentage || 0) || 0,
              remainingWeight: parseFloat(it.remaining_weight || 0) || 0,
              isWithinTolerance: it.is_within_tolerance,
              toleranceMin: parseFloat(it.tolerance_min || 0) || 0,
              toleranceMax: parseFloat(it.tolerance_max || 0) || 0,
              weighingStartedAt: it.weighing_started_at,
              weighingUpdatedAt: it.weighing_updated_at,
              weighingCompletedAt: it.weighing_completed_at,
              weighingNotes: it.weighing_notes || ''
            }))
            setRecipe(mapped)
            console.log('📋 Loaded existing progress from server')
          }
        }
      } catch (e) {
        // ignore resume error, continue fresh
        console.warn('Could not check for existing progress:', e)
      }
    })()

    // Ensure Work Order appears in history immediately by creating/updating record
    ;(async () => {
      try {
        await fetch('http://localhost:3001/api/weighing/save-progress', {
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
      const response = await fetch('http://localhost:3001/api/weighing/complete', {
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
      const response = await fetch('http://localhost:3001/api/weighing/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
            moNumber: workOrder.mo,
            formulationId: workOrder.formulationId,
            ingredients: recipe.map(ing => ({
              ...ing,
              // Send only the current reading (not accumulated), server will accumulate with saved weight
              // currentWeight is the new weight reading from scale, server will add it to existing saved weight
              currentWeight: ing.currentWeight || 0, // Current scale reading only
              actualWeight: ing.currentWeight || 0   // Current scale reading only (server will accumulate)
            })),
          progress: {
            totalQuantity: workOrder.orderQty,
            completedIngredients: recipe.filter(ing => ing.status === 'completed').length,
            totalIngredients: recipe.length
          }
        }),
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to save progress';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert('Progress berhasil disimpan!');
        
        // Reset right panel after successful save
        // User needs to click ingredient again and scan again to continue
        const currentSelectedId = selectedIngredient?.id;
        setSelectedIngredient(null);
        setCurrentWeight(0);
        setIsWeighingActive(false);
        setShowProductVerification(false);
        
        // Reset ingredient status back to pending if it was weighing
        // The saved weight is already saved to database, now we need to update local state
        // Load the saved weight from database to ensure consistency
        if (currentSelectedId) {
          // After save, we need to reload the saved weight from database to get the correct accumulated value
          // But for now, update local state with the accumulated value we just sent
          // Note: The server accumulates existingMass + newMass, so we update local state accordingly
          setRecipe(prev => prev.map(ing => {
            if (ing.id === currentSelectedId && ing.status === 'weighing') {
              // The server saved: existingMass + currentWeight
              // So the new savedWeight should be: savedWeight (existing) + currentWeight (new reading)
              const previousSavedWeight = ing.savedWeight || 0;
              const currentReading = ing.currentWeight || 0;
              const newSavedWeight = previousSavedWeight + currentReading; // This matches server calculation
              return { 
                ...ing, 
                status: 'pending',
                savedWeight: newSavedWeight, // Updated accumulated weight (saved in database)
                currentWeight: 0, // Reset current reading for next measurement
                totalWeight: newSavedWeight // Update total to match saved weight
              };
            }
            return ing;
          }));
        }
      } else {
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      console.error('Error details:', error.message);
      alert('Error menyimpan progress: ' + error.message);
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
        return <History onNavigateToDetail={(moNumber) => setCurrentPage(`history-detail-${moNumber}`)} />
      default:
        if (currentPage && currentPage.startsWith('history-detail-')) {
          const moNumber = currentPage.replace('history-detail-', '')
          return <HistoryDetail moNumber={moNumber} onBack={() => setCurrentPage('history')} />
        }
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
