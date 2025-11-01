import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { History as HistoryIcon, Search, Filter, Download, Eye, Calendar, Clock, User, Package, Database } from 'lucide-react'
import ImportHistory from './ImportHistory'

const History = ({ onNavigateToDetail }) => {
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
          formulaName: h.formulation_name || 'Unknown',
          operator: h.operator || 'Operator',
          productionDate: h.production_date || h.start_time,
          startTime: h.production_date || h.start_time,
          endTime: h.end_time,
          duration: h.end_time ? 'Completed' : 'In Progress',
          status: h.status || 'in_progress',
          plannedQuantity: parseFloat(h.planned_quantity || 0),
          ingredients: (h.ingredients || []).map(ing => ({
            id: ing.ingredient_id,
            code: ing.ingredient_code,
            name: ing.ingredient_name,
            targetMass: parseFloat(ing.target_mass || 0),
            weighingResult: parseFloat(ing.weighing_result || 0),
            weighingTime: ing.weighing_time,
            status: ing.status || 'pending',
            toleranceMin: parseFloat(ing.tolerance_min || 0),
            toleranceMax: parseFloat(ing.tolerance_max || 0),
            notes: ing.notes
          }))
        }))
        setHistories(normalized)
        setFilteredHistories(normalized)
      } catch (e) {
        console.error('Error fetching history:', e)
        console.error('Error details:', e.message, e.stack)
        // Show user-friendly error message
        if (e.message && e.message.includes('Failed to fetch')) {
          console.error('Network error: Server may not be running or endpoint not reachable')
        }
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
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (e) {
      return '-'
    }
  }
  
  const formatDateOnly = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch (e) {
      return '-'
    }
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
          <div key={history.id} className="history-card" style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            {/* MO Card Header */}
            <div className="history-header" style={{
              borderBottom: '2px solid #f3f4f6',
              paddingBottom: '16px',
              marginBottom: '16px'
            }}>
              <div className="history-info" style={{ flex: 1 }}>
                <div className="work-order" style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  {history.workOrder}
                </div>
                <div className="formula-name" style={{
                  fontSize: '16px',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  {history.formulaName}
                </div>
                <div className="sku-info" style={{
                  fontSize: '14px',
                  color: '#9ca3af'
                }}>
                  SKU: {history.sku}
                </div>
                <div className="production-date" style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Calendar size={14} />
                  <span>Tanggal Produksi: {formatDate(history.productionDate)}</span>
                </div>
              </div>
              <div className="history-status">
                <span 
                  className="status-badge"
                  style={{ 
                    backgroundColor: getStatusColor(history.status),
                    padding: '6px 12px',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  {getStatusText(history.status)}
                </span>
              </div>
            </div>

            {/* Ingredients Weighing Cards */}
            {history.ingredients && history.ingredients.length > 0 && (
              <div className="weighing-details-section" style={{
                marginTop: '16px'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Package size={18} />
                  Hasil Penimbangan ({history.ingredients.length} bahan)
                </div>
                
                <div style={{
                  display: 'grid',
                  gap: '12px'
                }}>
                  {history.ingredients.map((ingredient, index) => (
                    <div 
                      key={ingredient.id || index}
                      className="ingredient-weighing-card"
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '4px'
                        }}>
                          {ingredient.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '4px'
                        }}>
                          Code: {ingredient.code || '-'}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: '#374151',
                          fontWeight: '500'
                        }}>
                          Hasil: <strong style={{ color: '#059669' }}>{ingredient.weighingResult.toFixed(1)}g</strong> / Target: {ingredient.targetMass.toFixed(1)}g
                        </div>
                        {ingredient.weighingTime && (
                          <div style={{
                            fontSize: '11px',
                            color: '#9ca3af',
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={12} />
                            <span>Ditimbang: {formatDate(ingredient.weighingTime)}</span>
                          </div>
                        )}
                      </div>
                      <div style={{
                        marginLeft: '12px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: getStatusColor(ingredient.status || 'pending'),
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '500'
                      }}>
                        {getStatusText(ingredient.status || 'pending')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!history.ingredients || history.ingredients.length === 0) && (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                Belum ada hasil penimbangan
              </div>
            )}

            <div className="history-actions" style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button 
                className="action-btn view"
                onClick={() => {
                  // Navigate to detail page
                  if (onNavigateToDetail) {
                    onNavigateToDetail(history.workOrder)
                  } else {
                    window.location.hash = `#history-detail-${history.workOrder}`
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px'
                }}
              >
                <Eye size={16} />
                Lihat Detail
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
              : histories.length === 0 
                ? 'Belum ada data history. History akan muncul setelah Anda melakukan penimbangan dan menyimpan progress.'
                : 'History akan muncul setelah ada proses produksi'
            }
          </div>
          {histories.length === 0 && (
            <div style={{ marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
              <div>Untuk membuat history:</div>
              <div style={{ marginTop: '8px', paddingLeft: '16px' }}>
                1. Scan MO (Work Order)<br/>
                2. Lakukan penimbangan bahan<br/>
                3. Klik "Save Progress" untuk menyimpan
              </div>
            </div>
          )}
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
                    <strong>Planned Quantity:</strong> {showDetails.plannedQuantity.toFixed(1)} g
                  </div>
                  <div className="detail-item">
                    <strong>Tanggal Produksi:</strong> {formatDate(showDetails.productionDate || showDetails.startTime)}
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

              {showDetails.ingredients && showDetails.ingredients.length > 0 && (
                <div className="detail-section">
                  <h4>Detail Hasil Penimbangan</h4>
                  <div className="ingredients-table">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Nama Bahan</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Code</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Target (g)</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Hasil (g)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Waktu Penimbangan</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showDetails.ingredients.map((ingredient, index) => (
                          <tr key={ingredient.id || index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px' }}>{ingredient.name}</td>
                            <td style={{ padding: '12px', color: '#6b7280', fontSize: '13px' }}>{ingredient.code || '-'}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>{ingredient.targetMass.toFixed(1)}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                              {ingredient.weighingResult.toFixed(1)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
                              {ingredient.weighingTime ? formatDate(ingredient.weighingTime) : '-'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span 
                                className="status-badge"
                                style={{ 
                                  backgroundColor: getStatusColor(ingredient.status || 'pending'),
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  color: '#fff',
                                  fontSize: '11px'
                                }}
                              >
                                {getStatusText(ingredient.status || 'pending')}
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

