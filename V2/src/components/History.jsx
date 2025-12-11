import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { History as HistoryIcon, Search, Filter, Download, Eye, Calendar, Clock, User, Package, Database, RotateCcw, X, Printer } from 'lucide-react'
import ImportHistory from './ImportHistory'

const History = ({ onNavigateToDetail, currentUser }) => {
  const [activeTab, setActiveTab] = useState('production')
  const [histories, setHistories] = useState([])
  const [filteredHistories, setFilteredHistories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDateRange, setSelectedDateRange] = useState('all')
  const [selectedUser, setSelectedUser] = useState('all')
  const [showDetails, setShowDetails] = useState(null)
  const [showReactivateModal, setShowReactivateModal] = useState(false)
  const [selectedMO, setSelectedMO] = useState(null)
  const [reactivateNote, setReactivateNote] = useState('')
  const [isReactivating, setIsReactivating] = useState(false)
  const [printHistory, setPrintHistory] = useState([])
  const [isPrintingBatch, setIsPrintingBatch] = useState(false)
  const [printHistoryCount, setPrintHistoryCount] = useState(0)
  const [printHistoryByWorkOrder, setPrintHistoryByWorkOrder] = useState({})
  const [printingWorkOrder, setPrintingWorkOrder] = useState(null)
  
  // Check if user is QC
  const isQC = currentUser && (currentUser.role === 'QC' || currentUser.role === 'qc')

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
          openedAt: h.opened_at || null,
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
          })),
          rejectReason: h.reject_reason || null // Store reject reason if exists
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
    fetchPrintHistory()
  }, [])

  // Fetch print history
  const fetchPrintHistory = async () => {
    try {
      const resp = await fetch('/api/print-history')
      if (!resp.ok) {
        console.warn('⚠️  Print history endpoint returned error:', resp.status, resp.statusText)
        setPrintHistory([])
        setPrintHistoryCount(0)
        setPrintHistoryByWorkOrder({})
        return
      }
      
      const data = await resp.json()
      console.log('📋 Print history response:', { success: data.success, count: data.count })
      
      if (data.success) {
        setPrintHistory(data.data || [])
        setPrintHistoryCount(data.count || 0)
        setPrintHistoryByWorkOrder(data.byWorkOrder || {})
        console.log(`✅ Print history loaded: ${data.count || 0} items, ${Object.keys(data.byWorkOrder || {}).length} work orders`)
      } else {
        console.warn('⚠️  Print history fetch failed:', data.error)
        setPrintHistory([])
        setPrintHistoryCount(0)
        setPrintHistoryByWorkOrder({})
      }
    } catch (e) {
      console.error('❌ Error fetching print history:', e)
      console.error('   Error details:', e.message)
      // Don't show error to user - just log it
      setPrintHistory([])
      setPrintHistoryCount(0)
      setPrintHistoryByWorkOrder({})
    }
  }

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
      case 'reject':
        return '#c0392b'
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
      case 'reject':
        return 'Ditolak'
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
  const statuses = ['all', 'completed', 'in_progress', 'cancelled', 'reject', 'pending']
  const dateRanges = [
    { value: 'all', label: 'Semua Tanggal' },
    { value: 'today', label: 'Hari Ini' },
    { value: 'yesterday', label: 'Kemarin' },
    { value: 'week', label: '7 Hari Terakhir' },
    { value: 'month', label: '30 Hari Terakhir' }
  ]

  const handleReactivateClick = (history) => {
    setSelectedMO(history)
    setReactivateNote('')
    setShowReactivateModal(true)
  }

  // Print batch function - now supports per MO printing
  const handlePrintBatch = async (workOrder = null) => {
    const workOrderLabel = workOrder || 'semua MO'
    const count = workOrder 
      ? (printHistoryByWorkOrder[workOrder]?.count || 0)
      : printHistoryCount

    if (count === 0) {
      alert(`Tidak ada data print yang tersimpan untuk ${workOrder ? `MO ${workOrder}` : 'dicetak'}.`)
      return
    }

    if (!confirm(`Apakah Anda yakin ingin mencetak ${count} label penimbangan untuk ${workOrder ? `MO ${workOrder}` : 'semua MO'}?\n\nData akan dicetak sesuai urutan waktu penimbangan.`)) {
      return
    }

    setIsPrintingBatch(true)
    setPrintingWorkOrder(workOrder)
    try {
      // Get printer config from localStorage
      const savedPrinterConfig = localStorage.getItem('printerConfig')
      const printerConfig = savedPrinterConfig ? JSON.parse(savedPrinterConfig) : {
        printMethod: 'windows-raw',
        printerPort: 'Xprinter XP-420B'
      }

      const response = await fetch('/api/print/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workOrder: workOrder, // Pass workOrder to filter by MO
          printMethod: printerConfig.printMethod || 'windows-raw',
          printerPort: printerConfig.printerPort || 'Xprinter XP-420B',
          printerIP: printerConfig.printerIP,
          networkPort: printerConfig.networkPort || 9100,
          comPort: printerConfig.comPort,
          baudRate: printerConfig.baudRate || 9600,
          async: true
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(`Print batch berhasil dikirim!\n\nMO: ${workOrderLabel}\nTotal: ${result.total} label\nStatus: ${result.status || 'processing'}\n\nLabel akan dicetak secara berurutan sesuai waktu penimbangan.`)
        // Refresh print history count
        fetchPrintHistory()
      } else {
        alert('Error: ' + (result.error || 'Gagal mencetak batch'))
      }
    } catch (error) {
      console.error('Error printing batch:', error)
      alert('Error: ' + error.message)
    } finally {
      setIsPrintingBatch(false)
      setPrintingWorkOrder(null)
    }
  }

  const handleReactivateSubmit = async () => {
    if (!reactivateNote.trim()) {
      alert('Note harus diisi!')
      return
    }

    setIsReactivating(true)
    try {
      const response = await fetch(`/api/work-orders/${encodeURIComponent(selectedMO.workOrder)}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: reactivateNote.trim(),
          qcUserId: currentUser?.id || null
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert('MO berhasil diaktifkan kembali!')
        setShowReactivateModal(false)
        setSelectedMO(null)
        setReactivateNote('')
        // Refresh history list
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
          openedAt: h.opened_at || null,
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
          })),
          rejectReason: h.reject_reason || null
        }))
        setHistories(normalized)
        setFilteredHistories(normalized)
      } else {
        alert('Error: ' + (result.error || 'Gagal mengaktifkan kembali MO'))
      }
    } catch (error) {
      console.error('Error reactivating MO:', error)
      alert('Error: ' + error.message)
    } finally {
      setIsReactivating(false)
    }
  }

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
          {activeTab === 'production' && (
            <>
              {/* Debug: Show print history count even if 0 */}
              {process.env.NODE_ENV === 'development' && (
                <span style={{ marginRight: '10px', fontSize: '12px', color: '#666' }}>
                  Print History: {printHistoryCount} (across {Object.keys(printHistoryByWorkOrder).length} MOs)
                </span>
              )}
            </>
          )}
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
              <div className="history-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                {history.status === 'completed' || history.status === 'reject' ? (
                  !history.openedAt && (
                    <span 
                      className="unopened-badge"
                      style={{ 
                        backgroundColor: '#3b82f6',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}
                    >
                      Belum Dibuka
                    </span>
                  )
                ) : null}
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

            {/* Reject Reason Display */}
            {history.status === 'reject' && history.rejectReason && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                borderLeft: '4px solid #dc2626'
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#991b1b',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>⚠️</span>
                  <span>Alasan Penolakan:</span>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#7f1d1d',
                  lineHeight: '1.6'
                }}>
                  <div><strong>Bahan:</strong> {history.rejectReason.ingredient_name || 'Unknown'} ({history.rejectReason.ingredient_code || '-'})</div>
                  <div><strong>Target:</strong> {(history.rejectReason.target_mass || 0).toFixed(2)} g</div>
                  <div><strong>Berat Aktual:</strong> <span style={{ color: '#dc2626', fontWeight: '600' }}>{(history.rejectReason.actual_mass || 0).toFixed(2)} g</span></div>
                  <div><strong>Batas Maksimal:</strong> {(history.rejectReason.tolerance_max || 0).toFixed(2)} g</div>
                  <div style={{ 
                    marginTop: '4px',
                    padding: '4px 8px',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    borderRadius: '4px',
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    Melebihi: +{(history.rejectReason.excess_amount || 0).toFixed(2)} g
                  </div>
                  {history.rejectReason.violation_count > 1 && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#991b1b' }}>
                      ({history.rejectReason.violation_count} bahan melebihi toleransi)
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="history-actions" style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              {/* Print Batch Button per MO */}
              {printHistoryByWorkOrder[history.workOrder]?.count > 0 && (
                <button 
                  className="action-btn print-batch"
                  onClick={() => handlePrintBatch(history.workOrder)}
                  disabled={isPrintingBatch && printingWorkOrder === history.workOrder}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #10b981',
                    backgroundColor: isPrintingBatch && printingWorkOrder === history.workOrder ? '#9ca3af' : '#10b981',
                    color: '#fff',
                    cursor: isPrintingBatch && printingWorkOrder === history.workOrder ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: isPrintingBatch && printingWorkOrder === history.workOrder ? 0.6 : 1
                  }}
                  title={`Cetak ${printHistoryByWorkOrder[history.workOrder].count} label untuk MO ${history.workOrder}`}
                >
                  <Printer size={16} />
                  {isPrintingBatch && printingWorkOrder === history.workOrder 
                    ? `Mencetak... (${printHistoryByWorkOrder[history.workOrder].count})` 
                    : `Print Batch (${printHistoryByWorkOrder[history.workOrder].count})`}
                </button>
              )}
              {/* QC Reactivate Button - Show for cancelled or rejected MOs when user is QC */}
              {isQC && (history.status === 'cancelled' || history.status === 'reject') && (
                <button 
                  className="action-btn reactivate"
                  onClick={() => handleReactivateClick(history)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  <RotateCcw size={16} />
                  Aktifkan Kembali
                </button>
              )}
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
                              {ingredient.weighingResult.toFixed(1)} (Total)
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

      {/* Reactivate Modal for QC */}
      {showReactivateModal && selectedMO && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Aktifkan Kembali MO
              </h2>
              <button
                onClick={() => {
                  setShowReactivateModal(false)
                  setSelectedMO(null)
                  setReactivateNote('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6b7280'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '8px'
              }}>
                Work Order: <strong>{selectedMO.workOrder}</strong>
              </div>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                Formula: {selectedMO.formulaName}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Catatan (Note) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={reactivateNote}
                onChange={(e) => setReactivateNote(e.target.value)}
                placeholder="Masukkan alasan atau catatan untuk mengaktifkan kembali MO ini..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                disabled={isReactivating}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowReactivateModal(false)
                  setSelectedMO(null)
                  setReactivateNote('')
                }}
                disabled={isReactivating}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: '#374151',
                  cursor: isReactivating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: isReactivating ? 0.5 : 1
                }}
              >
                Batal
              </button>
              <button
                onClick={handleReactivateSubmit}
                disabled={isReactivating || !reactivateNote.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isReactivating || !reactivateNote.trim() ? '#9ca3af' : '#3b82f6',
                  color: '#fff',
                  cursor: isReactivating || !reactivateNote.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isReactivating ? (
                  <>
                    <div className="loading-spinner" style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #fff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Memproses...
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    Aktifkan Kembali
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default History

