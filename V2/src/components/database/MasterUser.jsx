import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Users, Filter, Eye, EyeOff } from 'lucide-react'

const MasterUser = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    email: '',
    role: 'operator',
    password: '',
    status: 'active'
  })

  // Mock data User
  const mockUsers = [
    {
      id: 1,
      username: 'faliq',
      name: 'Faliq',
      email: 'faliq@presisitech.com',
      role: 'operator',
      status: 'active',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20',
      lastLogin: '2024-01-20 08:30:00'
    },
    {
      id: 2,
      username: 'admin',
      name: 'Administrator',
      email: 'admin@presisitech.com',
      role: 'admin',
      status: 'active',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-18',
      lastLogin: '2024-01-20 09:15:00'
    },
    {
      id: 3,
      username: 'operator1',
      name: 'Operator 1',
      email: 'operator1@presisitech.com',
      role: 'operator',
      status: 'active',
      createdAt: '2024-01-05',
      updatedAt: '2024-01-12',
      lastLogin: '2024-01-19 14:20:00'
    },
    {
      id: 4,
      username: 'supervisor',
      name: 'Supervisor',
      email: 'supervisor@presisitech.com',
      role: 'supervisor',
      status: 'inactive',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-15',
      lastLogin: '2024-01-18 16:45:00'
    }
  ]

  useEffect(() => {
    setUsers(mockUsers)
    setFilteredUsers(mockUsers)
  }, [])

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

  const handleAddUser = () => {
    if (newUser.username && newUser.name && newUser.password) {
      const user = {
        ...newUser,
        id: Date.now(),
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        lastLogin: null
      }
      setUsers([...users, user])
      setNewUser({
        username: '',
        name: '',
        email: '',
        role: 'operator',
        password: '',
        status: 'active'
      })
      setShowAddModal(false)
    }
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setNewUser({...user, password: ''}) // Don't show password when editing
    setShowAddModal(true)
  }

  const handleUpdateUser = () => {
    if (editingUser && newUser.username && newUser.name) {
      const updatedUser = {
        ...newUser,
        id: editingUser.id,
        updatedAt: new Date().toISOString().split('T')[0],
        lastLogin: editingUser.lastLogin
      }
      
      // Only update password if provided
      if (!newUser.password) {
        delete updatedUser.password
      }
      
      setUsers(users.map(user =>
        user.id === editingUser.id ? updatedUser : user
      ))
      setEditingUser(null)
      setNewUser({
        username: '',
        name: '',
        email: '',
        role: 'operator',
        password: '',
        status: 'active'
      })
      setShowAddModal(false)
    }
  }

  const handleDeleteUser = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      setUsers(users.filter(user => user.id !== id))
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
      default:
        return '#95a5a6'
    }
  }

  const roles = ['all', 'admin', 'supervisor', 'operator']

  return (
    <div className="master-content">
      <div className="content-header">
        <div className="content-title">
          <Users size={24} />
          <h2>Master User</h2>
        </div>
        <div className="content-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
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
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="filter-select"
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
                <td className="user-date">{user.createdAt}</td>
                <td className="action-buttons">
                  <button 
                    className="action-btn edit"
                    onClick={() => handleEditUser(user)}
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDeleteUser(user.id)}
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              {editingUser ? 'Edit User' : 'Tambah User Baru'}
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan nama lengkap"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Masukkan email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-input"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="operator">Operator</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={newUser.status}
                    onChange={(e) => setNewUser({...newUser, status: e.target.value})}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder={editingUser ? 'Kosongkan jika tidak ingin mengubah password' : 'Masukkan password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
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
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={editingUser ? handleUpdateUser : handleAddUser}
              >
                {editingUser ? 'Update' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MasterUser


