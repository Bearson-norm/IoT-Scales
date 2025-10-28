import React, { useState } from 'react'
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react'

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Mock users data
  const mockUsers = [
    { username: 'faliq', password: '123456', name: 'Faliq', role: 'Operator' },
    { username: 'admin', password: 'admin123', name: 'Administrator', role: 'Admin' },
    { username: 'operator1', password: 'op123', name: 'Operator 1', role: 'Operator' },
    { username: 'supervisor', password: 'sup123', name: 'Supervisor', role: 'Supervisor' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Simulate API call delay
    setTimeout(() => {
      const user = mockUsers.find(u => u.username === username && u.password === password)
      
      if (user) {
        onLogin(user)
      } else {
        setError('Username atau password salah!')
        setIsLoading(false)
      }
    }, 1500)
  }

  const handleDemoLogin = (demoUser) => {
    setUsername(demoUser.username)
    setPassword(demoUser.password)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-section">
            <div className="logo-icon">
              <User size={48} />
            </div>
            <h1>Foom Lab Global</h1>
            <p>Manufacturing Weighing System</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">
              <User size={16} />
              Username
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} />
              Password
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !username || !password}
          >
            {isLoading ? (
              <div className="loading-spinner" />
            ) : (
              <>
                <LogIn size={20} />
                Login
              </>
            )}
          </button>
        </form>

        <div className="demo-section">
          <h3>Demo Accounts</h3>
          <div className="demo-buttons">
            {mockUsers.map((user, index) => (
              <button
                key={index}
                className="demo-button"
                onClick={() => handleDemoLogin(user)}
                disabled={isLoading}
              >
                {user.name}
              </button>
            ))}
          </div>
        </div>

        <div className="login-footer">
          <p>v1.7.0 - PRESISITECH</p>
        </div>
      </div>
    </div>
  )
}

export default Login

