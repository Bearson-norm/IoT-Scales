import React, { useState } from 'react'
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react'

// Resolve API base URL dynamically + log so kita tahu kemana request dikirim
let API_BASE_URL = 'http://localhost:3001/api'
const resolveApiBaseUrl = () => {
  const log = (msg) => console.log(`[LOGIN] ${msg}`)
  try {
    if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
      API_BASE_URL = window.__API_BASE_URL__
      log(`Using window.__API_BASE_URL__: ${API_BASE_URL}`)
      return API_BASE_URL
    }
    const viteUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    if (viteUrl) {
      API_BASE_URL = viteUrl
      log(`Using VITE_API_BASE_URL: ${API_BASE_URL}`)
      return API_BASE_URL
    }

    if (typeof window !== 'undefined') {
      const { protocol, hostname, port, origin } = window.location
      if (port && port !== '3001') {
        API_BASE_URL = `${protocol}//${hostname}:3001/api`
        log(`Using port 3001 fallback: ${API_BASE_URL}`)
        return API_BASE_URL
      }
      API_BASE_URL = `${origin}/api`
      log(`Using same-origin /api: ${API_BASE_URL}`)
      return API_BASE_URL
    }
  } catch (e) {
    console.warn('[LOGIN] resolveApiBaseUrl error:', e)
  }
  log(`Fallback: ${API_BASE_URL}`)
  return API_BASE_URL
}

API_BASE_URL = resolveApiBaseUrl()

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      console.log('[LOGIN] POST', `${API_BASE_URL}/auth/login`)
      const resp = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      })

      const data = await resp.json()

      if (!data.success) {
        setError(data.error || 'Username atau password salah!')
        setIsLoading(false)
        return
      }

      const user = data.user
      onLogin(user)
    } catch (err) {
      console.error('Login error:', err)
      setError('Gagal login. Periksa koneksi atau hubungi admin.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-section">
            <div className="logo-icon">
              <User size={48} />
            </div>
            <h1>Wangsa Aguna</h1>
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

        <div className="login-footer">
          <p>v1.7.0 - Wangsa Aguna</p>
        </div>
      </div>
    </div>
  )
}

export default Login

