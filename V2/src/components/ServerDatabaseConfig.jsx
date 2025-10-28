import React, { useState, useEffect } from 'react'
import { Server, Plus, Edit, Trash2, TestTube, Eye, EyeOff, Save, X } from 'lucide-react'
import serverDatabaseConfig from '../utils/serverDatabaseConfig.js'

const ServerDatabaseConfig = () => {
  const [configurations, setConfigurations] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [testingConfig, setTestingConfig] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [isTesting, setIsTesting] = useState(false)
  const [showPassword, setShowPassword] = useState({})
  const [newConfig, setNewConfig] = useState({
    name: '',
    description: '',
    host: 'localhost',
    port: 5432,
    database_name: '',
    username: '',
    password: '',
    connection_type: 'postgresql',
    ssl_enabled: false,
    timeout_seconds: 30,
    max_connections: 10,
    is_active: true
  })

  useEffect(() => {
    loadConfigurations()
  }, [])

  const loadConfigurations = () => {
    const configs = serverDatabaseConfig.getConfigurations()
    setConfigurations(configs)
  }

  const handleAddConfig = () => {
    setNewConfig(serverDatabaseConfig.getDefaultConfiguration())
    setShowAddModal(true)
  }

  const handleEditConfig = (config) => {
    setEditingConfig({ ...config, password: '' }) // Don't show password
    setShowEditModal(true)
  }

  const handleTestConfig = (config) => {
    setTestingConfig(config)
    setShowTestModal(true)
    setTestResult(null)
  }

  const handleSaveConfig = async () => {
    try {
      const savedConfig = await serverDatabaseConfig.addConfiguration({
        ...newConfig,
        created_by: 'current_user_id' // In real app, get from context
      })

      if (savedConfig) {
        loadConfigurations()
        setShowAddModal(false)
        setNewConfig(serverDatabaseConfig.getDefaultConfiguration())
        alert('Configuration saved successfully!')
      } else {
        alert('Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
      alert('Error saving configuration: ' + error.message)
    }
  }

  const handleUpdateConfig = async () => {
    try {
      const updatedConfig = await serverDatabaseConfig.updateConfiguration(
        editingConfig.id,
        editingConfig
      )

      if (updatedConfig) {
        loadConfigurations()
        setShowEditModal(false)
        setEditingConfig(null)
        alert('Configuration updated successfully!')
      } else {
        alert('Failed to update configuration')
      }
    } catch (error) {
      console.error('Error updating configuration:', error)
      alert('Error updating configuration: ' + error.message)
    }
  }

  const handleDeleteConfig = async (id) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      try {
        const deleted = await serverDatabaseConfig.deleteConfiguration(id)
        if (deleted) {
          loadConfigurations()
          alert('Configuration deleted successfully!')
        } else {
          alert('Failed to delete configuration')
        }
      } catch (error) {
        console.error('Error deleting configuration:', error)
        alert('Error deleting configuration: ' + error.message)
      }
    }
  }

  const handleTestConnection = async () => {
    if (!testingConfig) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const result = await serverDatabaseConfig.testConnection(testingConfig.id)
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      })
    } finally {
      setIsTesting(false)
    }
  }

  const togglePasswordVisibility = (configId) => {
    setShowPassword(prev => ({
      ...prev,
      [configId]: !prev[configId]
    }))
  }

  const getConnectionTypeLabel = (type) => {
    const types = {
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      sqlserver: 'SQL Server'
    }
    return types[type] || type
  }

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
  }

  return (
    <div className="server-database-config-page">
      <div className="page-header">
        <div className="page-title">
          <Server size={28} />
          <h1>Server Database Configuration</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleAddConfig}>
            <Plus size={16} />
            Add Configuration
          </button>
        </div>
      </div>

      {/* Configurations List */}
      <div className="configurations-list">
        {configurations.length === 0 ? (
          <div className="empty-state">
            <Server size={64} className="empty-icon" />
            <div className="empty-text">No server configurations found</div>
            <div className="empty-subtext">
              Add server configurations to enable database imports
            </div>
            <button className="btn btn-primary" onClick={handleAddConfig}>
              <Plus size={16} />
              Add First Configuration
            </button>
          </div>
        ) : (
          <div className="configurations-grid">
            {configurations.map(config => (
              <div key={config.id} className="config-card">
                <div className="config-header">
                  <div className="config-title">
                    <Server size={20} />
                    <h3>{config.name}</h3>
                  </div>
                  <div className="config-status">
                    <span className={`status-badge ${getStatusColor(config.is_active)}`}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="config-details">
                  <div className="detail-row">
                    <strong>Host:</strong> {config.host}:{config.port}
                  </div>
                  <div className="detail-row">
                    <strong>Database:</strong> {config.database_name}
                  </div>
                  <div className="detail-row">
                    <strong>Type:</strong> {getConnectionTypeLabel(config.connection_type)}
                  </div>
                  <div className="detail-row">
                    <strong>Username:</strong> {config.username}
                  </div>
                  <div className="detail-row">
                    <strong>Password:</strong> 
                    <span className="password-field">
                      {showPassword[config.id] ? '••••••••' : '••••••••'}
                      <button
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility(config.id)}
                      >
                        {showPassword[config.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </span>
                  </div>
                  {config.description && (
                    <div className="detail-row">
                      <strong>Description:</strong> {config.description}
                    </div>
                  )}
                </div>

                <div className="config-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleTestConfig(config)}
                  >
                    <TestTube size={16} />
                    Test
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleEditConfig(config)}
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteConfig(config.id)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Configuration Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              <Server size={28} />
              Add Server Configuration
            </div>
            
            <div className="modal-content">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Configuration Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newConfig.name}
                    onChange={(e) => setNewConfig({...newConfig, name: e.target.value})}
                    placeholder="Enter configuration name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    value={newConfig.description}
                    onChange={(e) => setNewConfig({...newConfig, description: e.target.value})}
                    placeholder="Enter description (optional)"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Connection Type</label>
                  <select
                    className="form-input"
                    value={newConfig.connection_type}
                    onChange={(e) => setNewConfig({...newConfig, connection_type: e.target.value})}
                  >
                    {serverDatabaseConfig.getSupportedDatabaseTypes().map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Host</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newConfig.host}
                    onChange={(e) => setNewConfig({...newConfig, host: e.target.value})}
                    placeholder="localhost"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Port</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newConfig.port}
                    onChange={(e) => setNewConfig({...newConfig, port: parseInt(e.target.value)})}
                    placeholder="5432"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Database Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newConfig.database_name}
                    onChange={(e) => setNewConfig({...newConfig, database_name: e.target.value})}
                    placeholder="Enter database name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newConfig.username}
                    onChange={(e) => setNewConfig({...newConfig, username: e.target.value})}
                    placeholder="Enter username"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newConfig.password}
                    onChange={(e) => setNewConfig({...newConfig, password: e.target.value})}
                    placeholder="Enter password"
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newConfig.ssl_enabled}
                      onChange={(e) => setNewConfig({...newConfig, ssl_enabled: e.target.checked})}
                    />
                    <span className="checkmark"></span>
                    Enable SSL
                  </label>
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newConfig.is_active}
                      onChange={(e) => setNewConfig({...newConfig, is_active: e.target.checked})}
                    />
                    <span className="checkmark"></span>
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAddModal(false)}
              >
                <X size={16} />
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveConfig}
                disabled={!newConfig.name || !newConfig.host || !newConfig.database_name}
              >
                <Save size={16} />
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Connection Modal */}
      {showTestModal && testingConfig && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              <TestTube size={28} />
              Test Connection
            </div>
            
            <div className="modal-content">
              <div className="test-info">
                <h4>Testing Connection:</h4>
                <div className="test-details">
                  <div><strong>Name:</strong> {testingConfig.name}</div>
                  <div><strong>Host:</strong> {testingConfig.host}:{testingConfig.port}</div>
                  <div><strong>Database:</strong> {testingConfig.database_name}</div>
                  <div><strong>Type:</strong> {getConnectionTypeLabel(testingConfig.connection_type)}</div>
                </div>
              </div>

              {testResult && (
                <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                  <div className="result-icon">
                    {testResult.success ? <TestTube size={24} /> : <X size={24} />}
                  </div>
                  <div className="result-content">
                    <div className="result-title">
                      {testResult.success ? 'Connection Successful!' : 'Connection Failed'}
                    </div>
                    {testResult.error && (
                      <div className="result-error">{testResult.error}</div>
                    )}
                    {testResult.responseTime && (
                      <div className="result-time">
                        Response Time: {testResult.responseTime}ms
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowTestModal(false)}
              >
                Close
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServerDatabaseConfig
