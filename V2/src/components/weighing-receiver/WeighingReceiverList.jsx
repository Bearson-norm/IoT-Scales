import React, { useState, useEffect } from 'react'
import { Search, FileText, Calendar, Package, Clock, ArrowRight } from 'lucide-react'

const WeighingReceiverList = ({ onNavigateToDetail }) => {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterData()
  }, [searchTerm, data])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/weighing-receiver/list')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setFilteredData(result.data)
      } else {
        console.error('Failed to fetch data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterData = () => {
    if (!searchTerm.trim()) {
      setFilteredData(data)
      return
    }

    const searchLower = searchTerm.toLowerCase()
    const filtered = data.filter(item => {
      const workOrder = item.workOrder?.work_order || ''
      const sku = item.workOrder?.sku || ''
      const formulaName = item.workOrder?.formulation_name || ''
      return workOrder.toLowerCase().includes(searchLower) ||
             sku.toLowerCase().includes(searchLower) ||
             formulaName.toLowerCase().includes(searchLower)
    })
    
    setFilteredData(filtered)
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981'
      case 'in_progress':
        return '#f59e0b'
      case 'reject':
        return '#c0392b'
      case 'cancelled':
        return '#e74c3c'
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
      case 'reject':
        return 'Ditolak'
      case 'cancelled':
        return 'Dibatalkan'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Memuat data...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        marginBottom: '24px',
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
          Data Penimbangan Diterima
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Daftar data penimbangan yang telah dikirim dari sistem IoT Scales
        </p>
      </div>

      {/* Search Box */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '8px 16px'
        }}>
          <Search size={20} style={{ color: '#9ca3af', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Cari berdasarkan Work Order, SKU, atau Formula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: '#1f2937'
            }}
          />
        </div>
      </div>

      {/* Data List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredData.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px'
          }}>
            <FileText size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>
              {searchTerm ? 'Tidak ada data yang sesuai dengan pencarian' : 'Belum ada data penimbangan yang diterima'}
            </div>
            {!searchTerm && (
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                Data akan muncul setelah dikirim dari halaman History
              </div>
            )}
          </div>
        ) : (
          filteredData.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (onNavigateToDetail) {
                  onNavigateToDetail(item.id)
                }
              }}
              style={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      margin: 0
                    }}>
                      {item.workOrder?.work_order || 'Unknown'}
                    </h2>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      backgroundColor: getStatusColor(item.workOrder?.status || 'pending'),
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {getStatusText(item.workOrder?.status || 'pending')}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={16} style={{ color: '#6b7280' }} />
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Formula</div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                          {item.workOrder?.formulation_name || '-'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>SKU</div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                          {item.workOrder?.sku || '-'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={16} style={{ color: '#6b7280' }} />
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Tanggal Produksi</div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                          {formatDate(item.workOrder?.production_date)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} style={{ color: '#6b7280' }} />
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Diterima</div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                          {formatDate(item.receivedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {item.workOrder?.operator_name && (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      Operator: {item.workOrder.operator_name}
                    </div>
                  )}
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#3b82f6',
                  marginLeft: '16px'
                }}>
                  <ArrowRight size={20} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default WeighingReceiverList
