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
    if (ingredient.targetWeight === 0) return 0
    // Use totalWeight (savedWeight + currentWeight) or fallback to currentWeight
    const totalWeight = ingredient.totalWeight || (ingredient.savedWeight || 0) + (ingredient.currentWeight || 0)
    return Math.min((totalWeight / ingredient.targetWeight) * 100, 100)
  }

  const getIngredientStatus = (ingredient) => {
    const progress = getProgressPercentage(ingredient)
    if (progress >= 100) return 'completed'
    if (ingredient.status === 'weighing') return 'active'
    // If has saved weight, consider it as in progress
    if ((ingredient.savedWeight || 0) > 0) return 'active'
    return 'pending'
  }
  
  const getDisplayWeight = (ingredient) => {
    // Display total weight (saved + current) for better visibility
    const savedWeight = ingredient.savedWeight || 0
    const currentWeight = ingredient.currentWeight || 0
    const totalWeight = ingredient.totalWeight || (savedWeight + currentWeight)
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
          recipe.map((ingredient, index) => {
            const status = getIngredientStatus(ingredient)
            const progress = getProgressPercentage(ingredient)
            
            return (
              <div
                key={ingredient.id}
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
                    {getDisplayWeight(ingredient).toFixed(1)} / {ingredient.targetWeight.toFixed(1)} g
                  </span>
                  {(ingredient.savedWeight || 0) > 0 && (
                    <span className="saved-weight-indicator" style={{ 
                      fontSize: '10px', 
                      color: '#6b7280', 
                      display: 'block',
                      marginTop: '2px'
                    }}>
                      (Saved: {(ingredient.savedWeight || 0).toFixed(1)}g)
                    </span>
                  )}
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

