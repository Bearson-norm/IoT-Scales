import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Users, Filter, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAlert } from '../utils/alertModal'

// Resolve API base URL dynamically
let API_BASE_URL = 'http://localhost:3001/api'
const resolveApiBaseUrl = () => {
  try {
    if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
      API_BASE_URL = window.__API_BASE_URL__
      return API_BASE_URL
    }
    const viteUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    if (viteUrl) {
      API_BASE_URL = viteUrl
      return API_BASE_URL
    }

    if (typeof window !== 'undefined') {
      const { protocol, hostname, port, origin } = window.location
      if (port && port !== '3001') {
        API_BASE_URL = `${protocol}//${hostname}:3001/api`
        return API_BASE_URL
      }
      API_BASE_URL = `${origin}/api`
      return API_BASE_URL
    }
  } catch (e) {
    console.warn('[UserManagement] resolveApiBaseUrl error:', e)
  }
  return API_BASE_URL
}

API_BASE_URL = resolveApiBaseUrl()

const UserManagement = ({ currentUser, onAccessDenied }) => {
  const { alert } = useAlert()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    email: '',
    role: 'operator',
    password: '',
    status: 'active'
  })

  // Check if user is admin (case-insensitive)
  const isAdmin = currentUser && currentUser.role && currentUser.role.toLowerCase() === 'admin'

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      if (onAccessDenied) {
        onAccessDenied()
      }
      alert.error('Akses ditolak. Hanya admin yang dapat mengakses halaman ini.', 'Akses Ditolak')
    }
  }, [isAdmin, onAccessDenied, alert])

  // Load users from API
  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users`)
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.data)
        setFilteredUsers(data.data)
      } else {
        alert.error(data.error || 'Gagal memuat data user', 'Error')
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      alert.error('Gagal memuat data user. Periksa koneksi server.', 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    filterUsers()
  }, [searchTerm, selectedRole, users])

  const filterUsers = () => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole)
    }

    setFilteredUsers(filtered)
  }

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.name || !newUser.email || !newUser.password) {
      alert.warning('Mohon lengkapi semua field yang wajib diisi', 'Validasi')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      const data = await response.json()

      if (data.success) {
        alert.success('User berhasil ditambahkan', 'Berhasil')
        setShowAddModal(false)
        setNewUser({
          username: '',
          name: '',
          email: '',
          role: 'operator',
          password: '',
          status: 'active'
        })
        loadUsers()
      } else {
        alert.error(data.error || 'Gagal menambahkan user', 'Error')
      }
    } catch (error) {
      console.error('Failed to add user:', error)
      alert.error('Gagal menambahkan user. Periksa koneksi server.', 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setNewUser({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      status: user.status
    })
    setShowAddModal(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser || !newUser.username || !newUser.name || !newUser.email) {
      alert.warning('Mohon lengkapi semua field yang wajib diisi', 'Validasi')
      return
    }

    setIsLoading(true)
    try {
      const updateData = { ...newUser }
      // Remove password if empty (don't update password)
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password
      }

      const response = await fetch(`${API_BASE_URL}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (data.success) {
        alert.success('User berhasil diupdate', 'Berhasil')
        setShowAddModal(false)
        setEditingUser(null)
        setNewUser({
          username: '',
          name: '',
          email: '',
          role: 'operator',
          password: '',
          status: 'active'
        })
        loadUsers()
      } else {
        alert.error(data.error || 'Gagal mengupdate user', 'Error')
      }
    } catch (error) {
      console.error('Failed to update user:', error)
      alert.error('Gagal mengupdate user. Periksa koneksi server.', 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus user "${username}"?`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert.success('User berhasil dihapus', 'Berhasil')
        loadUsers()
      } else {
        alert.error(data.error || 'Gagal menghapus user', 'Error')
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert.error('Gagal menghapus user. Periksa koneksi server.', 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status) => {
    return status === 'active' ? '#27ae60' : '#e74c3c'
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#e74c3c'
      case 'supervisor':
        return '#f39c12'
      case 'operator':
        return '#3498db'
      case 'qc':
        return '#9b59b6'
      default:
        return '#95a5a6'
    }
  }

  const roles = ['all', 'admin', 'supervisor', 'operator', 'qc']

  // Don't render if not admin
  if (!isAdmin) {
    return (
      <div className="master-content">
        <div className="empty-state">
          <AlertCircle size={64} className="empty-icon" style={{ color: '#e74c3c' }} />
          <div className="empty-text">Akses Ditolak</div>
          <div className="empty-subtext">Hanya admin yang dapat mengakses halaman ini</div>
        </div>
      </div>
    )
  }

  return (
    <div className="master-content">
      <div className="content-header">
        <div className="content-title">
          <Users size={24} />
          <h2>User Management</h2>
        </div>
        <div className="content-actions">
          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingUser(null)
              setNewUser({
                username: '',
                name: '',
                email: '',
                role: 'operator',
                password: '',
                status: 'active'
              })
              setShowAddModal(true)
            }}
            disabled={isLoading}
          >
            <Plus size={16} />
            Tambah User
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Cari username, nama, atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            disabled={isLoading}
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="filter-select"
              disabled={isLoading}
            >
              {roles.map(role => (
                <option key={role} value={role}>
                  {role === 'all' ? 'Semua Role' : role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && users.length === 0 ? (
        <div className="empty-state">
          <div className="loading-spinner" />
          <div className="empty-text">Memuat data...</div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Tanggal Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td className="user-username">{user.username}</td>
                    <td className="user-name">{user.name}</td>
                    <td className="user-email">{user.email}</td>
                    <td>
                      <span 
                        className="role-badge"
                        style={{ backgroundColor: getRoleColor(user.role) }}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(user.status) }}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="user-lastlogin">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString('id-ID') : 'Never'}
                    </td>
                    <td className="user-date">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="action-buttons">
                      <button 
                        className="action-btn edit"
                        onClick={() => handleEditUser(user)}
                        title="Edit"
                        disabled={isLoading}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        title="Hapus"
                        disabled={isLoading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="empty-state">
              <Users size={64} className="empty-icon" />
              <div className="empty-text">Tidak ada user ditemukan</div>
              <div className="empty-subtext">
                {searchTerm || selectedRole !== 'all' 
                  ? 'Coba ubah filter pencarian' 
                  : 'Klik "Tambah User" untuk menambahkan user baru'
                }
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              {editingUser ? 'Edit User' : 'Tambah User Baru'}
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Username <span style={{ color: '#e74c3c' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  disabled={isLoading || !!editingUser}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nama Lengkap <span style={{ color: '#e74c3c' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan nama lengkap"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email <span style={{ color: '#e74c3c' }}>*</span></label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Masukkan email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  disabled={isLoading}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role <span style={{ color: '#e74c3c' }}>*</span></label>
                  <select
                    className="form-input"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    disabled={isLoading}
                  >
                    <option value="operator">Operator</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="qc">QC</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status <span style={{ color: '#e74c3c' }}>*</span></label>
                  <select
                    className="form-input"
                    value={newUser.status}
                    onChange={(e) => setNewUser({...newUser, status: e.target.value})}
                    disabled={isLoading}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Password {!editingUser && <span style={{ color: '#e74c3c' }}>*</span>}
                </label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder={editingUser ? 'Kosongkan jika tidak ingin mengubah password' : 'Masukkan password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowAddModal(false)
                  setEditingUser(null)
                  setNewUser({
                    username: '',
                    name: '',
                    email: '',
                    role: 'operator',
                    password: '',
                    status: 'active'
                  })
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={editingUser ? handleUpdateUser : handleAddUser}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : (editingUser ? 'Update' : 'Tambah')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
