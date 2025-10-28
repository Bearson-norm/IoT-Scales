import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Package, Filter, Download, Upload, Database as DatabaseIcon, Users, Settings, Target } from 'lucide-react'
import MasterProduct from './database/MasterProduct'
import MasterFormulation from './database/MasterFormulation'
import MasterToleranceGrouping from './database/MasterToleranceGrouping'
import MasterUser from './database/MasterUser'
import apiService from '../../services/api.js'

const Database = () => {
  const [activeTab, setActiveTab] = useState('product')
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalFormulations: 0,
    activeUsers: 0
  })

  // Load stats on component mount
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Load products count
      const productsResponse = await apiService.getProducts()
      const totalProducts = productsResponse.success ? productsResponse.data.length : 0

      // Load formulations count
      const formulationsResponse = await apiService.getFormulations()
      const totalFormulations = formulationsResponse.success ? formulationsResponse.data.length : 0

      // Load users count (assuming active users)
      const usersResponse = await apiService.getUsers()
      const activeUsers = usersResponse.success ? usersResponse.data.filter(user => user.status === 'active').length : 0

      setStats({
        totalProducts,
        totalFormulations,
        activeUsers
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Expose refresh function for external calls
  const refreshStats = () => {
    loadStats()
  }

  // Listen for custom events to refresh stats when database is updated
  useEffect(() => {
    const handleDatabaseUpdate = () => {
      loadStats()
    }

    window.addEventListener('database_updated', handleDatabaseUpdate)
    return () => window.removeEventListener('database_updated', handleDatabaseUpdate)
  }, [])

  const tabs = [
    { id: 'product', label: 'Master Product', icon: Package },
    { id: 'formulation', label: 'Master Formulation', icon: DatabaseIcon },
    { id: 'tolerance', label: 'Master Tolerance Grouping', icon: Target },
    { id: 'user', label: 'Master User', icon: Users }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'product':
        return <MasterProduct />
      case 'formulation':
        return <MasterFormulation />
      case 'tolerance':
        return <MasterToleranceGrouping />
      case 'user':
        return <MasterUser />
      default:
        return <MasterProduct />
    }
  }

  return (
    <div className="database-page">
      <div className="page-header">
        <div className="page-title">
          <DatabaseIcon size={28} />
          <h1>Database Management</h1>
        </div>
        <div className="page-description">
          <p>Kelola data master untuk sistem penimbangan. Import, export, dan konfigurasi data produk, formulasi, toleransi, dan pengguna.</p>
        </div>
      </div>

      <div className="database-container">
        <div className="database-sidebar">
          <div className="sidebar-header">
            <h3>Master Data</h3>
            <p>Pilih kategori data yang ingin dikelola</p>
          </div>
          <div className="database-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`database-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={20} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          
          <div className="sidebar-footer">
            <div className="quick-stats">
              <h4>Quick Stats</h4>
              <div className="stat-item">
                <span className="stat-label">Total Products:</span>
                <span className="stat-value">{stats.totalProducts}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Formulations:</span>
                <span className="stat-value">{stats.totalFormulations}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Active Users:</span>
                <span className="stat-value">{stats.activeUsers}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="database-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

export default Database
