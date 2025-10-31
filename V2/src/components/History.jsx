import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { History as HistoryIcon, Search, Filter, Download, Eye, Calendar, Clock, User, Package, Database } from 'lucide-react'
import ImportHistory from './ImportHistory'

const History = () => {
  const [activeTab, setActiveTab] = useState('production')
  const [histories, setHistories] = useState([])
  const [filteredHistories, setFilteredHistories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDateRange, setSelectedDateRange] = useState('all')
  const [selectedUser, setSelectedUser] = useState('all')
  const [showDetails, setShowDetails] = useState(null)

  const mockHistories = []

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const resp = await api.getProductionHistory()
        const list = (resp && resp.data) || []
        const normalized = list.map((h, idx) => ({
          id: h.id || idx,
          workOrder: h.work_order,
          sku: h.sku || '',
          formulaName: h.formulation_name || '',
          operator: h.operator || 'Operator',
          startTime: h.start_time,
          endTime: h.end_time,
          duration: h.end_time ? 'Completed' : 'In Progress',
          status: h.status || 'in_progress',
          totalWeight: parseFloat(h.total_weight) || 0,
          ingredients: []
        }))
        setHistories(normalized)
        setFilteredHistories(normalized)
      } catch (e) {
        setHistories([])
        setFilteredHistories([])
      }
    }
    fetchHistory()
  }, [])

  useEffect(() => {
    filterHistories()
  }, [searchTerm, selectedStatus, selectedDateRange, selectedUser, histories])

  const filterHistories = () => {
    let filtered = histories

    if (searchTerm) {
      filtered = filtered.filter(history =>
        history.workOrder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        history.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        history.formulaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        history.operator.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(history => history.status === selectedStatus)
    }

    if (selectedUser !== 'all') {
      filtered = filtered.filter(history => history.operator === selectedUser)
    }

    if (selectedDateRange !== 'all') {
      const today = new Date()
      const filterDate = new Date()
      
      switch (selectedDateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'yesterday':
          filterDate.setDate(today.getDate() - 1)
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(today.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(today.getMonth() - 1)
          break
      }
      
      filtered = filtered.filter(history => {
        const historyDate = new Date(history.startTime)
        return historyDate >= filterDate
      })
    }

    setFilteredHistories(filtered)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#27ae60'
      case 'in_progress':
        return '#f39c12'
      case 'cancelled':
        return '#e74c3c'
      case 'pending':
        return '#95a5a6'
      default:
        return '#95a5a6'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Selesai'
      case 'in_progress':
        return 'Sedang Berjalan'
      case 'cancelled':
        return 'Dibatalkan'
      case 'pending':
        return 'Menunggu'
      default:
        return status
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const users = ['all', 'Faliq', 'Operator 1', 'Supervisor', 'Administrator']
  const statuses = ['all', 'completed', 'in_progress', 'cancelled', 'pending']
  const dateRanges = [
    { value: 'all', label: 'Semua Tanggal' },
    { value: 'today', label: 'Hari Ini' },
    { value: 'yesterday', label: 'Kemarin' },
    { value: 'week', label: '7 Hari Terakhir' },
    { value: 'month', label: '30 Hari Terakhir' }
  ]

  return (
    <div className="history-page">
      <div className="page-header">
        <div className="page-title">
          <HistoryIcon size={28} />
          <h1>Production History</h1>
        </div>
        <div className="page-description">
          <p>Riwayat produksi dan import data. Pantau performa, analisis data, dan kelola log sistem untuk optimalisasi operasi.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="history-tabs">
        <button
          className={`tab-button ${activeTab === 'production' ? 'active' : ''}`}
          onClick={() => setActiveTab('production')}
        >
          <Package size={20} />
          Production History
        </button>
        <button
          className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <Database size={20} />
          Import History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'import' ? (
        <ImportHistory />
      ) : (
        <div className="production-history-content">

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Cari work order, SKU, formula, atau operator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'Semua Status' : getStatusText(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <Calendar size={16} />
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="filter-select"
            >
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <User size={16} />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="filter-select"
            >
              {users.map(user => (
                <option key={user} value={user}>
                  {user === 'all' ? 'Semua Operator' : user}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="history-list">
        {filteredHistories.map(history => (
          <div key={history.id} className="history-card">
            <div className="history-header">
              <div className="history-info">
                <div className="work-order">{history.workOrder}</div>
                <div className="formula-name">{history.formulaName}</div>
                <div className="sku-info">SKU: {history.sku}</div>
              </div>
              <div className="history-status">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(history.status) }}
                >
                  {getStatusText(history.status)}
                </span>
              </div>
            </div>

            <div className="history-details">
              <div className="detail-row">
                <div className="detail-item">
                  <User size={16} />
                  <span>{history.operator}</span>
                </div>
                <div className="detail-item">
                  <Clock size={16} />
                  <span>{formatDate(history.startTime)}</span>
                </div>
                <div className="detail-item">
                  <Package size={16} />
                  <span>{history.totalWeight.toFixed(1)} g</span>
                </div>
                <div className="detail-item">
                  <span>Durasi: {history.duration}</span>
                </div>
              </div>

              {history.ingredients.length > 0 && (
                <div className="ingredients-summary">
                  <div className="ingredients-title">Bahan:</div>
                  <div className="ingredients-list">
                    {history.ingredients.map((ingredient, index) => (
                      <span 
                        key={index}
                        className={`ingredient-tag ${ingredient.status}`}
                      >
                        {ingredient.name} ({ingredient.actual.toFixed(1)}/{ingredient.target.toFixed(1)}g)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {history.notes && (
                <div className="history-notes">
                  <strong>Catatan:</strong> {history.notes}
                </div>
              )}
            </div>

            <div className="history-actions">
              <button 
                className="action-btn view"
                onClick={() => setShowDetails(history)}
              >
                <Eye size={16} />
                Detail
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredHistories.length === 0 && (
        <div className="empty-state">
          <HistoryIcon size={64} className="empty-icon" />
          <div className="empty-text">Tidak ada history ditemukan</div>
          <div className="empty-subtext">
            {searchTerm || selectedStatus !== 'all' || selectedDateRange !== 'all' || selectedUser !== 'all'
              ? 'Coba ubah filter pencarian' 
              : 'History akan muncul setelah ada proses produksi'
            }
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetails && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-title">
              <HistoryIcon size={28} />
              Detail History - {showDetails.workOrder}
            </div>
            
            <div className="modal-content">
              <div className="detail-grid">
                <div className="detail-section">
                  <h4>Informasi Produksi</h4>
                  <div className="detail-item">
                    <strong>Work Order:</strong> {showDetails.workOrder}
                  </div>
                  <div className="detail-item">
                    <strong>SKU:</strong> {showDetails.sku}
                  </div>
                  <div className="detail-item">
                    <strong>Formula:</strong> {showDetails.formulaName}
                  </div>
                  <div className="detail-item">
                    <strong>Operator:</strong> {showDetails.operator}
                  </div>
                  <div className="detail-item">
                    <strong>Total Berat:</strong> {showDetails.totalWeight.toFixed(1)} g
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Waktu Produksi</h4>
                  <div className="detail-item">
                    <strong>Mulai:</strong> {formatDate(showDetails.startTime)}
                  </div>
                  <div className="detail-item">
                    <strong>Selesai:</strong> {formatDate(showDetails.endTime)}
                  </div>
                  <div className="detail-item">
                    <strong>Durasi:</strong> {showDetails.duration}
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong> 
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(showDetails.status), marginLeft: '8px' }}
                    >
                      {getStatusText(showDetails.status)}
                    </span>
                  </div>
                </div>
              </div>

              {showDetails.ingredients.length > 0 && (
                <div className="detail-section">
                  <h4>Detail Bahan</h4>
                  <div className="ingredients-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Nama Bahan</th>
                          <th>Target (g)</th>
                          <th>Actual (g)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showDetails.ingredients.map((ingredient, index) => (
                          <tr key={index}>
                            <td>{ingredient.name}</td>
                            <td>{ingredient.target.toFixed(1)}</td>
                            <td>{ingredient.actual.toFixed(1)}</td>
                            <td>
                              <span 
                                className="status-badge"
                                style={{ backgroundColor: getStatusColor(ingredient.status) }}
                              >
                                {getStatusText(ingredient.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {showDetails.notes && (
                <div className="detail-section">
                  <h4>Catatan</h4>
                  <div className="notes-content">
                    {showDetails.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDetails(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  )
}

export default History

