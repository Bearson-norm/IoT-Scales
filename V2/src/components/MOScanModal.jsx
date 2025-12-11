import React, { useEffect, useState } from 'react'
import api from '../services/api'

const MOScanModal = ({ isOpen, onClose, onStartWeighing }) => {
  const [moNumber, setMoNumber] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const [formulations, setFormulations] = useState([])
  const [selectedFormulation, setSelectedFormulation] = useState(null)
  const [error, setError] = useState('')
  const [existingWorkOrder, setExistingWorkOrder] = useState(null) // Store existing work order for resume
  const [checkingMO, setCheckingMO] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setError('')
    setLoading(false)
    setFormulations([])
    setSelectedFormulation(null)
    setExistingWorkOrder(null)
  }, [isOpen])

  // Check for existing work order when MO number changes
  useEffect(() => {
    const checkExistingMO = async () => {
      if (!moNumber || moNumber.length < 3) {
        setExistingWorkOrder(null)
        return
      }

      setCheckingMO(true)
      try {
        const resp = await fetch(`/api/work-orders/${encodeURIComponent(moNumber)}`)
        const data = await resp.json()
        
        if (data && data.success && data.data && data.data.workOrder) {
          const wo = data.data.workOrder
          const ingredients = data.data.ingredients || []
          
          // Check if work order status is 'reject'
          if (wo.status === 'reject') {
            // Check if it has been reactivated by QC
            const isReactivated = wo.qc_reactivated_at !== null && wo.qc_reactivated_at !== undefined
            
            if (!isReactivated) {
              // MO is rejected and not yet reactivated by QC - block resume
              setExistingWorkOrder({
                workOrder: wo,
                ingredients: ingredients,
                isRejected: true,
                isReactivated: false,
                hasProgress: false // Set to false to prevent resume
              })
              console.log(`🚫 Found rejected work order ${moNumber} that requires QC approval`)
              return
            } else {
              // MO is rejected but has been reactivated by QC - allow resume
              console.log(`✅ Found rejected work order ${moNumber} that has been reactivated by QC`)
            }
          }
          
          // Check if there's any progress (ingredients with saved weight > 0 or status != 'pending')
          const hasProgress = ingredients.some(ing => {
            const actualMass = parseFloat(ing.actual_mass || 0) || 0
            const status = ing.status || 'pending'
            return actualMass > 0 || status !== 'pending'
          })
          
          if (hasProgress) {
            // Calculate progress summary
            const totalIngredients = ingredients.length
            const completedIngredients = ingredients.filter(ing => {
              const status = ing.status || 'pending'
              return status === 'completed'
            }).length
            const inProgressIngredients = ingredients.filter(ing => {
              const status = ing.status || 'pending'
              const actualMass = parseFloat(ing.actual_mass || 0) || 0
              return status === 'weighing' || (status === 'pending' && actualMass > 0)
            }).length
            
            setExistingWorkOrder({
              workOrder: wo,
              ingredients: ingredients,
              totalIngredients,
              completedIngredients,
              inProgressIngredients,
              hasProgress: true,
              isRejected: wo.status === 'reject',
              isReactivated: wo.qc_reactivated_at !== null && wo.qc_reactivated_at !== undefined
            })
            console.log(`📋 Found existing work order ${moNumber} with progress: ${completedIngredients}/${totalIngredients} completed, ${inProgressIngredients} in progress`)
          } else {
            setExistingWorkOrder(null)
          }
        } else {
          setExistingWorkOrder(null)
        }
      } catch (e) {
        console.warn('Error checking existing MO:', e)
        setExistingWorkOrder(null)
      } finally {
        setCheckingMO(false)
      }
    }

    // Debounce MO check
    const timeoutId = setTimeout(checkExistingMO, 500)
    return () => clearTimeout(timeoutId)
  }, [moNumber])

  const searchFormulations = async () => {
    setError('')
    setLoading(true)
    try {
      const all = await api.getFormulations()
      const list = all?.data || all || []
      const q = (skuInput || '').toLowerCase()
      const matched = list.filter(f => {
        const name = (f.product_name || f.formulation_name || f.name || '').toLowerCase()
        const code = (f.product_code || f.formulation_code || f.code || '').toLowerCase()
        const sku = (f.sku_code || f.sku || '').toLowerCase()
        return name.includes(q) || code.includes(q) || sku.includes(q)
      })
      setFormulations(matched)
    } catch (e) {
      setError('Gagal mengambil data formulasi')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Check if MO is rejected and not reactivated by QC
    if (existingWorkOrder && existingWorkOrder.isRejected && !existingWorkOrder.isReactivated) {
      setError('MO ini telah ditolak (REJECT) karena melebihi toleransi. Mohon minta persetujuan QC terlebih dahulu sebelum melanjutkan proses penimbangan. Silakan hubungi QC Officer untuk melakukan approval.')
      return
    }
    
    // If existing work order found, resume directly
    if (existingWorkOrder && existingWorkOrder.hasProgress) {
      const wo = existingWorkOrder.workOrder
      const ings = existingWorkOrder.ingredients
      
      // Resume with existing data - preserve all fields from database
      // Note: target_mass in database is already scaled, no need to scale again
      const savedQuantity = parseFloat(wo.planned_quantity || quantity || 1000)
      const baseQuantity = 1000
      const scalingFactor = savedQuantity / baseQuantity
      
      console.log(`📋 Resume with scaling: Quantity=${savedQuantity}g, Factor=${scalingFactor}x`)
      
      const moData = {
        moNumber,
        skuName: wo.formulation_name || skuInput || 'Unknown',
        quantity: String(wo.planned_quantity || quantity || '1'),
        formulationId: wo.formulation_id,
        formulationCode: wo.formulation_code || skuInput || 'Unknown',
        baseQuantity, // Store base quantity for reference
        scalingFactor, // Store scaling factor for reference
        ingredients: ings.map(it => ({
          ingredient_id: it.ingredient_id, // Primary ID from database
          formulation_ingredient_id: it.ingredient_id, // Alias for compatibility
          product_code: it.product_code || '',
          product_name: it.product_name || 'Unknown',
          target_mass: parseFloat(it.target_mass || 0) || 0,
          actual_mass: parseFloat(it.actual_mass || 0) || 0,
          status: it.status || 'pending',
          // Include all tracking fields for proper resume
          progress_percentage: parseFloat(it.progress_percentage || 0) || 0,
          remaining_weight: parseFloat(it.remaining_weight || 0) || 0,
          is_within_tolerance: it.is_within_tolerance,
          tolerance_min: parseFloat(it.tolerance_min || 0) || 0,
          tolerance_max: parseFloat(it.tolerance_max || 0) || 0,
          weighing_started_at: it.weighing_started_at,
          weighing_updated_at: it.weighing_updated_at,
          weighing_completed_at: it.weighing_completed_at,
          weighing_notes: it.weighing_notes || ''
        })),
        isResume: true // Flag to indicate this is a resume
      }
      
      console.log('📋 Resume MO data prepared:', {
        moNumber,
        formulationId: moData.formulationId,
        ingredientCount: moData.ingredients.length,
        ingredients: moData.ingredients.map(ing => ({
          id: ing.ingredient_id,
          name: ing.product_name,
          savedWeight: ing.actual_mass,
          status: ing.status
        }))
      })
      onStartWeighing(moData)
      return
    }
    
    // New work order flow
    if (!moNumber || !skuInput || !quantity) {
      setError('Lengkapi semua field')
      return
    }
    try {
      setLoading(true)
      // Cari formulasi berdasarkan input SKU/Name/Code
      const searchResp = await api.request(`/formulations/search?q=${encodeURIComponent(skuInput)}`)
      const list = (searchResp && searchResp.data) || []
      if (!list.length) {
        setError('Formulasi tidak ditemukan dari input SKU')
        return
      }
      const q = (skuInput || '').toLowerCase()
      const best =
        list.find(f => (f.formulation_name || '').toLowerCase() === q) ||
        list.find(f => (f.formulation_code || '').toLowerCase() === q) ||
        list.find(f => (f.sku || '').toLowerCase() === q) ||
        list.find(f => (f.formulation_name || '').toLowerCase().includes(q) || (f.formulation_code || '').toLowerCase().includes(q) || (f.sku || '').toLowerCase().includes(q)) ||
        list[0]

      const ingredientsResp = await api.getFormulationIngredients(best.id)
      
      // Calculate scaling factor based on quantity
      // Formula in database is for 1000g base, so scale proportionally
      const baseQuantity = 1000 // gram (base formula)
      const targetQuantity = parseFloat(quantity) || 1000
      const scalingFactor = targetQuantity / baseQuantity
      
      console.log(`📏 Scaling formula: Base=${baseQuantity}g, Target=${targetQuantity}g, Factor=${scalingFactor}x`)
      
      const moData = {
        moNumber,
        skuName: best.formulation_name || best.product_name || best.name || skuInput,
        quantity,
        formulationId: best.id,
        formulationCode: best.formulation_code || best.product_code || best.code || skuInput,
        baseQuantity, // Store base quantity for reference
        scalingFactor, // Store scaling factor for reference
        ingredients: ((ingredientsResp && ingredientsResp.data) || ingredientsResp || []).map(it => {
          const baseTargetMass = it.target_mass || it.mass || it.target || 0
          const scaledTargetMass = baseTargetMass * scalingFactor
          
          console.log(`  📦 ${it.product_name || it.ingredient_name || it.name}: ${baseTargetMass}g × ${scalingFactor} = ${scaledTargetMass.toFixed(2)}g`)
          
          return {
            formulation_ingredient_id: it.id || it.ingredient_id,
            product_code: it.product_code || it.ingredient_code || it.code,
            product_name: it.product_name || it.ingredient_name || it.name,
            target_mass: scaledTargetMass, // Use scaled target mass
            base_target_mass: baseTargetMass // Keep original for reference
          }
        }),
        isResume: false
      }
      onStartWeighing(moData)
    } catch (e) {
      setError('Gagal mengambil bahan formulasi')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal-content" style={{ width: 520, maxWidth: '95vw', background: '#fff', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
        <div className="modal-header">
          <div className="modal-title">Scan MO</div>
          <button className="modal-close" onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: 16 }}>
          <div className="form-row" style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <label>No. MO {checkingMO && <span style={{ fontSize: '11px', color: '#9ca3af' }}>(Checking...)</span>}</label>
            <input 
              value={moNumber} 
              onChange={e => setMoNumber(e.target.value)} 
              placeholder="Masukkan nomor MO" 
              autoFocus
            />
          </div>
          
          {/* Show rejected MO warning if found */}
          {existingWorkOrder && existingWorkOrder.isRejected && !existingWorkOrder.isReactivated && (
            <div style={{ 
              padding: '12px', 
              marginBottom: '12px', 
              backgroundColor: '#fef2f2', 
              border: '1px solid #dc2626',
              borderRadius: '8px',
              borderLeft: '4px solid #dc2626'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>🚫</span>
                <strong style={{ color: '#991b1b', fontSize: '14px' }}>MO Ditolak (REJECT) - Persetujuan QC Diperlukan</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#991b1b', marginLeft: '24px' }}>
                <div style={{ marginBottom: '6px' }}>
                  MO ini telah ditolak karena melebihi toleransi penimbangan.
                </div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  ⚠️ Tidak dapat melanjutkan tanpa persetujuan QC Officer.
                </div>
                <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '8px', padding: '6px', backgroundColor: '#fee2e2', borderRadius: '4px' }}>
                  Silakan hubungi QC Officer untuk melakukan approval dan reactivate MO ini terlebih dahulu.
                </div>
              </div>
            </div>
          )}
          
          {/* Show existing work order info if found */}
          {existingWorkOrder && existingWorkOrder.hasProgress && (
            <div style={{ 
              padding: '12px', 
              marginBottom: '12px', 
              backgroundColor: '#eff6ff', 
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              borderLeft: '4px solid #3b82f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>📋</span>
                <strong style={{ color: '#1e40af', fontSize: '14px' }}>Work Order Ditemukan - Resume Progress</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#1e40af', marginLeft: '24px' }}>
                <div>Progress: {existingWorkOrder.completedIngredients}/{existingWorkOrder.totalIngredients} bahan selesai</div>
                <div>In Progress: {existingWorkOrder.inProgressIngredients} bahan sedang ditimbang</div>
                {existingWorkOrder.isReactivated && (
                  <div style={{ marginTop: '6px', padding: '4px 8px', backgroundColor: '#dcfce7', borderRadius: '4px', color: '#166534', fontSize: '11px', fontWeight: '600' }}>
                    ✅ Telah di-approve oleh QC Officer
                  </div>
                )}
                <div style={{ marginTop: '6px', fontWeight: '600' }}>
                  Klik "Mulai Penimbangan" untuk melanjutkan dari progress sebelumnya
                </div>
              </div>
            </div>
          )}
          <div className="form-row" style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <label>Nama SKU / Product Code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ flex: 1 }} value={skuInput} onChange={e => setSkuInput(e.target.value)} placeholder="Nama SKU atau kode" />
              <button type="button" className="btn btn-secondary" onClick={searchFormulations} disabled={!skuInput || loading}>Cari</button>
            </div>
          </div>
          <div className="form-row" style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <label>Quantity (gram) <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal' }}>- Formula base: 1000g</span></label>
            <input 
              type="number" 
              step="0.01" 
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              placeholder="Contoh: 2000 untuk 2x lipat" 
            />
            {quantity && parseFloat(quantity) > 0 && (
              <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', padding: '6px 8px', backgroundColor: '#d1fae5', borderRadius: '4px' }}>
                📏 Scaling Factor: <strong>{(parseFloat(quantity) / 1000).toFixed(2)}x</strong> 
                {parseFloat(quantity) === 1000 && ' (base formula)'}
                {parseFloat(quantity) === 2000 && ' (2x lipat)'}
                {parseFloat(quantity) === 500 && ' (½ lipat)'}
              </div>
            )}
          </div>

          {loading && <div className="info-subtext">Memuat...</div>}
          {error && <div className="error-text" style={{ color: '#ef4444' }}>{error}</div>}

          {/* Pemilihan manual dihilangkan: sistem otomatis memilih formulasi berdasarkan input */}

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn" onClick={onClose}>Batal</button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || (existingWorkOrder && existingWorkOrder.isRejected && !existingWorkOrder.isReactivated)}
            >
              Mulai Penimbangan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MOScanModal


