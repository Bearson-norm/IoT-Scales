import React from 'react'
import { Home, Settings, History, Database, Upload, Package, Users, Inbox } from 'lucide-react'
import { canAccessPage } from '../utils/rolePermissions'

const LeftPanel = ({ workOrder, recipe, onIngredientClick, onStartScan, onStartMOScan, currentPage, onPageChange, currentUser }) => {
  const role = currentUser?.role
  const isHistoryActive = currentPage === 'history' || (currentPage && currentPage.startsWith('history-detail-'))
  const isWeighingReceiverActive = currentPage === 'weighing-receiver' || (currentPage && currentPage.startsWith('weighing-receiver-detail-'))

  return (
    <div className="left-panel-thin">
      <div className="navigation-thin">
        {canAccessPage(role, 'home') && (
          <button
            className={`nav-item-thin ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => onPageChange('home')}
            title="Halaman Utama"
          >
            <Home size={20} />
          </button>
        )}
        {canAccessPage(role, 'database') && (
          <button
            className={`nav-item-thin ${currentPage === 'database' ? 'active' : ''}`}
            onClick={() => onPageChange('database')}
            title="Database"
          >
            <Database size={20} />
          </button>
        )}
        {canAccessPage(role, 'database-import') && (
          <button
            className={`nav-item-thin ${currentPage === 'database-import' ? 'active' : ''}`}
            onClick={() => onPageChange('database-import')}
            title="Database Import"
          >
            <Upload size={20} />
          </button>
        )}
        {canAccessPage(role, 'settings') && (
          <button
            className={`nav-item-thin ${currentPage === 'settings' ? 'active' : ''}`}
            onClick={() => onPageChange('settings')}
            title="Pengaturan"
          >
            <Settings size={20} />
          </button>
        )}
        {canAccessPage(role, 'history') && (
          <button
            className={`nav-item-thin ${isHistoryActive ? 'active' : ''}`}
            onClick={() => onPageChange('history')}
            title="History"
          >
            <History size={20} />
          </button>
        )}
        {canAccessPage(role, 'weighing-receiver') && (
          <button
            className={`nav-item-thin ${isWeighingReceiverActive ? 'active' : ''}`}
            onClick={() => onPageChange('weighing-receiver')}
            title="Data Penimbangan Diterima"
          >
            <Inbox size={20} />
          </button>
        )}
        {canAccessPage(role, 'user-management') && (
          <button
            className={`nav-item-thin ${currentPage === 'user-management' ? 'active' : ''}`}
            onClick={() => onPageChange('user-management')}
            title="User Management"
          >
            <Users size={20} />
          </button>
        )}
      </div>
      <div className="leftpanel-action">
        <button
          className="btn btn-primary btn-scan-mo"
          onClick={onStartMOScan}
          title="Scan MO"
        >
          <Package size={14} />
        </button>
      </div>
    </div>
  )
}

export default LeftPanel
