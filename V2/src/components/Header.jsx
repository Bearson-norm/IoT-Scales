import React from 'react'
import { RefreshCw, Scale, LogOut, User } from 'lucide-react'

const Header = ({ currentUser, onRefresh, onLogout }) => {
  return (
    <div className="header">
      <div className="logo">
        <Scale size={32} />
        <span>Foom Lab Global</span>
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
