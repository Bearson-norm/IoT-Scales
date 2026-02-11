import React from 'react'
import { QrCode, Package } from 'lucide-react'

const RecipePanel = ({ workOrder, recipe, onIngredientClick, onStartScan, onStartMOScan, isWeighingActive, selectedIngredient }) => {
  const getStatusCounts = () => {
    if (!recipe.length) return { completed: 0, pending: 0, empty: 0, total: 0 }
    
    let completed = 0
    let pending = 0
    let empty = 0
    
    recipe.forEach(item => {
      const savedWeight = parseFloat(item.savedWeight || 0) || 0
      const currentWeight = parseFloat(item.currentWeight || 0) || 0
      const totalWeight = item.totalWeight || (savedWeight + currentWeight)
      const targetWeight = parseFloat(item.targetWeight || 0) || 0
      
      // Check if completed (by status or by weight within tolerance)
      if (item.status === 'completed') {
        completed++
        return
      }
      
      // Check if within tolerance range (completed)
      if (targetWeight > 0) {
        const toleranceMin = item.toleranceMin !== undefined && item.toleranceMin !== null
          ? parseFloat(item.toleranceMin)
          : Math.max(0, targetWeight - 3)
        const toleranceMax = item.toleranceMax !== undefined && item.toleranceMax !== null
          ? parseFloat(item.toleranceMax)
          : targetWeight + 3
        
        if (totalWeight >= toleranceMin && totalWeight <= toleranceMax) {
          completed++
          return
        }
      }
      
      // Check if empty (no weight at all - hasn't been started)
      if (savedWeight === 0 && currentWeight === 0 && totalWeight === 0) {
        empty++
        return
      }
      
      // Otherwise, it's pending (has some weight but not completed)
      pending++
    })
    
    return { completed, pending, empty, total: recipe.length }
  }

  const statusCounts = getStatusCounts()

  const getProgressPercentage = (ingredient) => {
    if (!ingredient || ingredient.targetWeight === 0) return 0
    
    // CRITICAL: Only use currentWeight for the ingredient that is currently being weighed
    // For completed ingredients or other ingredients, only use savedWeight
    // This prevents progress bar from changing for completed ingredients when weighing another ingredient
    
    const savedWeight = parseFloat(ingredient.savedWeight || 0) || 0
    const currentWeight = parseFloat(ingredient.currentWeight || 0) || 0
    
    // Check if this ingredient is the one currently being weighed
    const isCurrentlyActive = selectedIngredient && (
      selectedIngredient.id === ingredient.id ||
      selectedIngredient.code === ingredient.code ||
      (selectedIngredient.name && selectedIngredient.name === ingredient.name)
    )
    
    // Check if ingredient is completed
    const isCompleted = ingredient.status === 'completed' || 
      (ingredient.targetWeight > 0 && 
       ingredient.toleranceMin !== undefined && 
       ingredient.toleranceMax !== undefined &&
       savedWeight >= ingredient.toleranceMin && 
       savedWeight <= ingredient.toleranceMax)
    
    // CRITICAL: Only include currentWeight if:
    // 1. This ingredient is currently active AND weighing is active, OR
    // 2. This ingredient is not completed (to show progress while weighing)
    // For completed ingredients, only use savedWeight to prevent visual changes
    let totalWeight
    if (isCompleted) {
      // Completed ingredients: Only use savedWeight (don't include currentWeight)
      // This ensures progress bar doesn't change when weighing other ingredients
      totalWeight = savedWeight
    } else if (isCurrentlyActive && isWeighingActive) {
      // Currently active ingredient: Use savedWeight + currentWeight for real-time progress
      totalWeight = savedWeight + currentWeight
    } else {
      // Other ingredients: Only use savedWeight (currentWeight should be 0 anyway)
      totalWeight = savedWeight
    }
    
    // Calculate percentage, ensure it doesn't exceed 100%
    const progressPercent = ingredient.targetWeight > 0 
      ? Math.min((totalWeight / ingredient.targetWeight) * 100, 100)
      : 0
    
    return progressPercent
  }

  const getIngredientStatus = (ingredient) => {
    // PRIORITY 1: Use status from backend/database (most accurate)
    // Backend already determines 'completed' status based on tolerance range
    if (ingredient.status === 'completed') {
      return 'completed'
    }
    
    // PRIORITY 2: Check if within tolerance range (if tolerance values are available)
    // This handles cases where status might not be updated yet but weight is within tolerance
    const savedWeight = ingredient.savedWeight || 0
    const currentWeight = ingredient.currentWeight || 0
    const totalWeight = ingredient.totalWeight || (savedWeight + currentWeight)
    const targetWeight = ingredient.targetWeight || 0
    
    // Get tolerance values (from ingredient or calculate default ±3g)
    const toleranceMin = ingredient.toleranceMin !== undefined && ingredient.toleranceMin !== null
      ? parseFloat(ingredient.toleranceMin)
      : Math.max(0, targetWeight - 3)
    const toleranceMax = ingredient.toleranceMax !== undefined && ingredient.toleranceMax !== null
      ? parseFloat(ingredient.toleranceMax)
      : targetWeight + 3
    
    // Check if within tolerance range
    if (targetWeight > 0 && totalWeight >= toleranceMin && totalWeight <= toleranceMax) {
      return 'completed'
    }
    
    // PRIORITY 3: Status from backend
    if (ingredient.status === 'weighing') return 'active'
    
    // PRIORITY 4: If has saved weight, consider it as in progress
    if (savedWeight > 0) return 'active'
    
    // Default: pending
    return 'pending'
  }
  
  // Debug: Log recipe changes to verify updates (reduced logging)
  React.useEffect(() => {
    // Only log significant changes to reduce console spam
    // Removed frequent logging - only log when needed for debugging
  }, [recipe])
  
  const getDisplayWeight = (ingredient) => {
    // Display weight should match progress bar calculation
    // Only show currentWeight for the ingredient that is currently being weighed
    const savedWeight = parseFloat(ingredient.savedWeight || 0) || 0
    const currentWeight = parseFloat(ingredient.currentWeight || 0) || 0
    
    // Check if this ingredient is the one currently being weighed
    const isCurrentlyActive = selectedIngredient && (
      selectedIngredient.id === ingredient.id ||
      selectedIngredient.code === ingredient.code ||
      (selectedIngredient.name && selectedIngredient.name === ingredient.name)
    )
    
    // Check if ingredient is completed
    const isCompleted = ingredient.status === 'completed' || 
      (ingredient.targetWeight > 0 && 
       ingredient.toleranceMin !== undefined && 
       ingredient.toleranceMax !== undefined &&
       savedWeight >= ingredient.toleranceMin && 
       savedWeight <= ingredient.toleranceMax)
    
    // Match progress bar calculation: only include currentWeight for active ingredient
    let totalWeight
    if (isCompleted) {
      totalWeight = savedWeight
    } else if (isCurrentlyActive && isWeighingActive) {
      totalWeight = savedWeight + currentWeight
    } else {
      totalWeight = savedWeight
    }
    
    return totalWeight
  }

  return (
    <div className="recipe-panel">
      <div className="status-indicators">
        <div className="status-item">
          <div className="status-icon completed">{statusCounts.completed}</div>
          <span>Completed</span>
        </div>
        <div className="status-item">
          <div className="status-icon pending">{statusCounts.pending}</div>
          <span>Pending</span>
        </div>
        <div className="status-item">
          <div className="status-icon empty">{statusCounts.empty}</div>
          <span>Empty</span>
        </div>
        <div className="status-item">
          <div className="status-icon total">{statusCounts.total}</div>
          <span>Total</span>
        </div>
      </div>

      <div className="recipe-section">
        <div className="recipe-title">Scale</div>
        
        {!workOrder ? (
          <div className="empty-state">
            <Package size={64} className="empty-icon" />
            <div className="empty-text">Scan Work Order</div>
            <div className="empty-subtext">Mulai proses penimbangan dengan scan MO</div>
            <button 
              className="btn btn-primary"
              onClick={onStartMOScan}
              style={{ marginTop: '20px' }}
            >
              <Package size={20} />
              Scan MO
            </button>
          </div>
        ) : !recipe.length ? (
          <div className="empty-state">
            <Package size={64} className="empty-icon" />
            <div className="empty-text">Belum ada resep</div>
            <div className="empty-subtext">Scan MO untuk pilih formulasi atau scan SKU</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button 
                className="btn btn-primary"
                onClick={onStartMOScan}
              >
                <Package size={20} />
                Scan MO
              </button>
              <button 
                className="btn"
                onClick={() => onStartScan('sku')}
              >
                <QrCode size={20} />
                Scan SKU
              </button>
            </div>
          </div>
        ) : (
          // Display recipe in import order (no sorting - preserve original order from backend)
          recipe.map((ingredient, index) => {
            const status = getIngredientStatus(ingredient)
            const progress = getProgressPercentage(ingredient)
            const displayWeight = getDisplayWeight(ingredient)
            
            // CRITICAL: Use stable, unique key based on ingredient.id (not position-based)
            // This ensures React correctly identifies and updates the right ingredient
            // Adding savedWeight and currentWeight to key ensures re-render when weight changes
            // But primary key is still ingredient.id to maintain component identity
            const uniqueKey = `${ingredient.id || ingredient.code || index}-${ingredient.savedWeight || 0}-${ingredient.currentWeight || 0}`
            
            // Debug: Log when ingredient has currentWeight (reduced logging - only log significant changes)
            // Removed frequent logging to reduce console spam
            
            return (
              <div
                key={uniqueKey}
                className={`ingredient-card ${status}`}
                onClick={() => onIngredientClick(ingredient)}
              >
                <div className="ingredient-header">
                  <div className="ingredient-icon">
                    <QrCode size={16} />
                  </div>
                  <div>
                    <div className="ingredient-name">{ingredient.name}</div>
                    <div className="ingredient-id">Code: {ingredient.code || '-'}</div>
                  </div>
                </div>
                
                <div className="ingredient-weight">
                  <span className="weight-text">
                    {displayWeight.toFixed(1)} / {ingredient.targetWeight.toFixed(1)} g
                  </span>
                  {/* Removed saved-weight-indicator since we're already showing saved weight in the main display */}
                </div>
                
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${status}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default RecipePanel

