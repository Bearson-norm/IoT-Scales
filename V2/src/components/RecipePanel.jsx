import React from 'react'
import { QrCode } from 'lucide-react'

const RecipePanel = ({ workOrder, recipe, onIngredientClick, onStartScan }) => {
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
    return Math.min((ingredient.currentWeight / ingredient.targetWeight) * 100, 100)
  }

  const getIngredientStatus = (ingredient) => {
    const progress = getProgressPercentage(ingredient)
    if (progress >= 100) return 'completed'
    if (ingredient.status === 'weighing') return 'active'
    return 'pending'
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
            <QrCode size={64} className="empty-icon" />
            <div className="empty-text">Scan Work Order</div>
            <div className="empty-subtext">Scan barcode MO untuk memulai proses</div>
            <button 
              className="btn btn-primary"
              onClick={() => onStartScan('mo')}
              style={{ marginTop: '20px' }}
            >
              <QrCode size={20} />
              Scan MO
            </button>
          </div>
        ) : !recipe.length ? (
          <div className="empty-state">
            <QrCode size={64} className="empty-icon" />
            <div className="empty-text">Scan SKU</div>
            <div className="empty-subtext">Scan barcode SKU untuk mendapatkan resep</div>
            <button 
              className="btn btn-primary"
              onClick={() => onStartScan('sku')}
              style={{ marginTop: '20px' }}
            >
              <QrCode size={20} />
              Scan SKU
            </button>
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
                    <div className="ingredient-id">ID: {ingredient.id}</div>
                  </div>
                </div>
                
                <div className="ingredient-weight">
                  <span className="weight-text">
                    {ingredient.currentWeight.toFixed(1)} / {ingredient.targetWeight.toFixed(1)} g
                  </span>
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

