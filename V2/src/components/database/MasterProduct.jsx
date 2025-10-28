import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Package, Filter, Server, FileText, Loader2 } from 'lucide-react'
import FormulaImportModal from '../FormulaImportModal'
import importLogger from '../../utils/importLogger.js'
import serverDatabaseConfig from '../../utils/serverDatabaseConfig.js'
import apiService from '../../services/api.js'

const MasterProduct = () => {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showServerImportModal, setShowServerImportModal] = useState(false)
  const [serverConfigs, setServerConfigs] = useState([])
  const [selectedServerConfig, setSelectedServerConfig] = useState('')
  const [importProgress, setImportProgress] = useState(null)
  const [showFormulaImportModal, setShowFormulaImportModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toleranceGroupings, setToleranceGroupings] = useState([])
  const [newProduct, setNewProduct] = useState({
    productCode: '',
    productName: '',
    productCategory: 'sfg',
    typeTolerance: 'high',
    toleranceGroupingId: '',
    status: 'active'
  })

  // Mock data Product (SKU/Finished Products)
  const mockProducts = [
    {
      id: 1,
      productCode: 'MIXING - FROOZY BANANA BLISS',
      productName: 'MIXING - FROOZY BANANA BLISS',
      productCategory: 'sfg',
      typeTolerance: 'high',
      toleranceGrouping: 'TOL001',
      status: 'active',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20'
    },
    {
      id: 2,
      productCode: 'MIXING - FROOZY GRAPE JUBILEE',
      productName: 'MIXING - FROOZY GRAPE JUBILEE',
      productCategory: 'sfg',
      typeTolerance: 'high',
      toleranceGrouping: 'TOL001',
      status: 'active',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-18'
    },
    {
      id: 3,
      productCode: 'MIXING - APPLE BURST',
      productName: 'MIXING - APPLE BURST',
      productCategory: 'sfg',
      typeTolerance: 'high',
      toleranceGrouping: 'TOL001',
      status: 'active',
      createdAt: '2024-01-05',
      updatedAt: '2024-01-12'
    },
    {
      id: 4,
      productCode: 'MIXING - BANANA CREAM',
      productName: 'MIXING - BANANA CREAM',
      productCategory: 'sfg',
      typeTolerance: 'high',
      toleranceGrouping: 'TOL001',
      status: 'active',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-15'
    },
    {
      id: 5,
      productCode: 'MIXING - VANILLA CREAM',
      productName: 'MIXING - VANILLA CREAM',
      productCategory: 'sfg',
      typeTolerance: 'high',
      toleranceGrouping: 'TOL001',
      status: 'active',
      createdAt: '2024-01-12',
      updatedAt: '2024-01-18'
    }
  ]

  useEffect(() => {
    loadProducts()
    loadToleranceGroupings()
    loadServerConfigurations()
  }, [])

  // Load products from API
  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.getProducts()
      if (response.success) {
        setProducts(response.data)
        setFilteredProducts(response.data)
      } else {
        throw new Error(response.error || 'Failed to load products')
      }
    } catch (err) {
      console.error('Error loading products:', err)
      setError(err.message)
      // Fallback to empty array if API fails
      setProducts([])
      setFilteredProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Load tolerance groupings from API
  const loadToleranceGroupings = async () => {
    try {
      const response = await apiService.getToleranceGroupings()
      if (response.success) {
        setToleranceGroupings(response.data)
      }
    } catch (err) {
      console.error('Error loading tolerance groupings:', err)
    }
  }

  // Load server configurations
  const loadServerConfigurations = () => {
    const configs = serverDatabaseConfig.getActiveConfigurations()
    setServerConfigs(configs)
  }

  useEffect(() => {
    filterProducts()
  }, [searchTerm, selectedCategory, products])

  const filterProducts = () => {
    let filtered = products

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.tolerance_grouping_name && product.tolerance_grouping_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.tolerance_grouping_code && product.tolerance_grouping_code.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.product_category === selectedCategory)
    }

    setFilteredProducts(filtered)
  }

  const handleAddProduct = async () => {
    if (newProduct.productCode && newProduct.productName) {
      try {
        setLoading(true)
        const response = await apiService.createProduct(newProduct)
        if (response.success) {
          await loadProducts() // Reload products from API
          setNewProduct({
            productCode: '',
            productName: '',
            productCategory: 'sfg',
            typeTolerance: 'high',
            toleranceGroupingId: '',
            status: 'active'
          })
          setShowAddModal(false)
        } else {
          throw new Error(response.error || 'Failed to create product')
        }
      } catch (err) {
        console.error('Error creating product:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setNewProduct({
      productCode: product.product_code,
      productName: product.product_name,
      productCategory: product.product_category,
      typeTolerance: product.type_tolerance,
      toleranceGroupingId: product.tolerance_grouping_id,
      status: product.status
    })
    setShowAddModal(true)
  }

  const handleUpdateProduct = async () => {
    if (editingProduct && newProduct.productCode && newProduct.productName) {
      try {
        setLoading(true)
        const response = await apiService.updateProduct(editingProduct.id, newProduct)
        if (response.success) {
          await loadProducts() // Reload products from API
          setEditingProduct(null)
          setNewProduct({
            productCode: '',
            productName: '',
            productCategory: 'sfg',
            typeTolerance: 'high',
            toleranceGroupingId: '',
            status: 'active'
          })
          setShowAddModal(false)
        } else {
          throw new Error(response.error || 'Failed to update product')
        }
      } catch (err) {
        console.error('Error updating product:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        setLoading(true)
        const response = await apiService.deleteProduct(id)
        if (response.success) {
          await loadProducts() // Reload products from API
        } else {
          throw new Error(response.error || 'Failed to delete product')
        }
      } catch (err) {
        console.error('Error deleting product:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const getStatusColor = (status) => {
    return status === 'active' ? '#27ae60' : '#e74c3c'
  }

  const categories = ['all', 'sfg', 'raw']


  const handleFormulaImportClick = () => {
    setShowFormulaImportModal(true)
  }

  const handleFormulaImportComplete = (result) => {
    if (result.success) {
      // Add imported products to the list
      const newProducts = result.data.products.map((product, index) => ({
        id: products.length + index + 1,
        productCode: product.productCode,
        productName: product.productName,
        productCategory: product.category || 'raw',
        typeTolerance: 'standard',
        toleranceGrouping: 'TOL001',
        status: product.status || 'active',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      }))
      
      setProducts(prevProducts => [...prevProducts, ...newProducts])
      setShowFormulaImportModal(false)
    }
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
        'master_product',
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
        'master_product',
        'products'
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
        
        // Refresh products list
        setProducts([...products, ...generateMockProducts(importResult.records_imported)])
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

  // Generate mock products for demo
  const generateMockProducts = (count) => {
    const newProducts = []
    for (let i = 0; i < count; i++) {
      newProducts.push({
        id: products.length + i + 1,
        productCode: `PRD${String(products.length + i + 1).padStart(3, '0')}`,
        productName: `Imported Product ${i + 1}`,
        productCategory: 'raw',
        typeTolerance: 'standard',
        toleranceGrouping: 'TOL002',
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      })
    }
    return newProducts
  }

  return (
    <div className="master-content">
      <div className="content-header">
        <div className="content-title">
          <Package size={24} />
          <h2>Master Product</h2>
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
            Tambah Product
          </button>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="loading-state">
          <Loader2 size={24} className="animate-spin" />
          <span>Loading products...</span>
        </div>
      )}

      {error && (
        <div className="error-state">
          <span>Error: {error}</span>
          <button onClick={loadProducts} className="btn btn-primary">
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'Semua Kategori' : category}
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
              <th>Product Code</th>
              <th>Product Name</th>
              <th>Product Category</th>
              <th>Type Tolerance</th>
              <th>Tolerance Grouping</th>
              <th>Status</th>
              <th>Tanggal Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id}>
                <td className="product-code">{product.product_code}</td>
                <td className="product-name">{product.product_name}</td>
                <td className="product-category">
                  {product.product_category === 'sfg' ? 'SKU/Finished' : product.product_category}
                </td>
                <td className="type-tolerance">{product.type_tolerance}</td>
                <td className="tolerance-grouping">{product.tolerance_grouping_name || product.tolerance_grouping_code || 'N/A'}</td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(product.status) }}
                  >
                    {product.status}
                  </span>
                </td>
                <td className="product-date">{product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}</td>
                <td className="action-buttons">
                  <button 
                    className="action-btn edit"
                    onClick={() => handleEditProduct(product)}
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDeleteProduct(product.id)}
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && (
        <div className="empty-state">
          <Package size={64} className="empty-icon" />
          <div className="empty-text">Tidak ada produk ditemukan</div>
          <div className="empty-subtext">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Coba ubah filter pencarian' 
              : 'Klik "Tambah Product" untuk menambahkan produk baru'
            }
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              {editingProduct ? 'Edit Product' : 'Tambah Product Baru'}
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Product Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan kode produk"
                  value={newProduct.productCode}
                  onChange={(e) => setNewProduct({...newProduct, productCode: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan nama produk"
                  value={newProduct.productName}
                  onChange={(e) => setNewProduct({...newProduct, productName: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Category</label>
                <select
                  className="form-input"
                  value={newProduct.productCategory}
                  onChange={(e) => setNewProduct({...newProduct, productCategory: e.target.value})}
                >
                  <option value="sfg">SKU/Finished Product</option>
                  <option value="raw">Raw Material</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type Tolerance</label>
                  <select
                    className="form-input"
                    value={newProduct.typeTolerance}
                    onChange={(e) => setNewProduct({...newProduct, typeTolerance: e.target.value})}
                  >
                    <option value="high">High</option>
                    <option value="standard">Standard</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tolerance Grouping</label>
                  <select
                    className="form-input"
                    value={newProduct.toleranceGroupingId}
                    onChange={(e) => setNewProduct({...newProduct, toleranceGroupingId: e.target.value})}
                  >
                    <option value="">Pilih Tolerance Grouping</option>
                    {toleranceGroupings.map(tg => (
                      <option key={tg.id} value={tg.id}>
                        {tg.name} ({tg.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={newProduct.status}
                  onChange={(e) => setNewProduct({...newProduct, status: e.target.value})}
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Aktif</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowAddModal(false)
                  setEditingProduct(null)
                  setNewProduct({
                    productCode: '',
                    productName: '',
                    productCategory: 'sfg',
                    typeTolerance: 'high',
                    toleranceGroupingId: '',
                    status: 'active'
                  })
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {editingProduct ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingProduct ? 'Update' : 'Tambah'
                )}
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
                  <li>Import Type: Master Product</li>
                  <li>Source: External Database</li>
                  <li>Target Table: products</li>
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

export default MasterProduct
