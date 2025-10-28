import React, { useState, useEffect } from 'react'
import { History, Download, Filter, Search, Clock, CheckCircle, XCircle, AlertCircle, Server, FileText, Database } from 'lucide-react'
import importLogger from '../utils/importLogger.js'

const ImportHistory = () => {
  const [importLogs, setImportLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedSource, setSelectedSource] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [statistics, setStatistics] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  useEffect(() => {
    loadImportHistory()
    loadStatistics()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [searchTerm, selectedType, selectedStatus, selectedSource, importLogs])

  const loadImportHistory = async () => {
    try {
      const result = await importLogger.getImportHistory(100, 0)
      setImportLogs(result.logs)
    } catch (error) {
      console.error('Error loading import history:', error)
    }
  }

  const loadStatistics = async () => {
    try {
      const stats = await importLogger.getImportStatistics()
      setStatistics(stats)
    } catch (error) {
      console.error('Error loading statistics:', error)
    }
  }

  const filterLogs = () => {
    let filtered = importLogs

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.source_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.import_type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(log => log.import_type === selectedType)
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(log => log.status === selectedStatus)
    }

    if (selectedSource !== 'all') {
      filtered = filtered.filter(log => log.source_type === selectedSource)
    }

    setFilteredLogs(filtered)
    setCurrentPage(1)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />
      case 'failed':
        return <XCircle size={16} className="text-red-500" />
      case 'in_progress':
        return <AlertCircle size={16} className="text-yellow-500" />
      default:
        return <Clock size={16} className="text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getSourceIcon = (sourceType) => {
    switch (sourceType) {
      case 'server':
        return <Server size={16} />
      case 'file':
        return <FileText size={16} />
      case 'manual':
        return <Database size={16} />
      default:
        return <FileText size={16} />
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

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '-'
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end - start
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m`
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`
    } else {
      return `${diffSeconds}s`
    }
  }

  const handleViewDetail = (log) => {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  const handleExportHistory = () => {
    // Export functionality would be implemented here
    alert('Export functionality will be implemented')
  }

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)

  const importTypes = ['all', 'master_product', 'master_formulation', 'master_tolerance_grouping', 'master_user']
  const statuses = ['all', 'completed', 'failed', 'in_progress', 'pending']
  const sources = ['all', 'file', 'server', 'manual']

  return (
    <div className="import-history-page">
      <div className="page-header">
        <div className="page-title">
          <History size={28} />
          <h1>Import History</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleExportHistory}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="statistics-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Database size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{statistics.total_imports}</div>
              <div className="stat-label">Total Imports</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon text-green-500">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{statistics.successful_imports}</div>
              <div className="stat-label">Successful</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon text-red-500">
              <XCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{statistics.failed_imports}</div>
              <div className="stat-label">Failed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon text-blue-500">
              <Database size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{statistics.total_records_imported}</div>
              <div className="stat-label">Records Imported</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search import history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="filter-select"
            >
              {importTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Status' : status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="filter-select"
            >
              {sources.map(source => (
                <option key={source} value={source}>
                  {source === 'all' ? 'All Sources' : source.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Import Logs Table */}
      <div className="import-logs-table">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Source</th>
              <th>Status</th>
              <th>Records</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map(log => (
              <tr key={log.id}>
                <td>
                  <div className="type-cell">
                    <Database size={16} />
                    <span>{log.import_type.replace('_', ' ').toUpperCase()}</span>
                  </div>
                </td>
                <td>
                  <div className="source-cell">
                    {getSourceIcon(log.source_type)}
                    <span>{log.source_name || log.source_type}</span>
                  </div>
                </td>
                <td>
                  <div className={`status-badge ${getStatusColor(log.status)}`}>
                    {getStatusIcon(log.status)}
                    <span>{log.status.toUpperCase()}</span>
                  </div>
                </td>
                <td>
                  <div className="records-cell">
                    <span className="success">{log.successful_records}</span>
                    {log.failed_records > 0 && (
                      <span className="failed">/{log.failed_records}</span>
                    )}
                    <span className="total">/{log.total_records}</span>
                  </div>
                </td>
                <td>{formatDate(log.started_at)}</td>
                <td>{formatDuration(log.started_at, log.completed_at)}</td>
                <td>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleViewDetail(log)}
                  >
                    View Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-title">
              <History size={28} />
              Import Detail - {selectedLog.import_type.replace('_', ' ').toUpperCase()}
            </div>
            
            <div className="modal-content">
              <div className="detail-grid">
                <div className="detail-section">
                  <h4>Import Information</h4>
                  <div className="detail-item">
                    <strong>Type:</strong> {selectedLog.import_type.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="detail-item">
                    <strong>Source:</strong> {selectedLog.source_type.toUpperCase()}
                  </div>
                  <div className="detail-item">
                    <strong>Source Name:</strong> {selectedLog.source_name || '-'}
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong> 
                    <span className={`status-badge ${getStatusColor(selectedLog.status)}`}>
                      {getStatusIcon(selectedLog.status)}
                      <span>{selectedLog.status.toUpperCase()}</span>
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Records Information</h4>
                  <div className="detail-item">
                    <strong>Total Records:</strong> {selectedLog.total_records}
                  </div>
                  <div className="detail-item">
                    <strong>Successful:</strong> {selectedLog.successful_records}
                  </div>
                  <div className="detail-item">
                    <strong>Failed:</strong> {selectedLog.failed_records}
                  </div>
                  <div className="detail-item">
                    <strong>Success Rate:</strong> 
                    {selectedLog.total_records > 0 
                      ? `${Math.round((selectedLog.successful_records / selectedLog.total_records) * 100)}%`
                      : '0%'
                    }
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Timing Information</h4>
                  <div className="detail-item">
                    <strong>Started:</strong> {formatDate(selectedLog.started_at)}
                  </div>
                  <div className="detail-item">
                    <strong>Completed:</strong> {formatDate(selectedLog.completed_at)}
                  </div>
                  <div className="detail-item">
                    <strong>Duration:</strong> {formatDuration(selectedLog.started_at, selectedLog.completed_at)}
                  </div>
                </div>
              </div>

              {selectedLog.error_details && (
                <div className="detail-section">
                  <h4>Error Details</h4>
                  <div className="error-details">
                    <pre>{JSON.stringify(selectedLog.error_details, null, 2)}</pre>
                  </div>
                </div>
              )}

              {selectedLog.server_config && (
                <div className="detail-section">
                  <h4>Server Configuration</h4>
                  <div className="server-config">
                    <pre>{JSON.stringify(selectedLog.server_config, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredLogs.length === 0 && (
        <div className="empty-state">
          <History size={64} className="empty-icon" />
          <div className="empty-text">No import history found</div>
          <div className="empty-subtext">
            Import history will appear here after performing imports
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportHistory
