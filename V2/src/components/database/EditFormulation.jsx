import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Save, Trash2, Plus, Edit, Loader2, AlertCircle, CheckCircle, MoreVertical } from 'lucide-react'
import apiService from '../../services/api.js'

const EditFormulation = ({ formulation, products, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    formulationCode: '',
    formulationName: '',
    sku: '',
    totalMass: 0,
    status: 'active'
  })
  const [ingredients, setIngredients] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showAddIngredient, setShowAddIngredient] = useState(false)
  const [newIngredient, setNewIngredient] = useState({
    productId: '',
    targetMass: 0
  })

  const loadIngredients = useCallback(async () => {
    console.log('🔍 loadIngredients called with formulation:', formulation)
    console.log('🔍 Formulation ID:', formulation?.id)
    
    if (!formulation?.id) {
      console.log('⚠️ No formulation ID available:', formulation)
      setDataLoading(false)
      return
    }
    
    try {
      setLoading(true)
      console.log('🔄 Loading ingredients for formulation ID:', formulation.id)
      
      const response = await apiService.getFormulationIngredients(formulation.id)
      
      console.log('📦 Raw API response:', response)
      console.log('📦 API response type:', typeof response)
      console.log('📦 API response keys:', Object.keys(response || {}))
      
      // Check if response has data directly
      const ingredientsData = response?.data || response || []
      
      console.log('📦 Extracted ingredients data:', ingredientsData)
      console.log('📦 Ingredients data type:', typeof ingredientsData)
      console.log('📦 Ingredients data length:', ingredientsData?.length)
      console.log('📦 Is array?', Array.isArray(ingredientsData))
      
      if (Array.isArray(ingredientsData) && ingredientsData.length > 0) {
        console.log('✅ Ingredients loaded:', ingredientsData.length, 'ingredients')
        console.log('📋 First ingredient:', ingredientsData[0])
        console.log('📋 All ingredients data:', JSON.stringify(ingredientsData, null, 2))
        
        // Update state with ingredients
        console.log('🔄 Setting ingredients state...')
        setIngredients(ingredientsData)
        console.log('✅ Ingredients state updated')
      } else {
        console.log('⚠️ No ingredients found or empty array')
        console.log('⚠️ Raw response data:', ingredientsData)
        console.log('⚠️ Response type:', typeof ingredientsData)
        console.log('⚠️ Is array?', Array.isArray(ingredientsData))
        setIngredients([])
      }
    } catch (err) {
      console.error('❌ Error loading ingredients:', err)
      setError(err.message)
      setIngredients([])
    } finally {
      setLoading(false)
    }
  }, [formulation])

  useEffect(() => {
    console.log('🎯 useEffect triggered')
    console.log('🎯 Has formulation:', !!formulation)
    console.log('🎯 Formulation data:', formulation)
    console.log('🎯 Products count:', products.length)
    
    if (formulation) {
      console.log('🔍 Loading formulation data:', formulation)
      console.log('📦 Available products:', products.length)
      console.log('🔑 SKU from formulation:', formulation.sku, formulation.sku_code)
      
      // Get SKU code (API returns it as sku_code alias)
      const skuCode = formulation.sku_code || formulation.sku
      console.log('🔑 Using SKU code:', skuCode)
      
      // Find the product ID by matching SKU code
      const product = products.find(p => p.product_code === skuCode)
      const skuId = product ? product.id : ''
      
      console.log('🔍 Product found:', product)
      console.log('🔍 Using SKU ID:', skuId)
      
      const newFormData = {
        formulationCode: formulation.formulation_code || '',
        formulationName: formulation.formulation_name || '',
        sku: skuId,
        totalMass: formulation.total_mass || 0,
        status: formulation.status || 'active'
      }
      
      console.log('📝 Setting form data:', newFormData)
      
      setFormData(newFormData)
      
      setDataLoading(false) // Form data is loaded
      
      // Load ingredients for this formulation
      console.log('🔄 About to call loadIngredients...')
      loadIngredients()
    }
  }, [formulation, products, loadIngredients])

  // Listen for database_updated event to refresh ingredients after import
  useEffect(() => {
    const handleDatabaseUpdate = () => {
      if (formulation?.id) {
        console.log('🔄 Database updated event received, refreshing ingredients for formulation:', formulation.id)
        loadIngredients()
      }
    }

    window.addEventListener('database_updated', handleDatabaseUpdate)
    return () => window.removeEventListener('database_updated', handleDatabaseUpdate)
  }, [formulation, loadIngredients])

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      
      console.log('💾 Saving formulation:', formData)
      
      // Find the product_code for the selected product ID
      const selectedProduct = products.find(product => product.id === formData.sku)
      const skuCode = selectedProduct ? selectedProduct.product_code : formData.sku
      
      const response = await apiService.updateFormulation(formulation.id, {
        formulationCode: formData.formulationCode,
        formulationName: formData.formulationName,
        sku: skuCode,
        totalMass: formData.totalMass,
        status: formData.status
      })
      
      if (response.success) {
        setSuccess('Formulation updated successfully!')
        setTimeout(() => {
          onSave(response.data)
        }, 1500)
      } else {
        throw new Error(response.error || 'Failed to update formulation')
      }
    } catch (err) {
      console.error('❌ Error saving formulation:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddIngredient = async () => {
    if (!newIngredient.productId || newIngredient.targetMass <= 0) {
      setError('Please select a product and enter a valid target mass')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Here you would add the ingredient to the formulation
      // For now, we'll just add it to the local state
      const selectedProduct = products.find(p => p.id === newIngredient.productId)
      const newIngredientData = {
        id: Date.now(), // Temporary ID
        ingredient_code: selectedProduct.product_code,
        ingredient_name: selectedProduct.product_name,
        target_mass: newIngredient.targetMass,
        category: selectedProduct.product_category,
        type_tolerance: selectedProduct.type_tolerance
      }
      
      setIngredients([...ingredients, newIngredientData])
      setNewIngredient({ productId: '', targetMass: 0 })
      setShowAddIngredient(false)
      setSuccess('Ingredient added successfully!')
    } catch (err) {
      console.error('❌ Error adding ingredient:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveIngredient = (ingredientId) => {
    if (window.confirm('Are you sure you want to remove this ingredient?')) {
      setIngredients(ingredients.filter(ing => ing.id !== ingredientId))
      setSuccess('Ingredient removed successfully!')
    }
  }

  console.log('🎬 Component render - formulation:', formulation)
  console.log('🎬 Component render - dataLoading:', dataLoading)
  console.log('🎬 Component render - formData:', formData)
  console.log('🎬 Component render - ingredients count:', ingredients.length)
  console.log('🎬 Component render - ingredients data:', ingredients)
  
  if (!formulation) {
    console.log('⚠️ No formulation provided to EditFormulation component')
    return (
      <div className="edit-formulation-page">
        <div className="error-state">
          <AlertCircle size={48} />
          <h3>No formulation selected</h3>
          <p>Please select a formulation to edit.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="edit-formulation-page">
      {/* Header */}
      <div className="page-header">
        <button 
          className="btn btn-secondary"
          onClick={onCancel}
        >
          <ArrowLeft size={16} />
          Back to Formulation List
        </button>
        <div className="header-title">
          <h1>Edit Formulation</h1>
          <p>Edit formulation details and manage ingredients</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success">
          <CheckCircle size={16} />
          {success}
        </div>
      )}
      
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {dataLoading ? (
        <div className="loading-state">
          <Loader2 size={48} className="animate-spin" />
          <p>Loading formulation data...</p>
        </div>
      ) : (
        <div className="formulation-content">
        {/* Formulation Details */}
        <div className="formulation-details-card">
          <h2>Formulation Details</h2>
          
          {/* Read-only formulation info */}
          <div style={{background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
            <div className="info-grid">
              <div className="info-item">
                <label>Formulation Code (SKU):</label>
                <span>{formData.formulationCode || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Formulation Name:</label>
                <span>{formData.formulationName || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Total Mass:</label>
                <span>{formData.totalMass || 0} g</span>
              </div>
              <div className="info-item">
                <label>Total Ingredients:</label>
                <span>{ingredients.length}</span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span className="status-badge" style={{
                  backgroundColor: formData.status === 'active' ? '#27ae60' : '#e74c3c',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  {formData.status || 'active'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Editable fields */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Formulation Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.formulationCode}
                onChange={(e) => setFormData({...formData, formulationCode: e.target.value})}
                placeholder="Enter formulation code"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Formulation Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.formulationName}
                onChange={(e) => setFormData({...formData, formulationName: e.target.value})}
                placeholder="Enter formulation name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">SKU *</label>
              <select
                className="form-input"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
              >
                <option value="">Select SKU</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.product_code} - {product.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Total Mass (g)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={formData.totalMass}
                onChange={(e) => setFormData({...formData, totalMass: parseFloat(e.target.value) || 0})}
                placeholder="Enter total mass"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button 
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading || !formData.formulationCode || !formData.formulationName}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ingredients Section */}
        <div className="ingredients-card">
          <div className="ingredients-header">
            <h2>Ingredients ({ingredients.length})</h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddIngredient(true)}
            >
              <Plus size={16} />
              Add Ingredient
            </button>
          </div>

          {loading && ingredients.length === 0 ? (
            <div className="loading-state">
              <Loader2 size={32} className="animate-spin" />
              <p>Loading ingredients...</p>
            </div>
          ) : ingredients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No ingredients added yet</h3>
              <p>Click "Add Ingredient" to get started</p>
            </div>
          ) : (
            <div className="ingredients-table-container">
              <table className="ingredients-table">
                <thead>
                  <tr>
                    <th>Product Name (Ingredient Name)</th>
                    <th>Product Code (Ingredient Code)</th>
                    <th>Category</th>
                    <th>Type Tolerance</th>
                    <th>Tolerance Grouping</th>
                    <th>Target Mass (g)</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient, index) => (
                    <tr key={ingredient.id || index}>
                      <td className="ingredient-name">{ingredient.ingredient_name || 'N/A'}</td>
                      <td className="ingredient-code">{ingredient.ingredient_code || 'N/A'}</td>
                      <td className="ingredient-category">{ingredient.category || 'N/A'}</td>
                      <td className="ingredient-tolerance">{ingredient.type_tolerance || 'N/A'}</td>
                      <td className="ingredient-grouping">{ingredient.tolerance_grouping_name || 'N/A'}</td>
                      <td className="ingredient-mass">{Number(ingredient.target_mass || 0).toFixed(2)}</td>
                      <td className="ingredient-actions">
                        <button 
                          className="action-btn menu"
                          onClick={() => {/* TODO: Add edit ingredient functionality */}}
                          title="Edit ingredient"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Ingredient Modal */}
          {showAddIngredient && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-title">Add Ingredient</div>
                <div className="modal-content">
                  <div className="form-group">
                    <label className="form-label">Product</label>
                    <select
                      className="form-input"
                      value={newIngredient.productId}
                      onChange={(e) => setNewIngredient({...newIngredient, productId: e.target.value})}
                    >
                      <option value="">Select Product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.product_code} - {product.product_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Mass (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={newIngredient.targetMass}
                      onChange={(e) => setNewIngredient({...newIngredient, targetMass: parseFloat(e.target.value) || 0})}
                      placeholder="Enter target mass"
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddIngredient(false)
                      setNewIngredient({ productId: '', targetMass: 0 })
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleAddIngredient}
                    disabled={!newIngredient.productId || newIngredient.targetMass <= 0}
                  >
                    Add Ingredient
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default EditFormulation

