import React from 'react'
import { RefreshCw, LogOut, User } from 'lucide-react'
import useBranding from '../hooks/useBranding'

const Header = ({ currentUser, onRefresh, onLogout }) => {
  const { logoSrc, companyName } = useBranding()

  return (
    <div className="header">
      <div className="logo">
        <img src={logoSrc} alt={companyName} />
        <span>{companyName}</span>
      </div>
      
      <button className="refresh-btn" onClick={onRefresh}>
        <RefreshCw size={20} />
      </button>
      
      <div className="user-section">
        <div className="user-info">
          <User size={16} />
          <span>{currentUser?.name || 'User'}</span>
          <span className="user-role">({currentUser?.role || 'Operator'})</span>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}

export default Header
