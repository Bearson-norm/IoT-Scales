import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  Plus,
  Trash2,
  Target,
  Star,
  Save,
  X,
  Loader2,
  Info,
  AlertCircle
} from 'lucide-react'
import apiService from '../../services/api.js'
import { validateBandsNoOverlap } from '../../utils/weighingTolerance.js'

const emptyBand = () => ({
  target_qty_min: '',
  target_qty_max: '',
  tolerance_qty: '',
  sort_order: 0
})

const formatNum = (v) => {
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

const MasterWeighingToleranceTemplate = () => {
  const [templates, setTemplates] = useState([])
  const [filtered, setFiltered] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [bandsLoading, setBandsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [bands, setBands] = useState([])
  const [bandsDirty, setBandsDirty] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    code: '',
    name: '',
    description: '',
    status: 'active'
  })

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiService.getWeighingToleranceTemplates()
      const list = res.success ? res.data : []
      setTemplates(list)
      setFiltered(list)
    } catch (e) {
      setError(e.message || 'Gagal memuat template')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBands = useCallback(async (templateId) => {
    if (!templateId) {
      setBands([])
      return
    }
    setBandsLoading(true)
    try {
      const res = await apiService.getWeighingToleranceTemplateBands(templateId)
      setBands((res.data || []).map(b => ({
        target_qty_min: b.target_qty_min,
        target_qty_max: b.target_qty_max,
        tolerance_qty: b.tolerance_qty,
        sort_order: b.sort_order
      })))
      setBandsDirty(false)
    } catch (e) {
      setError(e.message || 'Gagal memuat rentang toleransi')
    } finally {
      setBandsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    if (!selectedId && templates.length) {
      setSelectedId(templates.find(t => t.is_default)?.id || templates[0].id)
    }
  }, [templates, selectedId])

  useEffect(() => {
    if (selectedId) loadBands(selectedId)
  }, [selectedId, loadBands])

  useEffect(() => {
    let list = templates
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      list = list.filter(
        t =>
          t.code?.toLowerCase().includes(q) ||
          t.name?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [searchTerm, templates])

  const selectedTemplate = templates.find(t => t.id === selectedId)

  const examplePreview = useMemo(() => {
    if (!bands.length) return null
    const b = bands[0]
    const min = parseFloat(b.target_qty_min)
    const max = parseFloat(b.target_qty_max)
    const tol = parseFloat(b.tolerance_qty)
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(tol)) return null
    const sampleTarget = min + (max - min) / 2
    const t = Math.round(sampleTarget * 1000) / 1000
    return { target: t, low: Math.max(0, t - tol), high: t + tol, tol }
  }, [bands])

  const handleAddTemplate = async () => {
    if (!newTemplate.code || !newTemplate.name) return
    try {
      await apiService.createWeighingToleranceTemplate(newTemplate)
      setShowAddModal(false)
      setNewTemplate({ code: '', name: '', description: '', status: 'active' })
      await loadTemplates()
      window.dispatchEvent(new Event('database_updated'))
    } catch (e) {
      alert(e.message || 'Gagal menambah template')
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await apiService.setDefaultWeighingToleranceTemplate(id)
      await loadTemplates()
    } catch (e) {
      alert(e.message || 'Gagal set default')
    }
  }

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Hapus template ini?')) return
    try {
      await apiService.deleteWeighingToleranceTemplate(id)
      if (selectedId === id) setSelectedId(null)
      await loadTemplates()
      window.dispatchEvent(new Event('database_updated'))
    } catch (e) {
      alert(e.message || 'Gagal menghapus')
    }
  }

  const handleBandChange = (index, field, value) => {
    setBands(prev =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    )
    setBandsDirty(true)
  }

  const addBandRow = () => {
    setBands(prev => [...prev, emptyBand()])
    setBandsDirty(true)
  }

  const removeBandRow = (index) => {
    setBands(prev => prev.filter((_, i) => i !== index))
    setBandsDirty(true)
  }

  const saveBands = async () => {
    const payload = bands.map((b, i) => ({
      target_qty_min: parseFloat(b.target_qty_min),
      target_qty_max: parseFloat(b.target_qty_max),
      tolerance_qty: parseFloat(b.tolerance_qty),
      sort_order: parseInt(b.sort_order, 10) || i + 1
    }))
    const validation = validateBandsNoOverlap(payload)
    if (!validation.valid) {
      alert(validation.error)
      return
    }
    try {
      await apiService.updateWeighingToleranceTemplateBands(selectedId, payload)
      setBandsDirty(false)
      await loadBands(selectedId)
      await loadTemplates()
      alert('Rentang toleransi disimpan')
    } catch (e) {
      alert(e.message || 'Gagal menyimpan band')
    }
  }

  return (
    <div className="master-content wtt-page">
      <div className="content-header">
        <div className="content-title">
          <Target size={24} />
          <div>
            <h2>Template Toleransi Penimbangan</h2>
            <p className="wtt-header-sub">
              Rentang target bahan (gram) → toleransi simetris ± gram saat MO
            </p>
          </div>
        </div>
        <div className="content-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Template Baru
          </button>
        </div>
      </div>

      <div className="wtt-info-banner">
        <Info size={18} />
        <div>
          <strong>Cara kerja:</strong> sistem memilih baris berdasarkan <em>target timbang</em> bahan (bukan berat live).
          Hanya template yang bertanda Default yang dipakai untuk semua bahan. Ganti template global lewat Jadikan default, lalu Simpan rentang. Rentang tidak boleh overlap.
        </div>
      </div>

      {error && (
        <div className="wtt-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadTemplates}>
            Coba lagi
          </button>
        </div>
      )}

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            className="search-input"
            placeholder="Cari kode atau nama template..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state wtt-loading">
          <Loader2 size={28} className="animate-spin" />
          <span>Memuat template...</span>
        </div>
      ) : (
        <div className="wtt-split">
          <section className="wtt-panel wtt-panel-list">
            <div className="wtt-panel-head">
              <h3>Daftar template</h3>
              <span className="wtt-count">{filtered.length} item</span>
            </div>
            <div className="table-container wtt-table-wrap">
              <table className="data-table wtt-template-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th className="wtt-col-narrow">Band</th>
                    <th>Default</th>
                    <th className="wtt-col-actions">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="wtt-empty-cell">
                        Tidak ada template. Buat template baru untuk mulai.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(t => (
                      <tr
                        key={t.id}
                        className={`wtt-template-row ${t.id === selectedId ? 'wtt-row-selected' : ''}`}
                        onClick={() => setSelectedId(t.id)}
                      >
                        <td className="tolerance-code">{t.code}</td>
                        <td className="tolerance-name">{t.name}</td>
                        <td className="wtt-col-narrow">
                          <span className="wtt-band-pill">{t.band_count ?? 0}</span>
                        </td>
                        <td>
                          {t.is_default ? (
                            <span className="wtt-default-badge">
                              <Star size={12} fill="currentColor" />
                              Default
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-link wtt-link-btn"
                              onClick={e => {
                                e.stopPropagation()
                                handleSetDefault(t.id)
                              }}
                            >
                              Jadikan default
                            </button>
                          )}
                        </td>
                        <td className="wtt-col-actions">
                          {!t.is_default && (
                            <button
                              type="button"
                              className="action-btn delete"
                              onClick={e => {
                                e.stopPropagation()
                                handleDeleteTemplate(t.id)
                              }}
                              title="Hapus template"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="wtt-panel wtt-panel-editor">
            {!selectedTemplate ? (
              <div className="wtt-empty-state">
                <Target size={40} strokeWidth={1.25} />
                <p>Pilih template di kiri untuk mengedit rentang qty.</p>
              </div>
            ) : (
              <>
                <div className="wtt-panel-head wtt-panel-head-editor">
                  <div>
                    <h3>Rentang toleransi</h3>
                    <p className="wtt-editor-meta">
                      <span className="tolerance-code">{selectedTemplate.code}</span>
                      <span className="wtt-meta-sep">·</span>
                      {selectedTemplate.name}
                      {bandsDirty && (
                        <span className="wtt-unsaved">Perubahan belum disimpan</span>
                      )}
                    </p>
                  </div>
                  <div className="wtt-editor-actions">
                    <button type="button" className="btn btn-secondary" onClick={addBandRow}>
                      <Plus size={16} />
                      Tambah baris
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!bandsDirty || bandsLoading}
                      onClick={saveBands}
                    >
                      <Save size={16} />
                      Simpan rentang
                    </button>
                  </div>
                </div>

                {examplePreview && (
                  <div className="wtt-example-hint">
                    Contoh baris pertama: target {formatNum(examplePreview.target)} g → boleh timbang{' '}
                    {formatNum(examplePreview.low)} – {formatNum(examplePreview.high)} g (±{formatNum(examplePreview.tol)} g)
                  </div>
                )}

                {bandsLoading ? (
                  <div className="loading-state wtt-loading compact">
                    <Loader2 size={22} className="animate-spin" />
                    <span>Memuat rentang...</span>
                  </div>
                ) : bands.length === 0 ? (
                  <div className="wtt-empty-state compact">
                    <p>Belum ada rentang. Klik &quot;Tambah baris&quot; lalu isi target min/max dan toleransi ±.</p>
                    <button type="button" className="btn btn-primary" onClick={addBandRow}>
                      <Plus size={16} />
                      Tambah baris pertama
                    </button>
                  </div>
                ) : (
                  <div className="table-container wtt-table-wrap wtt-band-table-wrap">
                    <table className="data-table wtt-band-table">
                      <thead>
                        <tr>
                          <th>Target min (g)</th>
                          <th>Target max (g)</th>
                          <th>Toleransi ± (g)</th>
                          <th className="wtt-col-actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {bands.map((b, idx) => {
                          const tMin = parseFloat(b.target_qty_min)
                          const tMax = parseFloat(b.target_qty_max)
                          const tol = parseFloat(b.tolerance_qty)
                          const preview =
                            Number.isFinite(tMin) &&
                            Number.isFinite(tMax) &&
                            Number.isFinite(tol) &&
                            tMax >= tMin
                              ? `${formatNum(Math.max(0, ((tMin + tMax) / 2) - tol))} – ${formatNum(((tMin + tMax) / 2) + tol)} g (target tengah)`
                              : null
                          return (
                            <tr key={idx}>
                              <td>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  className="form-input wtt-num-input"
                                  placeholder="0"
                                  value={b.target_qty_min}
                                  onChange={e => handleBandChange(idx, 'target_qty_min', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  className="form-input wtt-num-input"
                                  placeholder="999999"
                                  value={b.target_qty_max}
                                  onChange={e => handleBandChange(idx, 'target_qty_max', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  className="form-input wtt-num-input"
                                  placeholder="±"
                                  value={b.tolerance_qty}
                                  onChange={e => handleBandChange(idx, 'tolerance_qty', e.target.value)}
                                />
                                {preview && (
                                  <span className="wtt-row-hint" title="Perkiraan jika target di tengah rentang">
                                    {preview}
                                  </span>
                                )}
                              </td>
                              <td className="wtt-col-actions">
                                <button
                                  type="button"
                                  className="action-btn delete"
                                  onClick={() => removeBandRow(idx)}
                                  title="Hapus baris"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal wtt-modal">
            <div className="modal-title">Template Baru</div>
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Kode *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="TPL-CUSTOM-01"
                  value={newTemplate.code}
                  onChange={e => setNewTemplate({ ...newTemplate, code: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nama *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nama template"
                  value={newTemplate.name}
                  onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Keterangan opsional"
                  value={newTemplate.description}
                  onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddTemplate}
                disabled={!newTemplate.code.trim() || !newTemplate.name.trim()}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MasterWeighingToleranceTemplate
