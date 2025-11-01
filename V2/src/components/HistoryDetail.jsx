import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { ArrowLeft, Printer, Clock, Package, Scale, CheckCircle, AlertCircle, Calendar } from 'lucide-react'

const HistoryDetail = ({ moNumber, onBack }) => {
  const navigate = (path) => {
    if (onBack) {
      onBack()
    } else {
      window.location.hash = path
    }
  }
  const [historyDetail, setHistoryDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true)
        const resp = await fetch(`/api/history/${encodeURIComponent(moNumber)}`)
        const data = await resp.json()
        
        if (data.success) {
          setHistoryDetail(data.data)
        } else {
          setError(data.error || 'Failed to load history detail')
        }
      } catch (e) {
        console.error('Error fetching history detail:', e)
        setError('Failed to load history detail')
      } finally {
        setLoading(false)
      }
    }
    
    if (moNumber) {
      fetchDetail()
    }
  }, [moNumber])

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

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="history-detail-page" style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  if (error || !historyDetail) {
    return (
      <div className="history-detail-page" style={{ padding: '20px' }}>
        <button 
          onClick={() => navigate('/history')}
          style={{ 
            marginBottom: '20px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ArrowLeft size={16} />
          Kembali
        </button>
        <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
          {error || 'History detail not found'}
        </div>
      </div>
    )
  }

  const { workOrder, ingredients } = historyDetail

  return (
    <div className="history-detail-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with Back and Print buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button 
          onClick={() => navigate('/history')}
          style={{ 
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} />
          Kembali
        </button>
        <button 
          onClick={handlePrint}
          style={{ 
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #3b82f6',
            backgroundColor: '#3b82f6',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .history-detail-page {
            padding: 0 !important;
          }
          .print-page-break {
            page-break-after: always;
          }
        }
      `}</style>

      {/* Work Order Header */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
              {workOrder.work_order}
            </h1>
            <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '4px' }}>
              {workOrder.formulation_name}
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>
              SKU: {workOrder.sku}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: workOrder.status === 'completed' ? '#10b981' : '#f59e0b',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              display: 'inline-block'
            }}>
              {workOrder.status === 'completed' ? 'Selesai' : workOrder.status === 'in_progress' ? 'Sedang Berjalan' : 'Pending'}
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tanggal Produksi</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} />
              {formatDate(workOrder.production_date)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Planned Quantity</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
              {parseFloat(workOrder.planned_quantity || 0).toFixed(1)} g
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Operator</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
              {workOrder.operator_name || 'Unknown'}
            </div>
          </div>
          {workOrder.end_time && (
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tanggal Selesai</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                {formatDate(workOrder.end_time)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ingredients with Sessions */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Laporan Hasil Penimbangan
        </h2>

        {ingredients.map((ingredient, idx) => (
          <div 
            key={ingredient.ingredient_id}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Ingredient Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '12px',
              borderBottom: '2px solid #f3f4f6'
            }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  {ingredient.ingredient_name}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Code: {ingredient.ingredient_code}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Target</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  {ingredient.target_mass.toFixed(1)} g
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Hasil Akhir</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#059669' }}>
                  {ingredient.current_accumulated_mass.toFixed(1)} g
                </div>
              </div>
              <div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: ingredient.current_status === 'completed' ? '#10b981' : 
                                  ingredient.current_status === 'weighing' ? '#f59e0b' : '#9ca3af',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {ingredient.current_status === 'completed' ? 'Selesai' : 
                   ingredient.current_status === 'weighing' ? 'Sedang Ditimbang' : 'Pending'}
                </div>
              </div>
            </div>

            {/* Weighing Sessions */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                Sesi Penimbangan ({ingredient.sessions.length} sesi)
              </div>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                {ingredient.sessions.map((session, sessionIdx) => (
                  <div 
                    key={session.session_id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#1f2937',
                          marginBottom: '4px'
                        }}>
                          Sesi #{session.session_number}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '4px'
                        }}>
                          <Clock size={12} />
                          {formatDate(session.session_completed_at || session.session_started_at)}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: session.status === 'completed' ? '#10b981' : '#f59e0b',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '500'
                      }}>
                        {session.status === 'completed' ? 'Selesai' : 'Ditimbang'}
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                      gap: '12px',
                      marginTop: '12px'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Berat Sesi</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                          {session.actual_mass.toFixed(1)} g
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Akumulasi</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                          {session.accumulated_mass.toFixed(1)} g
                        </div>
                      </div>
                      {session.tolerance_min > 0 && session.tolerance_max > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Toleransi</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                            {session.tolerance_min.toFixed(1)} - {session.tolerance_max.toFixed(1)} g
                          </div>
                        </div>
                      )}
                    </div>

                    {session.notes && (
                      <div style={{ 
                        marginTop: '12px',
                        padding: '8px',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        <strong>Catatan:</strong> {session.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Print Footer */}
      <div style={{ 
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '12px',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        <div>Laporan ini dicetak pada: {new Date().toLocaleString('id-ID')}</div>
        <div style={{ marginTop: '4px' }}>Work Order: {workOrder.work_order}</div>
      </div>
    </div>
  )
}

export default HistoryDetail

