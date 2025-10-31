import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Database, Filter, MoreVertical, Server, FileText, Loader2 } from 'lucide-react'
import EditFormulation from './EditFormulation'
import FormulaImportModal from '../FormulaImportModal'
import importLogger from '../../utils/importLogger.js'
import serverDatabaseConfig from '../../utils/serverDatabaseConfig.js'
import apiService from '../../services/api.js'

const MasterFormulation = () => {
  const [formulations, setFormulations] = useState([])
  const [filteredFormulations, setFilteredFormulations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedFormulation, setSelectedFormulation] = useState(null)
  const [showServerImportModal, setShowServerImportModal] = useState(false)
  const [serverConfigs, setServerConfigs] = useState([])
  const [selectedServerConfig, setSelectedServerConfig] = useState('')
  const [importProgress, setImportProgress] = useState(null)
  const [showEditPage, setShowEditPage] = useState(false)
  const [editingFormulationData, setEditingFormulationData] = useState(null)
  const [products, setProducts] = useState([])
  const [showFormulaImportModal, setShowFormulaImportModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [newFormulation, setNewFormulation] = useState({
    formulationCode: '',
    formulationName: '',
    sku: '',
    totalMass: 0,
    status: 'active'
  })

  // Mock data Formulation
  const mockFormulations = [
    {
      id: 1,
      formulationCode: 'FML001',
      formulationName: 'MIXING - ICY MINT',
      sku: 'SKU001', // Foreign key to Master Product
      totalIngredients: 3,
      status: 'active',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20',
      totalMass: 99000.0,
      ingredients: [
        { 
          productCode: 'PRD001', 
          productName: 'SALTNIC A6H1007', 
          productCategory: 'raw',
          typeTolerance: 'high',
          toleranceGrouping: 'TOL001',
          targetMass: 11880.0
        },
        { 
          productCode: 'PRD002', 
          productName: 'PROPYLENE GLYCOL (PG)', 
          productCategory: 'raw',
          typeTolerance: 'standard',
          toleranceGrouping: 'TOL002',
          targetMass: 5445.0
        },
        { 
          productCode: 'PRD003', 
          productName: 'VEGETABLE GLYCERIN (VG)', 
          productCategory: 'raw',
          typeTolerance: 'standard',
          toleranceGrouping: 'TOL002',
          targetMass: 39600.0
        }
      ]
    },
    {
      id: 2,
      formulationCode: 'FML002',
      formulationName: 'MIXING - FOOM X A',
      sku: 'SKU002',
      totalIngredients: 3,
      status: 'active',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-18',
      totalMass: 36000.0,
      ingredients: [
        { 
          productCode: 'PRD004', 
          productName: 'NICBOOSTER', 
          productCategory: 'raw',
          typeTolerance: 'high',
          toleranceGrouping: 'TOL001',
          targetMass: 90.0
        },
        { 
          productCode: 'PRD005', 
          productName: 'PROPYLENE (PG)', 
          productCategory: 'raw',
          typeTolerance: 'standard',
          toleranceGrouping: 'TOL002',
          targetMass: 702.0
        },
        { 
          productCode: 'PRD006', 
          productName: 'VEGETABLE GLYCERIN (VG)', 
          productCategory: 'raw',
          typeTolerance: 'standard',
          toleranceGrouping: 'TOL002',
          targetMass: 16200.0
        }
      ]
    },
    {
      id: 3,
      formulationCode: 'FML003',
      formulationName: 'MIXING - VANILLA CREAM',
      sku: 'SKU003',
      totalIngredients: 2,
      status: 'inactive',
      createdAt: '2024-01-05',
      updatedAt: '2024-01-12',
      totalMass: 50000.0,
      ingredients: [
        { 
          productCode: 'PRD007', 
          productName: 'VANILLA EXTRACT', 
          productCategory: 'raw',
          typeTolerance: 'high',
          toleranceGrouping: 'TOL001',
          targetMass: 500.0
        },
        { 
          productCode: 'PRD008', 
          productName: 'CREAM BASE', 
          productCategory: 'sfg',
          typeTolerance: 'low',
          toleranceGrouping: 'TOL003',
          targetMass: 49500.0
        }
      ]
    }
  ]

  // Mock data for products (should come from Master Product in real app)
  const mockProducts = [
    {
      id: 1,
      productCode: 'PRD001',
      productName: 'SALTNIC A6H1007',
      productCategory: 'raw',
      typeTolerance: 'high',
      toleranceGrouping: 'TOL001'
    },
    {
      id: 2,
      productCode: 'PRD002',
      productName: 'PROPYLENE GLYCOL (PG)',
      productCategory: 'raw',
      typeTolerance: 'standard',
      toleranceGrouping: 'TOL002'
    },
    {
      id: 3,
      productCode: 'PRD003',
      productName: 'VEGETABLE GLYCERIN (VG)',
      productCategory: 'raw',
      typeTolerance: 'standard',
      toleranceGrouping: 'TOL002'
    },
    {
      id: 4,
      productCode: 'PRD004',
      productName: 'MINT FLAVOR',
      productCategory: 'raw',
      typeTolerance: 'high',
      toleranceGrouping: 'TOL001'
    },
    {
      id: 5,
      productCode: 'PRD005',
      productName: 'CREAM BASE',
      productCategory: 'sfg',
      typeTolerance: 'low',
      toleranceGrouping: 'TOL003'
    }
  ]

  useEffect(() => {
    console.log('🔄 Component mounted, loading data...')
    loadFormulations()
    loadProducts()
    loadServerConfigurations()
  }, [])

  // Load formulations from API
  const loadFormulations = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Loading formulations from API...')
      const response = await apiService.getFormulations()
      console.log('📊 API Response:', response)
      if (response.success) {
        console.log('✅ Formulations loaded:', response.data.length, 'records')
        console.log('📋 First formulation:', response.data[0])
        
        // Load ingredients for each formulation
        const formulationsWithIngredients = await Promise.all(
          response.data.map(async (formulation) => {
            try {
              const ingredientsResponse = await apiService.getFormulationIngredients(formulation.id)
              return {
                ...formulation,
                ingredients: ingredientsResponse.success ? ingredientsResponse.data : []
              }
            } catch (err) {
              console.error(`Error loading ingredients for formulation ${formulation.id}:`, err)
              return {
                ...formulation,
                ingredients: []
              }
            }
          })
        )
        
        console.log('✅ Setting formulations state with ingredients:', formulationsWithIngredients.length, 'formulations')
        console.log('📋 Sample formulation data:', formulationsWithIngredients[0])
        setFormulations(formulationsWithIngredients)
        setFilteredFormulations(formulationsWithIngredients)
      } else {
        throw new Error(response.error || 'Failed to load formulations')
      }
    } catch (err) {
      console.error('❌ Error loading formulations:', err)
      setError(err.message)
      // Fallback to empty array if API fails
      setFormulations([])
      setFilteredFormulations([])
    } finally {
      setLoading(false)
    }
  }

  // Load products from API
  const loadProducts = async () => {
    try {
      console.log('🔄 Loading products from API...')
      const response = await apiService.getProducts()
      console.log('📊 Products API Response:', response)
      if (response.success) {
        console.log('✅ Products loaded:', response.data.length, 'products')
        console.log('📋 First product:', response.data[0])
        console.log('📋 Products sample codes:', response.data.slice(0, 5).map(p => p.product_code))
        setProducts(response.data)
      } else {
        throw new Error(response.error || 'Failed to load products')
      }
    } catch (err) {
      console.error('❌ Error loading products:', err)
      setProducts([])
    }
  }

  // Load server configurations
  const loadServerConfigurations = () => {
    const configs = serverDatabaseConfig.getActiveConfigurations()
    setServerConfigs(configs)
  }

  useEffect(() => {
    filterFormulations()
  }, [searchTerm, selectedStatus, formulations])

  const filterFormulations = () => {
    let filtered = formulations
    console.log('🔍 Filtering formulations:', formulations.length, 'total, searchTerm:', searchTerm, 'status:', selectedStatus)

    if (searchTerm) {
      filtered = filtered.filter(formulation =>
        (formulation.formulation_code && formulation.formulation_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (formulation.formulation_name && formulation.formulation_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (formulation.sku && formulation.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(formulation => formulation.status === selectedStatus)
    }

    console.log('📊 Filtered results:', filtered.length, 'formulations')
    setFilteredFormulations(filtered)
  }

  const handleAddFormulation = async () => {
    if (newFormulation.formulationCode && newFormulation.formulationName) {
      try {
        setLoading(true)
        
        // Find the product_code for the selected product ID
        const selectedProduct = products.find(product => product.id === newFormulation.sku)
        const skuCode = selectedProduct ? selectedProduct.product_code : newFormulation.sku
        console.log('🔍 Selected product for create:', selectedProduct)
        console.log('🔍 Creating formulation with SKU:', skuCode)
        
        const response = await apiService.createFormulation({
          ...newFormulation,
          sku: skuCode
        })
        if (response.success) {
          await loadFormulations() // Reload formulations from API
          setNewFormulation({
            formulationCode: '',
            formulationName: '',
            sku: '',
            totalMass: 0,
            status: 'active'
          })
          setShowAddModal(false)
        } else {
          throw new Error(response.error || 'Failed to create formulation')
        }
      } catch (err) {
        console.error('Error creating formulation:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleEditFormulation = (formulation) => {
    console.log('🔍 Opening edit page for formulation:', formulation)
    console.log('📋 Formulation ID:', formulation.id)
    console.log('📋 Formulation Code:', formulation.formulation_code)
    console.log('📋 Formulation Name:', formulation.formulation_name)
    console.log('📋 SKU:', formulation.sku, formulation.sku_code)
    console.log('📋 Full formulation object:', JSON.stringify(formulation, null, 2))
    setEditingFormulationData(formulation)
    setShowEditPage(true)
  }

  const handleViewDetail = (formulation) => {
    setSelectedFormulation(formulation)
    setShowDetailModal(true)
  }

  const handleDeleteFormulation = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus formulasi ini?')) {
      try {
        setLoading(true)
        const response = await apiService.deleteFormulation(id)
        if (response.success) {
          await loadFormulations() // Reload formulations from API
        } else {
          throw new Error(response.error || 'Failed to delete formulation')
        }
      } catch (err) {
        console.error('Error deleting formulation:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const getStatusColor = (status) => {
    if (!status) return '#e74c3c'
    return status === 'active' ? '#27ae60' : '#e74c3c'
  }

  const statuses = ['all', 'active', 'inactive']


  const handleFormulaImportClick = () => {
    setShowFormulaImportModal(true)
  }

  const handleFormulaImportComplete = (result) => {
    if (result.success) {
      // Add imported formulations to the list
      const newFormulations = result.data.formulations.map((formulation, index) => ({
        id: formulations.length + index + 1,
        formulationCode: formulation.formulationCode,
        formulationName: formulation.formulationName,
        sku: `SKU${String(formulations.length + index + 1).padStart(3, '0')}`,
        totalIngredients: formulation.ingredients.length,
        status: formulation.status,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        totalMass: formulation.totalMass,
        ingredients: formulation.ingredients.map(ingredient => ({
          productCode: ingredient.productCode,
          productName: ingredient.productName,
          productCategory: 'raw',
          typeTolerance: 'standard',
          toleranceGrouping: 'TOL001',
          targetMass: ingredient.targetMass
        }))
      }))
      
      setFormulations(prevFormulations => [...prevFormulations, ...newFormulations])
      setShowFormulaImportModal(false)
    }
  }

  const handleSaveFormulation = (updatedFormulation) => {
    setFormulations(prevFormulations => 
      prevFormulations.map(formulation => 
        formulation.id === updatedFormulation.id ? updatedFormulation : formulation
      )
    )
    setShowEditPage(false)
    setEditingFormulationData(null)
  }

  const handleCancelEdit = () => {
    setShowEditPage(false)
    setEditingFormulationData(null)
  }

  // Handle import from server database
  const handleServerImport = async () => {
    if (!selectedServerConfig) {
      alert('Please select a server configuration')
      return
    }

    try {
      // Start import logging
      const logId = await importLogger.startImport(
        'master_formulation',
        'server',
        `Server Import - ${selectedServerConfig}`,
        { server_config_id: selectedServerConfig }
      )

      if (!logId) {
        alert('Failed to start import logging')
        return
      }

      setImportProgress({ logId, status: 'in_progress', progress: 0 })

      // Simulate import process
      const importResult = await serverDatabaseConfig.importFromServer(
        selectedServerConfig,
        'master_formulation',
        'formulations'
      )

      if (importResult.success) {
        // Update progress
        await importLogger.updateImportProgress(
          logId,
          importResult.records_imported + importResult.records_failed,
          importResult.records_imported,
          importResult.records_failed
        )

        // Complete import logging
        await importLogger.completeImport(logId, true)

        setImportProgress({ logId, status: 'completed', progress: 100 })
        alert(`Import completed successfully! ${importResult.records_imported} records imported.`)
        
        // Refresh formulations list
        setFormulations([...formulations, ...generateMockFormulations(importResult.records_imported)])
      } else {
        // Complete import logging with failure
        await importLogger.completeImport(logId, false)
        setImportProgress({ logId, status: 'failed', progress: 0 })
        alert(`Import failed: ${importResult.error}`)
      }
    } catch (error) {
      console.error('Error during server import:', error)
      alert('Import failed: ' + error.message)
    } finally {
      setShowServerImportModal(false)
      setSelectedServerConfig('')
      setTimeout(() => setImportProgress(null), 3000)
    }
  }

  // Generate mock formulations for demo
  const generateMockFormulations = (count) => {
    const newFormulations = []
    for (let i = 0; i < count; i++) {
      newFormulations.push({
        id: formulations.length + i + 1,
        formulationCode: `FML${String(formulations.length + i + 1).padStart(3, '0')}`,
        formulationName: `Imported Formulation ${i + 1}`,
        sku: `SKU${String(formulations.length + i + 1).padStart(3, '0')}`,
        totalIngredients: 2,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        totalMass: 10000.0 + (i * 1000),
        ingredients: [
          {
            productCode: 'PRD001',
            productName: 'SALTNIC A6H1007',
            productCategory: 'raw',
            typeTolerance: 'high',
            toleranceGrouping: 'TOL001',
            targetMass: 1000.0 + (i * 100)
          }
        ]
      })
    }
    return newFormulations
  }

  // Show edit page if editing
  if (showEditPage && editingFormulationData) {
    return (
      <EditFormulation
        formulation={editingFormulationData}
        products={products}
        onSave={handleSaveFormulation}
        onCancel={handleCancelEdit}
      />
    )
  }

  return (
    <div className="master-content">
      <div className="content-header">
        <div className="content-title">
          <Database size={24} />
          <h2>Master Formulation</h2>
        </div>
        <div className="content-actions">
          <button className="btn btn-secondary" onClick={handleFormulaImportClick}>
            <FileText size={16} />
            Formula Import
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowServerImportModal(true)}
            disabled={serverConfigs.length === 0}
          >
            <Server size={16} />
            Server Import
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            Tambah Formulation
          </button>
        </div>
      </div>

      {/* Debug Information */}
      <div style={{background: '#f0f0f0', padding: '10px', margin: '10px 0', borderRadius: '5px'}}>
        <strong>Debug Info:</strong><br/>
        Loading: {loading ? 'Yes' : 'No'}<br/>
        Error: {error || 'None'}<br/>
        Formulations: {formulations.length}<br/>
        Filtered: {filteredFormulations.length}<br/>
        Search Term: "{searchTerm}"<br/>
        Status Filter: "{selectedStatus}"
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="loading-state">
          <Loader2 size={24} className="animate-spin" />
          <span>Loading formulations...</span>
        </div>
      )}

      {error && (
        <div className="error-state">
          <span>Error: {error}</span>
          <button onClick={loadFormulations} className="btn btn-primary">
            Retry
          </button>
        </div>
      )}

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Cari SKU, nama, atau deskripsi..."
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
                  {status === 'all' ? 'Semua Status' : status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Formulation Name</th>
              <th>Formulation Code (SKU)</th>
              <th>Total Ingredients</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {console.log('🎯 Rendering table with', filteredFormulations.length, 'formulations')}
            {console.log('🎯 First formulation data:', filteredFormulations[0])}
            {filteredFormulations.map(formulation => (
              <tr key={formulation.id}>
                <td className="formulation-name">{formulation.formulation_name || 'N/A'}</td>
                <td className="formulation-code">{formulation.formulation_code || 'N/A'}</td>
                <td className="ingredient-count">{formulation.total_ingredients || 0}</td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(formulation.status || 'active') }}
                  >
                    {formulation.status || 'active'}
                  </span>
                </td>
                <td className="action-buttons">
                  <div className="action-menu">
                    <button 
                      className="action-btn menu"
                      onClick={() => setShowActionMenu(formulation.id)}
                      title="Menu"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {showActionMenu === formulation.id && (
                      <div className="action-dropdown">
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            handleEditFormulation(formulation)
                            setShowActionMenu(null)
                          }}
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button 
                          className="dropdown-item delete"
                          onClick={() => {
                            handleDeleteFormulation(formulation.id)
                            setShowActionMenu(null)
                          }}
                        >
                          <Trash2 size={14} />
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredFormulations.length === 0 && (
        <div className="empty-state">
          <Database size={64} className="empty-icon" />
          <div className="empty-text">Tidak ada formulasi ditemukan</div>
          <div className="empty-subtext">
            {searchTerm || selectedStatus !== 'all' 
              ? 'Coba ubah filter pencarian' 
              : 'Klik "Tambah Formulation" untuk menambahkan formulasi baru'
            }
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              Tambah Formulation Baru
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Formulation Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan kode formulasi"
                  value={newFormulation.formulationCode}
                  onChange={(e) => setNewFormulation({...newFormulation, formulationCode: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Formulation Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan nama formulasi"
                  value={newFormulation.formulationName}
                  onChange={(e) => setNewFormulation({...newFormulation, formulationName: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">SKU (Foreign Key)</label>
                <select
                  className="form-input"
                  value={newFormulation.sku}
                  onChange={(e) => setNewFormulation({...newFormulation, sku: e.target.value})}
                >
                  <option value="">Pilih SKU</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.product_code} - {product.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total Mass (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    placeholder="Masukkan total massa"
                    value={newFormulation.totalMass}
                    onChange={(e) => setNewFormulation({...newFormulation, totalMass: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={newFormulation.status}
                    onChange={(e) => setNewFormulation({...newFormulation, status: e.target.value})}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowAddModal(false)
                  setNewFormulation({
                    formulationCode: '',
                    formulationName: '',
                    sku: '',
                    totalMass: 0,
                    status: 'active'
                  })
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleAddFormulation}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Tambah'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedFormulation && (
        <div className="modal-overlay">
          <div className="modal large-modal">
            <div className="modal-title">
              Detail Formulation - {selectedFormulation.formulationName}
            </div>
            
            <div className="modal-content">
              <div className="formulation-info">
                <div className="info-row">
                  <div className="info-item">
                    <label>Formulation Code:</label>
                    <span>{selectedFormulation.formulation_code}</span>
                  </div>
                  <div className="info-item">
                    <label>Formulation Name:</label>
                    <span>{selectedFormulation.formulation_name}</span>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-item">
                    <label>Total Mass:</label>
                    <span>{selectedFormulation.total_mass ? selectedFormulation.total_mass.toFixed(1) : '0.0'} g</span>
                  </div>
                  <div className="info-item">
                    <label>Total Ingredients:</label>
                    <span>{selectedFormulation.total_ingredients || 0}</span>
                  </div>
                </div>
              </div>

              <div className="ingredients-section">
                <h3>Ingredients ({selectedFormulation.ingredients ? selectedFormulation.ingredients.length : 0})</h3>
                {selectedFormulation.ingredients && selectedFormulation.ingredients.length > 0 ? (
                  <div className="table-container">
                    <table className="ingredients-table">
                      <thead>
                        <tr>
                          <th>Ingredient Name</th>
                          <th>Ingredient Code</th>
                          <th>Category</th>
                          <th>Type Tolerance</th>
                          <th>Tolerance Grouping</th>
                          <th>Target Mass (g)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFormulation.ingredients.map((ingredient, index) => (
                          <tr key={index}>
                            <td className="ingredient-name">{ingredient.ingredient_name || ingredient.product_name || 'N/A'}</td>
                            <td className="ingredient-code">{ingredient.ingredient_code || ingredient.product_code || 'N/A'}</td>
                            <td className="ingredient-category">{ingredient.category || ingredient.product_category || 'N/A'}</td>
                            <td className="ingredient-tolerance">{ingredient.type_tolerance || 'N/A'}</td>
                            <td className="ingredient-grouping">{ingredient.tolerance_grouping_name || ingredient.tolerance_grouping || 'N/A'}</td>
                            <td className="ingredient-mass">{ingredient.target_mass ? Number(ingredient.target_mass).toFixed(1) : '0.0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-ingredients">
                    <p>No ingredients found for this formulation.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedFormulation(null)
                }}
              >
                Close
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedFormulation(null)
                  handleEditFormulation(selectedFormulation)
                }}
              >
                Edit Formulation
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Server Import Modal */}
      {showServerImportModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              <Server size={28} />
              Import from Server Database
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Select Server Configuration</label>
                <select
                  className="form-input"
                  value={selectedServerConfig}
                  onChange={(e) => setSelectedServerConfig(e.target.value)}
                >
                  <option value="">Select server configuration...</option>
                  {serverConfigs.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.name} ({config.host}:{config.port})
                    </option>
                  ))}
                </select>
              </div>

              {importProgress && (
                <div className="import-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${importProgress.progress}%` }}
                    />
                  </div>
                  <div className="progress-text">
                    Status: {importProgress.status} ({importProgress.progress}%)
                  </div>
                </div>
              )}

              <div className="server-info">
                <h4>Import Information:</h4>
                <ul>
                  <li>Import Type: Master Formulation</li>
                  <li>Source: External Database</li>
                  <li>Target Table: formulations</li>
                  <li>All records will be logged in import history</li>
                </ul>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowServerImportModal(false)}
                disabled={importProgress?.status === 'in_progress'}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleServerImport}
                disabled={!selectedServerConfig || importProgress?.status === 'in_progress'}
              >
                {importProgress?.status === 'in_progress' ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formula Import Modal */}
      <FormulaImportModal
        isOpen={showFormulaImportModal}
        onClose={() => setShowFormulaImportModal(false)}
        onImportComplete={handleFormulaImportComplete}
      />
    </div>
  )
}

export default MasterFormulation
