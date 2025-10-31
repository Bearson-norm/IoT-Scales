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

  useEffect(() => {
    if (!isOpen) return
    setError('')
    setLoading(false)
    setFormulations([])
    setSelectedFormulation(null)
  }, [isOpen])

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
      const moData = {
        moNumber,
        skuName: best.formulation_name || best.product_name || best.name || skuInput,
        quantity,
        formulationId: best.id,
        formulationCode: best.formulation_code || best.product_code || best.code || skuInput,
        ingredients: ((ingredientsResp && ingredientsResp.data) || ingredientsResp || []).map(it => ({
          formulation_ingredient_id: it.id || it.ingredient_id,
          product_code: it.product_code || it.ingredient_code || it.code,
          product_name: it.product_name || it.ingredient_name || it.name,
          target_mass: it.target_mass || it.mass || it.target || 0
        }))
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
            <label>No. MO</label>
            <input value={moNumber} onChange={e => setMoNumber(e.target.value)} placeholder="Masukkan nomor MO" />
          </div>
          <div className="form-row" style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <label>Nama SKU / Product Code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ flex: 1 }} value={skuInput} onChange={e => setSkuInput(e.target.value)} placeholder="Nama SKU atau kode" />
              <button type="button" className="btn btn-secondary" onClick={searchFormulations} disabled={!skuInput || loading}>Cari</button>
            </div>
          </div>
          <div className="form-row" style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <label>Quantity</label>
            <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Qty order" />
          </div>

          {loading && <div className="info-subtext">Memuat...</div>}
          {error && <div className="error-text" style={{ color: '#ef4444' }}>{error}</div>}

          {/* Pemilihan manual dihilangkan: sistem otomatis memilih formulasi berdasarkan input */}

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Mulai Penimbangan</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MOScanModal


