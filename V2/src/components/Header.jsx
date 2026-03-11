import React from 'react'
import { RefreshCw, LogOut, User } from 'lucide-react'
import logoImage from '../assets/logo-km.jpeg'

const Header = ({ currentUser, onRefresh, onLogout }) => {
  return (
    <div className="header">
      <div className="logo">
        <img src={logoImage} alt="Logo" />
        <span>Kebanggaan Masyarakat Indonesia</span>
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
