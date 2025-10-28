import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Target, Filter } from 'lucide-react'

const MasterToleranceGrouping = () => {
  const [toleranceGroups, setToleranceGroups] = useState([])
  const [filteredToleranceGroups, setFilteredToleranceGroups] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingToleranceGroup, setEditingToleranceGroup] = useState(null)
  const [newToleranceGroup, setNewToleranceGroup] = useState({
    code: '',
    name: '',
    description: '',
    minTolerance: 0,
    maxTolerance: 0,
    unit: 'g',
    status: 'active'
  })

  // Mock data Tolerance Grouping
  const mockToleranceGroups = [
    {
      id: 1,
      code: 'TOL001',
      name: 'High Precision',
      description: 'High precision tolerance for critical ingredients',
      minTolerance: 0.1,
      maxTolerance: 0.1,
      unit: 'g',
      status: 'active',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20'
    },
    {
      id: 2,
      code: 'TOL002',
      name: 'Standard Precision',
      description: 'Standard precision tolerance for regular ingredients',
      minTolerance: 0.5,
      maxTolerance: 0.5,
      unit: 'g',
      status: 'active',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-18'
    },
    {
      id: 3,
      code: 'TOL003',
      name: 'Low Precision',
      description: 'Low precision tolerance for bulk ingredients',
      minTolerance: 1.0,
      maxTolerance: 1.0,
      unit: 'g',
      status: 'active',
      createdAt: '2024-01-05',
      updatedAt: '2024-01-12'
    },
    {
      id: 4,
      code: 'TOL004',
      name: 'Volume Tolerance',
      description: 'Tolerance for volume-based measurements',
      minTolerance: 0.1,
      maxTolerance: 0.1,
      unit: 'ml',
      status: 'inactive',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-15'
    }
  ]

  useEffect(() => {
    setToleranceGroups(mockToleranceGroups)
    setFilteredToleranceGroups(mockToleranceGroups)
  }, [])

  useEffect(() => {
    filterToleranceGroups()
  }, [searchTerm, selectedStatus, toleranceGroups])

  const filterToleranceGroups = () => {
    let filtered = toleranceGroups

    if (searchTerm) {
      filtered = filtered.filter(group =>
        group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(group => group.status === selectedStatus)
    }

    setFilteredToleranceGroups(filtered)
  }

  const handleAddToleranceGroup = () => {
    if (newToleranceGroup.code && newToleranceGroup.name) {
      const toleranceGroup = {
        ...newToleranceGroup,
        id: Date.now(),
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      }
      setToleranceGroups([...toleranceGroups, toleranceGroup])
      setNewToleranceGroup({
        code: '',
        name: '',
        description: '',
        minTolerance: 0,
        maxTolerance: 0,
        unit: 'g',
        status: 'active'
      })
      setShowAddModal(false)
    }
  }

  const handleEditToleranceGroup = (toleranceGroup) => {
    setEditingToleranceGroup(toleranceGroup)
    setNewToleranceGroup(toleranceGroup)
    setShowAddModal(true)
  }

  const handleUpdateToleranceGroup = () => {
    if (editingToleranceGroup && newToleranceGroup.code && newToleranceGroup.name) {
      setToleranceGroups(toleranceGroups.map(group =>
        group.id === editingToleranceGroup.id
          ? { ...newToleranceGroup, id: editingToleranceGroup.id, updatedAt: new Date().toISOString().split('T')[0] }
          : group
      ))
      setEditingToleranceGroup(null)
      setNewToleranceGroup({
        code: '',
        name: '',
        description: '',
        minTolerance: 0,
        maxTolerance: 0,
        unit: 'g',
        status: 'active'
      })
      setShowAddModal(false)
    }
  }

  const handleDeleteToleranceGroup = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus tolerance grouping ini?')) {
      setToleranceGroups(toleranceGroups.filter(group => group.id !== id))
    }
  }

  const getStatusColor = (status) => {
    return status === 'active' ? '#27ae60' : '#e74c3c'
  }

  const statuses = ['all', 'active', 'inactive']

  return (
    <div className="master-content">
      <div className="content-header">
        <div className="content-title">
          <Target size={24} />
          <h2>Master Tolerance Grouping</h2>
        </div>
        <div className="content-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            Tambah Tolerance Grouping
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Cari kode, nama, atau deskripsi..."
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
              <th>Kode</th>
              <th>Nama</th>
              <th>Deskripsi</th>
              <th>Min Tolerance</th>
              <th>Max Tolerance</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Tanggal Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredToleranceGroups.map(group => (
              <tr key={group.id}>
                <td className="tolerance-code">{group.code}</td>
                <td className="tolerance-name">{group.name}</td>
                <td className="tolerance-description">{group.description}</td>
                <td className="tolerance-min">±{group.minTolerance} {group.unit}</td>
                <td className="tolerance-max">±{group.maxTolerance} {group.unit}</td>
                <td className="tolerance-unit">{group.unit}</td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(group.status) }}
                  >
                    {group.status}
                  </span>
                </td>
                <td className="tolerance-date">{group.createdAt}</td>
                <td className="action-buttons">
                  <button 
                    className="action-btn edit"
                    onClick={() => handleEditToleranceGroup(group)}
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDeleteToleranceGroup(group.id)}
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

      {filteredToleranceGroups.length === 0 && (
        <div className="empty-state">
          <Target size={64} className="empty-icon" />
          <div className="empty-text">Tidak ada tolerance grouping ditemukan</div>
          <div className="empty-subtext">
            {searchTerm || selectedStatus !== 'all' 
              ? 'Coba ubah filter pencarian' 
              : 'Klik "Tambah Tolerance Grouping" untuk menambahkan grouping baru'
            }
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              {editingToleranceGroup ? 'Edit Tolerance Grouping' : 'Tambah Tolerance Grouping Baru'}
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Kode</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan kode tolerance grouping"
                  value={newToleranceGroup.code}
                  onChange={(e) => setNewToleranceGroup({...newToleranceGroup, code: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nama</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan nama tolerance grouping"
                  value={newToleranceGroup.name}
                  onChange={(e) => setNewToleranceGroup({...newToleranceGroup, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea
                  className="form-input"
                  placeholder="Masukkan deskripsi tolerance grouping"
                  value={newToleranceGroup.description}
                  onChange={(e) => setNewToleranceGroup({...newToleranceGroup, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Min Tolerance</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    placeholder="Masukkan min tolerance"
                    value={newToleranceGroup.minTolerance}
                    onChange={(e) => setNewToleranceGroup({...newToleranceGroup, minTolerance: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max Tolerance</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    placeholder="Masukkan max tolerance"
                    value={newToleranceGroup.maxTolerance}
                    onChange={(e) => setNewToleranceGroup({...newToleranceGroup, maxTolerance: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select
                    className="form-input"
                    value={newToleranceGroup.unit}
                    onChange={(e) => setNewToleranceGroup({...newToleranceGroup, unit: e.target.value})}
                  >
                    <option value="g">Gram (g)</option>
                    <option value="ml">Mililiter (ml)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="l">Liter (l)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={newToleranceGroup.status}
                    onChange={(e) => setNewToleranceGroup({...newToleranceGroup, status: e.target.value})}
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
                  setEditingToleranceGroup(null)
                  setNewToleranceGroup({
                    code: '',
                    name: '',
                    description: '',
                    minTolerance: 0,
                    maxTolerance: 0,
                    unit: 'g',
                    status: 'active'
                  })
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={editingToleranceGroup ? handleUpdateToleranceGroup : handleAddToleranceGroup}
              >
                {editingToleranceGroup ? 'Update' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MasterToleranceGrouping

