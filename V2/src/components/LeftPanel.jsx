import React from 'react'
import { Home, List, Settings, History, AlertTriangle, QrCode, Database, Upload, Package } from 'lucide-react'

const LeftPanel = ({ workOrder, recipe, onIngredientClick, onStartScan, onStartMOScan, currentPage, onPageChange }) => {
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

  // Selalu tampilkan navigation tipis
  return (
    <div className="left-panel-thin">
      <div className="navigation-thin">
        <button 
          className={`nav-item-thin ${currentPage === 'home' ? 'active' : ''}`}
          onClick={() => onPageChange('home')}
          title="Halaman Utama"
        >
          <Home size={20} />
        </button>
        <button 
          className={`nav-item-thin ${currentPage === 'database' ? 'active' : ''}`}
          onClick={() => onPageChange('database')}
          title="Database"
        >
          <Database size={20} />
        </button>
        <button 
          className={`nav-item-thin ${currentPage === 'database-import' ? 'active' : ''}`}
          onClick={() => onPageChange('database-import')}
          title="Database Import"
        >
          <Upload size={20} />
        </button>
        <button 
          className={`nav-item-thin ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => onPageChange('settings')}
          title="Pengaturan"
        >
          <Settings size={20} />
        </button>
        <button 
          className={`nav-item-thin ${currentPage === 'history' ? 'active' : ''}`}
          onClick={() => onPageChange('history')}
          title="History"
        >
          <History size={20} />
        </button>
      </div>
      <div className="leftpanel-action">
        <button
          className="btn btn-primary btn-scan-mo"
          onClick={onStartMOScan}
          title="Scan MO"
          style={{ marginTop: '8px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Package size={16} />
          Scan MO
        </button>
      </div>
    </div>
  )
}

export default LeftPanel
