import React, { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import {
  SCALING_MODE_PER_UNIT,
  computeMoScaling,
  getScalingBaseQuantity
} from '../utils/scaling'

const ingredientHasSavedProgress = (ingredient) => {
  const actualMass = parseFloat(ingredient?.actual_mass || 0) || 0
  const status = ingredient?.status || 'pending'
  return actualMass > 0 || status !== 'pending'
}

const describeExistingWorkOrder = (workOrder, ingredients) => {
  const rows = ingredients || []
  const isReactivated = workOrder.qc_reactivated_at != null
  const isRejected = workOrder.status === 'reject' && !isReactivated
  const hasProgress = rows.some(ingredientHasSavedProgress)
  const canResume = !isRejected && (workOrder.status === 'in_progress' || hasProgress)

  return {
    workOrder,
    ingredients: rows,
    isRejected,
    isReactivated,
    hasProgress,
    canResume,
    totalIngredients: rows.length,
    completedIngredients: rows.filter(ingredient => (ingredient.status || 'pending') === 'completed').length,
    inProgressIngredients: rows.filter(ingredient => {
      const status = ingredient.status || 'pending'
      const actualMass = parseFloat(ingredient.actual_mass || 0) || 0
      return status === 'weighing' || (status === 'pending' && actualMass > 0)
    }).length
  }
}

const lookupWorkOrder = async (moNumber) => {
  const data = await api.getWorkOrderByNumber(moNumber)
  if (!data?.success || !data?.data?.workOrder) return null
  return describeExistingWorkOrder(data.data.workOrder, data.data.ingredients || [])
}

const buildResumeMoData = (moNumber, found) => {
  const wo = found.workOrder
  const scalingMode = wo.scaling_mode || 'per_1000g'
  const baseQuantity = getScalingBaseQuantity(scalingMode, wo.formulation_total_mass)
  const savedQuantity = parseFloat(wo.planned_quantity || baseQuantity)
  const scalingFactor = baseQuantity > 0 ? savedQuantity / baseQuantity : 1

  return {
    moNumber,
    skuName: wo.formulation_name || 'Unknown',
    quantity: String(savedQuantity),
    plannedUnits: wo.planned_units != null ? parseFloat(wo.planned_units) : null,
    scalingMode,
    formulationId: wo.formulation_id,
    formulationCode: wo.formulation_code || 'Unknown',
    baseQuantity,
    scalingFactor,
    ingredients: found.ingredients.map(it => ({
      ingredient_id: it.ingredient_id,
      formulation_ingredient_id: it.ingredient_id,
      product_id: it.product_id,
      product_code: it.product_code || '',
      product_name: it.product_name || 'Unknown',
      target_mass: parseFloat(it.target_mass || 0) || 0,
      base_target_mass: parseFloat(it.base_target_mass || 0) || 0,
      actual_mass: parseFloat(it.actual_mass || 0) || 0,
      status: it.status || 'pending',
      progress_percentage: parseFloat(it.progress_percentage || 0) || 0,
      remaining_weight: parseFloat(it.remaining_weight || 0) || 0,
      is_within_tolerance: it.is_within_tolerance,
      tolerance_min: it.tolerance_min != null ? parseFloat(it.tolerance_min) : null,
      tolerance_max: it.tolerance_max != null ? parseFloat(it.tolerance_max) : null,
      weighing_started_at: it.weighing_started_at,
      weighing_updated_at: it.weighing_updated_at,
      weighing_completed_at: it.weighing_completed_at,
      weighing_notes: it.weighing_notes || '',
      last_session_number: it.last_session_number || null
    })),
    isResume: true
  }
}

const MOScanModal = ({ isOpen, onClose, onStartWeighing }) => {
  const [moNumber, setMoNumber] = useState('')
  const moNumberRef = useRef('')
  moNumberRef.current = moNumber
  const [skuInput, setSkuInput] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const [formulations, setFormulations] = useState([])
  const [selectedFormulation, setSelectedFormulation] = useState(null)
  const [formulationMeta, setFormulationMeta] = useState(null)
  const [error, setError] = useState('')
  const [existingWorkOrder, setExistingWorkOrder] = useState(null)
  const [checkingMO, setCheckingMO] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setError('')
    setLoading(false)
    setFormulations([])
    setSelectedFormulation(null)
    setFormulationMeta(null)
  }, [isOpen])

  const pickBestFormulation = (list, query) => {
    if (!list.length) return null
    const q = (query || '').toLowerCase()
    return (
      list.find(f => (f.formulation_name || '').toLowerCase() === q) ||
      list.find(f => (f.formulation_code || '').toLowerCase() === q) ||
      list.find(f => (f.sku || '').toLowerCase() === q) ||
      list.find(f =>
        (f.formulation_name || '').toLowerCase().includes(q) ||
        (f.formulation_code || '').toLowerCase().includes(q) ||
        (f.sku || '').toLowerCase().includes(q)
      ) ||
      list[0]
    )
  }

  useEffect(() => {
    if (!skuInput || skuInput.length < 2) {
      setFormulationMeta(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const searchResp = await api.request(`/formulations/search?q=${encodeURIComponent(skuInput)}`)
        const list = (searchResp && searchResp.data) || []
        setFormulationMeta(pickBestFormulation(list, skuInput))
      } catch {
        setFormulationMeta(null)
      }
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [skuInput])

  // Re-check whenever the modal opens or the MO number changes.
  // Closing the modal used to drop the resume result without looking the number up again.
  useEffect(() => {
    if (!isOpen) return undefined

    const moRequested = String(moNumber || '').trim()
    if (moRequested.length < 3) {
      setExistingWorkOrder(null)
      setCheckingMO(false)
      return undefined
    }

    let cancelled = false
    setCheckingMO(true)
    setExistingWorkOrder(prev => {
      const prevNumber = prev?.workOrder?.work_order_number
      if (prevNumber != null && String(prevNumber).trim() === moRequested) return prev
      return null
    })

    const timeoutId = setTimeout(async () => {
      try {
        const found = await lookupWorkOrder(moRequested)
        if (cancelled || String(moNumberRef.current).trim() !== moRequested) return
        setExistingWorkOrder(found)
      } catch (e) {
        console.warn('Error checking existing MO:', e)
        if (!cancelled && String(moNumberRef.current).trim() === moRequested) {
          setExistingWorkOrder(null)
        }
      } finally {
        if (!cancelled && String(moNumberRef.current).trim() === moRequested) {
          setCheckingMO(false)
        }
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [moNumber, isOpen])

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
      setFormulationMeta(pickBestFormulation(matched, skuInput))
    } catch (e) {
      setError('Gagal mengambil data formulasi')
    } finally {
      setLoading(false)
    }
  }

  const buildMoData = (best, ingredients, scaling, inputQty) => {
    const scaledIngredients = (ingredients || []).map(it => {
      const baseTargetMass = parseFloat(it.target_mass || it.mass || it.target || 0) || 0
      const scaledTargetMass = baseTargetMass * scaling.scalingFactor

      return {
        formulation_ingredient_id: it.id || it.ingredient_id,
        product_id: it.product_id,
        product_code: it.product_code || it.ingredient_code || it.code,
        product_name: it.product_name || it.ingredient_name || it.name,
        target_mass: scaledTargetMass,
        base_target_mass: baseTargetMass
      }
    })

    return {
      skuName: best.formulation_name || best.product_name || best.name || skuInput,
      quantity: String(scaling.plannedQuantityGrams),
      plannedUnits: scaling.plannedUnits,
      scalingMode: best.scaling_mode || 'per_1000g',
      formulationId: best.id,
      formulationCode: best.formulation_code || best.product_code || best.code || skuInput,
      baseQuantity: scaling.baseQuantity,
      scalingFactor: scaling.scalingFactor,
      ingredients: scaledIngredients,
      inputQuantity: inputQty
    }
  }

  const attachTolerancePreviews = async (moData) => {
    if (!moData?.ingredients?.length || !moData.formulationId) return moData
    try {
      const items = moData.ingredients.map(ing => ({
        key: ing.formulation_ingredient_id || ing.ingredient_id,
        productId: ing.product_id,
        targetMass: ing.target_mass
      }))
      const res = await api.resolveWeighingToleranceBatch(moData.formulationId, items)
      if (!res.success) return moData
      const byKey = {}
      ;(res.data || []).forEach(row => {
        if (row.key != null) byKey[String(row.key)] = row
      })
      return {
        ...moData,
        ingredients: moData.ingredients.map(ing => {
          const key = String(ing.formulation_ingredient_id || ing.ingredient_id || '')
          const row = byKey[key]
          if (row && !row.error) {
            return {
              ...ing,
              tolerance_min: row.tolerance_min,
              tolerance_max: row.tolerance_max
            }
          }
          return ing
        })
      }
    } catch (e) {
      console.warn('Tolerance preview failed:', e)
      return moData
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const moRequested = String(moNumber || '').trim()
    if (!moRequested) {
      setError('Nomor MO wajib diisi')
      return
    }

    setLoading(true)
    let found = null
    try {
      found = await lookupWorkOrder(moRequested)
      if (String(moNumberRef.current).trim() === moRequested) {
        setExistingWorkOrder(found)
      }
    } catch (lookupError) {
      console.warn('Error checking existing MO before start:', lookupError)
      found = null
    }

    if (found?.isRejected) {
      setError('MO ini telah ditolak (REJECT) karena melebihi toleransi. Mohon minta persetujuan QC terlebih dahulu sebelum melanjutkan proses penimbangan. Silakan hubungi QC Officer untuk melakukan approval.')
      setLoading(false)
      return
    }

    if (found?.canResume) {
      if (!found.ingredients.length) {
        setError('Work order masih berjalan, tetapi daftar bahannya kosong.')
        setLoading(false)
        return
      }
      try {
        onStartWeighing(await attachTolerancePreviews(buildResumeMoData(moRequested, found)))
      } catch (resumeError) {
        console.warn('Failed to resume work order:', resumeError)
        setError('Gagal memuat progress work order')
      } finally {
        setLoading(false)
      }
      return
    }

    setLoading(false)

    if (!moNumber || !skuInput || !quantity) {
      setError('Lengkapi semua field')
      return
    }
    try {
      setLoading(true)
      const searchResp = await api.request(`/formulations/search?q=${encodeURIComponent(skuInput)}`)
      const list = (searchResp && searchResp.data) || []
      if (!list.length) {
        setError('Formulasi tidak ditemukan dari input SKU')
        return
      }
      const best = pickBestFormulation(list, skuInput)
      const scalingMode = best.scaling_mode || 'per_1000g'
      const totalMass = parseFloat(best.total_mass) || 0
      const inputQty = parseFloat(quantity) || 0
      const scaling = computeMoScaling({
        scalingMode,
        totalMass,
        inputQuantity: inputQty
      })

      const ingredientsResp = await api.getFormulationIngredients(best.id)

      console.log(
        `📏 Scaling formula: mode=${scalingMode}, base=${scaling.baseQuantity}, ` +
        `input=${inputQty}${scalingMode === SCALING_MODE_PER_UNIT ? ' PCS' : 'g'}, ` +
        `total=${scaling.plannedQuantityGrams}g, factor=${scaling.scalingFactor}x`
      )

      const moData = {
        moNumber,
        ...buildMoData(best, (ingredientsResp && ingredientsResp.data) || ingredientsResp || [], scaling, inputQty),
        isResume: false
      }
      onStartWeighing(await attachTolerancePreviews(moData))
    } catch (e) {
      setError('Gagal mengambil bahan formulasi')
    } finally {
      setLoading(false)
    }
  }

  const isPerUnit = formulationMeta?.scaling_mode === SCALING_MODE_PER_UNIT
  const unitTotalMass = parseFloat(formulationMeta?.total_mass) || 0
  const qtyNum = parseFloat(quantity) || 0
  const previewTotalGrams = isPerUnit && qtyNum > 0 ? qtyNum * unitTotalMass : qtyNum
  const previewScaling = isPerUnit && qtyNum > 0
    ? computeMoScaling({ scalingMode: SCALING_MODE_PER_UNIT, totalMass: unitTotalMass, inputQuantity: qtyNum })
    : null

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
              type="text"
              value={moNumber}
              onChange={(e) => setMoNumber(e.target.value)}
              placeholder="Masukkan atau scan nomor MO"
              autoFocus
              autoComplete="off"
            />
          </div>
          
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
              </div>
            </div>
          )}
          
          {existingWorkOrder && existingWorkOrder.canResume && (
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
                <strong style={{ color: '#1e40af', fontSize: '14px' }}>
                  {existingWorkOrder.workOrder?.status === 'in_progress'
                    ? 'Work Order Masih Berjalan'
                    : 'Work Order Ditemukan - Resume Progress'}
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#1e40af', marginLeft: '24px' }}>
                <div>{existingWorkOrder.workOrder?.formulation_name || 'Formulasi tersimpan'} · {existingWorkOrder.workOrder?.planned_quantity || '-'} g</div>
                <div>Progress: {existingWorkOrder.completedIngredients}/{existingWorkOrder.totalIngredients} bahan selesai</div>
                <div>In Progress: {existingWorkOrder.inProgressIngredients} bahan sedang ditimbang</div>
                <div style={{ marginTop: 4 }}>SKU dan quantity di bawah tidak dipakai. Penimbangan dilanjutkan dari berat yang sudah tersimpan.</div>
              </div>
            </div>
          )}
          <div className="form-row" style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <label>Nama SKU / Product Code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                style={{ flex: 1 }}
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                placeholder="Masukkan atau scan SKU / kode produk"
                autoComplete="off"
                disabled={Boolean(existingWorkOrder?.canResume)}
              />
              <button type="button" className="btn btn-secondary" onClick={searchFormulations} disabled={!skuInput || loading || Boolean(existingWorkOrder?.canResume)}>Cari</button>
            </div>
            {isPerUnit && unitTotalMass > 0 && (
              <div style={{ fontSize: '11px', color: '#6366f1' }}>
                Mode per botol: 1 PCS = {unitTotalMass.toFixed(2)}g
              </div>
            )}
          </div>
          <div className="form-row" style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <label>
              {isPerUnit ? 'Quantity (PCS)' : 'Quantity (gram)'}
              <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal' }}>
                {isPerUnit
                  ? ` — 1 botol = ${unitTotalMass.toFixed(2)}g`
                  : ' — Formula base: 1000g'}
              </span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={Boolean(existingWorkOrder?.canResume)}
              placeholder={
                isPerUnit
                  ? 'Masukkan atau scan quantity (PCS)'
                  : 'Masukkan atau scan quantity (gram)'
              }
              autoComplete="off"
            />
            {qtyNum > 0 && (
              <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', padding: '6px 8px', backgroundColor: '#d1fae5', borderRadius: '4px' }}>
                {isPerUnit && previewScaling ? (
                  <>
                    📏 <strong>{qtyNum}</strong> PCS × {unitTotalMass.toFixed(2)}g = <strong>{previewTotalGrams.toFixed(2)}g</strong> total
                    {' '}(factor {previewScaling.scalingFactor.toFixed(2)}×)
                  </>
                ) : (
                  <>
                    📏 Scaling Factor: <strong>{(qtyNum / 1000).toFixed(2)}x</strong>
                    {qtyNum === 1000 && ' (base formula)'}
                  </>
                )}
              </div>
            )}
          </div>

          {loading && <div className="info-subtext">Memuat...</div>}
          {error && <div className="error-text" style={{ color: '#ef4444' }}>{error}</div>}

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn" onClick={onClose}>Batal</button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={
                loading ||
                checkingMO ||
                (existingWorkOrder && existingWorkOrder.isRejected && !existingWorkOrder.isReactivated)
              }
            >
              {existingWorkOrder?.canResume ? 'Lanjutkan Penimbangan' : 'Mulai Penimbangan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MOScanModal
