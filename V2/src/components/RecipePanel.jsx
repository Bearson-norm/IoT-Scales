import React from 'react'
import { QrCode, Package } from 'lucide-react'

const RecipePanel = ({ workOrder, recipe, onIngredientClick, onStartScan, onStartMOScan, isWeighingActive }) => {
  const getStatusCounts = () => {
    if (!recipe.length) return { completed: 0, pending: 0, empty: 0, total: 0 }
    
    const completed = recipe.filter(item => item.status === 'completed').length
    const pending = recipe.filter(item => item.status === 'pending').length
    const empty = recipe.filter(item => item.status === 'empty').length
    
    return { completed, pending, empty, total: recipe.length }
  }

  const statusCounts = getStatusCounts()

  const getProgressPercentage = (ingredient) => {
    if (!ingredient || ingredient.targetWeight === 0) return 0
    
    // Progress bar: Always show savedWeight + currentWeight (total accumulated)
    // This ensures progress bar reflects real-time weighing progress
    // CRITICAL: Use parseFloat to ensure numeric calculation, not string concatenation
    const savedWeight = parseFloat(ingredient.savedWeight || 0) || 0
    const currentWeight = parseFloat(ingredient.currentWeight || 0) || 0
    const totalWeight = savedWeight + currentWeight  // Always calculate from saved + current
    
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
  
  // Debug: Log recipe changes to verify updates
  React.useEffect(() => {
    if (recipe.length > 0) {
      recipe.forEach(ing => {
        if (ing.savedWeight > 0) {
          console.log(`📋 RecipePanel received recipe update for ${ing.name}:`, {
            savedWeight: ing.savedWeight,
            targetWeight: ing.targetWeight,
            currentWeight: ing.currentWeight,
            totalWeight: ing.totalWeight
          })
        }
      })
    }
  }, [recipe])
  
  const getDisplayWeight = (ingredient) => {
    // Display total weight (savedWeight + currentWeight) to match progress bar
    // This ensures weight display matches the progress bar calculation
    const savedWeight = parseFloat(ingredient.savedWeight || 0) || 0
    const currentWeight = parseFloat(ingredient.currentWeight || 0) || 0
    const totalWeight = savedWeight + currentWeight  // Match progress bar calculation
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
          <div className="status-icon completed">{statusCounts.total}</div>
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
            
            // Debug: Log when ingredient has currentWeight to track which one is being updated
            if (ingredient.currentWeight > 0) {
              console.log(`📊 RecipePanel rendering ingredient with currentWeight:`, {
                name: ingredient.name,
                id: ingredient.id,
                code: ingredient.code,
                currentWeight: ingredient.currentWeight,
                savedWeight: ingredient.savedWeight,
                progress: progress.toFixed(1) + '%',
                key: uniqueKey
              })
            }
            
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

