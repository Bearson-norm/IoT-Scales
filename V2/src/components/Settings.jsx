import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, RotateCcw, Scale, Database, User, Bell, Shield, Server } from 'lucide-react'
import ServerDatabaseConfig from './ServerDatabaseConfig'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    // General Settings
    companyName: 'Foom Lab Global',
    appVersion: 'v1.0.0',
    language: 'id',
    timezone: 'Asia/Jakarta',
    
    // Scale Settings (Vibra)
    scalePort: 'COM1',
    scaleBaudRate: 9600,
    scaleDataBits: 8,
    scaleParity: 'none',
    scaleStopBits: 2,
    scaleTimeout: 3000,
    scaleModel: 'vibra',
    weightUnit: 'kg',
    autoTare: true,
    weightTolerance: 0.1,
    
    // Database Settings
    dbHost: 'localhost',
    dbPort: 5432,
    dbName: 'FLB_MOWS',
    dbUser: 'postgres',
    backupInterval: 24,
    
    // User Settings
    sessionTimeout: 30,
    requirePasswordChange: false,
    maxLoginAttempts: 3,
    
    // Notification Settings
    enableNotifications: true,
    emailNotifications: false,
    soundNotifications: true,
    lowWeightAlert: true,
    errorAlert: true
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    // Load scale config from server
    fetch('/api/scale/config')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setSettings(prev => ({
            ...prev,
            scalePort: data.data.port || prev.scalePort,
            scaleModel: data.data.model || prev.scaleModel
          }))
        }
      })
      .catch(e => console.error('Failed to load scale config:', e))
  }, [])

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')
    
    // Simulate save delay
    try {
      // Save scale config if on scale tab
      if (activeTab === 'scale') {
        await fetch('/api/scale/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: true,
            model: settings.scaleModel,
            port: settings.scalePort
          })
        })
      }
      setSaveMessage('Pengaturan berhasil disimpan!')
    } catch (e) {
      setSaveMessage('Gagal menyimpan pengaturan')
      console.error('Save error:', e)
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const handleReset = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan pengaturan ke default?')) {
      // Reset to default values
      setSettings({
        companyName: 'PRESISITECH',
        appVersion: 'v1.7.0',
        language: 'id',
        timezone: 'Asia/Jakarta',
        scalePort: 'COM1',
        scaleBaudRate: 9600,
        scaleDataBits: 8,
        scaleParity: 'none',
        scaleStopBits: 2,
        scaleTimeout: 3000,
        scaleModel: 'vibra',
        weightUnit: 'kg',
        autoTare: true,
        weightTolerance: 0.1,
        dbHost: 'localhost',
        dbPort: 5432,
        dbName: 'FLB_MOWS',
        dbUser: 'postgres',
        backupInterval: 24,
        sessionTimeout: 30,
        requirePasswordChange: false,
        maxLoginAttempts: 3,
        enableNotifications: true,
        emailNotifications: false,
        soundNotifications: true,
        lowWeightAlert: true,
        errorAlert: true
      })
      setSaveMessage('Pengaturan telah direset ke default!')
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const tabs = [
    { id: 'general', label: 'Umum', icon: SettingsIcon },
    { id: 'scale', label: 'Timbangan', icon: Scale },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'server-database', label: 'Server Database', icon: Server },
    { id: 'user', label: 'Pengguna', icon: User },
    { id: 'notifications', label: 'Notifikasi', icon: Bell }
  ]

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan Umum</h3>
      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label">Nama Perusahaan</label>
          <input
            type="text"
            className="form-input"
            value={settings.companyName}
            onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Versi Aplikasi</label>
          <input
            type="text"
            className="form-input readonly"
            value={settings.appVersion}
            readOnly
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Bahasa</label>
          <select
            className="form-input"
            value={settings.language}
            onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Zona Waktu</label>
          <select
            className="form-input"
            value={settings.timezone}
            onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
          >
            <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
            <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
            <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderScaleSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan Timbangan</h3>
      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label">Model Timbangan</label>
          <select
            className="form-input"
            value={settings.scaleModel}
            onChange={(e) => handleSettingChange('scale', 'scaleModel', e.target.value)}
          >
            <option value="generic">Generic RS232</option>
            <option value="ohaus_ranger">OHAUS Ranger</option>
            <option value="mettler_toledo">Mettler Toledo</option>
            <option value="and_fx">A&D FX/FG</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Port Serial</label>
          <select
            className="form-input"
            value={settings.scalePort}
            onChange={(e) => handleSettingChange('scale', 'scalePort', e.target.value)}
          >
            <option value="COM1">COM1</option>
            <option value="COM2">COM2</option>
            <option value="COM3">COM3</option>
            <option value="COM4">COM4</option>
            <option value="USB">USB</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Baud Rate</label>
          <select
            className="form-input"
            value={settings.scaleBaudRate}
            onChange={(e) => handleSettingChange('scale', 'scaleBaudRate', parseInt(e.target.value))}
          >
            <option value={9600}>9600</option>
            <option value={19200}>19200</option>
            <option value={38400}>38400</option>
            <option value={57600}>57600</option>
            <option value={115200}>115200</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Data Bits</label>
          <select
            className="form-input"
            value={settings.scaleDataBits}
            onChange={(e) => handleSettingChange('scale', 'scaleDataBits', parseInt(e.target.value))}
          >
            <option value={7}>7</option>
            <option value={8}>8</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Parity</label>
          <select
            className="form-input"
            value={settings.scaleParity}
            onChange={(e) => handleSettingChange('scale', 'scaleParity', e.target.value)}
          >
            <option value="none">None</option>
            <option value="even">Even</option>
            <option value="odd">Odd</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Stop Bits</label>
          <select
            className="form-input"
            value={settings.scaleStopBits}
            onChange={(e) => handleSettingChange('scale', 'scaleStopBits', parseInt(e.target.value))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Timeout (ms)</label>
          <input
            type="number"
            className="form-input"
            value={settings.scaleTimeout}
            onChange={(e) => handleSettingChange('scale', 'scaleTimeout', parseInt(e.target.value))}
          />
        </div>

        
        <div className="form-group">
          <label className="form-label">Unit Berat</label>
          <select
            className="form-input"
            value={settings.weightUnit}
            onChange={(e) => handleSettingChange('scale', 'weightUnit', e.target.value)}
          >
            <option value="g">Gram (g)</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="mg">Miligram (mg)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Toleransi Berat</label>
          <input
            type="number"
            step="0.1"
            className="form-input"
            value={settings.weightTolerance}
            onChange={(e) => handleSettingChange('scale', 'weightTolerance', parseFloat(e.target.value))}
          />
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.autoTare}
              onChange={(e) => handleSettingChange('scale', 'autoTare', e.target.checked)}
            />
            <span className="checkmark"></span>
            Auto Tare
          </label>
        </div>
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" onClick={async () => {
          try {
            const resp = await fetch('/api/scale/ports');
            const data = await resp.json();
            if (data.success) {
              const ports = data.data || [];
              if (ports.length === 0) {
                alert('Tidak ada port serial yang terdeteksi');
              } else {
                const portList = ports.map(p => `${p.path}${p.manufacturer ? ` (${p.manufacturer})` : ''}`).join('\n');
                alert(`Port Serial Tersedia:\n${portList}`);
              }
            }
          } catch (e) {
            alert('Gagal mengambil daftar port')
          }
        }}>Daftar Port</button>
        <button className="btn btn-secondary" onClick={async () => {
          try {
            const resp = await fetch('/api/scale/read');
            const data = await resp.json();
            if (data.success) {
              alert(`Berat: ${data.weight.toFixed(4)} ${data.unit}\nOriginal: ${data.weightOriginal} ${data.originalUnit}\nStable: ${data.stable ? 'Ya' : 'Tidak'}\nRaw: ${data.raw?.slice(0,120)}`)
            } else {
              alert(`Gagal baca timbangan: ${data.error || 'Unknown'}`)
            }
          } catch (e) {
            alert('Gagal tes baca timbangan')
          }
        }}>Tes Baca Timbangan</button>
      </div>
    </div>
  )

  const renderDatabaseSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan Database</h3>
      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label">Host Database</label>
          <input
            type="text"
            className="form-input"
            value={settings.dbHost}
            onChange={(e) => handleSettingChange('database', 'dbHost', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Port Database</label>
          <input
            type="number"
            className="form-input"
            value={settings.dbPort}
            onChange={(e) => handleSettingChange('database', 'dbPort', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Nama Database</label>
          <input
            type="text"
            className="form-input"
            value={settings.dbName}
            onChange={(e) => handleSettingChange('database', 'dbName', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Username Database</label>
          <input
            type="text"
            className="form-input"
            value={settings.dbUser}
            onChange={(e) => handleSettingChange('database', 'dbUser', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Interval Backup (jam)</label>
          <input
            type="number"
            className="form-input"
            value={settings.backupInterval}
            onChange={(e) => handleSettingChange('database', 'backupInterval', parseInt(e.target.value))}
          />
        </div>
      </div>
    </div>
  )

  const renderUserSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan Pengguna</h3>
      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label">Session Timeout (menit)</label>
          <input
            type="number"
            className="form-input"
            value={settings.sessionTimeout}
            onChange={(e) => handleSettingChange('user', 'sessionTimeout', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Max Login Attempts</label>
          <input
            type="number"
            className="form-input"
            value={settings.maxLoginAttempts}
            onChange={(e) => handleSettingChange('user', 'maxLoginAttempts', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.requirePasswordChange}
              onChange={(e) => handleSettingChange('user', 'requirePasswordChange', e.target.checked)}
            />
            <span className="checkmark"></span>
            Wajib Ganti Password
          </label>
        </div>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan Notifikasi</h3>
      <div className="settings-grid">
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => handleSettingChange('notifications', 'enableNotifications', e.target.checked)}
            />
            <span className="checkmark"></span>
            Aktifkan Notifikasi
          </label>
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
            />
            <span className="checkmark"></span>
            Notifikasi Email
          </label>
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.soundNotifications}
              onChange={(e) => handleSettingChange('notifications', 'soundNotifications', e.target.checked)}
            />
            <span className="checkmark"></span>
            Notifikasi Suara
          </label>
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.lowWeightAlert}
              onChange={(e) => handleSettingChange('notifications', 'lowWeightAlert', e.target.checked)}
            />
            <span className="checkmark"></span>
            Alert Berat Rendah
          </label>
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.errorAlert}
              onChange={(e) => handleSettingChange('notifications', 'errorAlert', e.target.checked)}
            />
            <span className="checkmark"></span>
            Alert Error
          </label>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings()
      case 'scale':
        return renderScaleSettings()
      case 'database':
        return renderDatabaseSettings()
      case 'server-database':
        return <ServerDatabaseConfig />
      case 'user':
        return renderUserSettings()
      case 'notifications':
        return renderNotificationSettings()
      default:
        return renderGeneralSettings()
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="page-title">
          <SettingsIcon size={28} />
          <h1>System Settings</h1>
        </div>
        <div className="page-description">
          <p>Konfigurasi sistem penimbangan, database, pengguna, dan notifikasi untuk optimalisasi performa aplikasi.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleReset}>
            <RotateCcw size={16} />
            Reset
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="save-message success">
          {saveMessage}
        </div>
      )}

      <div className="settings-container">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

export default Settings
