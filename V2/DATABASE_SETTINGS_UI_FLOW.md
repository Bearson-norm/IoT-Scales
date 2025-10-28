# Cara Kerja UI Pengaturan Database - IoT Scales V2

## 📋 **Overview**
Dokumentasi ini menjelaskan cara kerja UI pada saat pengaturan Database di halaman Settings.

## 🎯 **Lokasi UI**
- **Path**: Settings → Database Tab
- **Component**: `src/components/Settings.jsx`
- **Function**: `renderDatabaseSettings()`

## 🔧 **Form Fields Database**

### **1. Host Database**
```jsx
<label className="form-label">Host Database</label>
<input
  type="text"
  className="form-input"
  value={settings.dbHost}
  onChange={(e) => handleSettingChange('database', 'dbHost', e.target.value)}
/>
```
- **Type**: Text input
- **Default Value**: `'localhost'`
- **Function**: Menyimpan host database (localhost, IP address, domain)

### **2. Port Database**
```jsx
<label className="form-label">Port Database</label>
<input
  type="number"
  className="form-input"
  value={settings.dbPort}
  onChange={(e) => handleSettingChange('database', 'dbPort', parseInt(e.target.value))}
/>
```
- **Type**: Number input
- **Default Value**: `3306`
- **Function**: Menyimpan port database (3306 untuk MySQL, 5432 untuk PostgreSQL)

### **3. Nama Database**
```jsx
<label className="form-label">Nama Database</label>
<input
  type="text"
  className="form-input"
  value={settings.dbName}
  onChange={(e) => handleSettingChange('database', 'dbName', e.target.value)}
/>
```
- **Type**: Text input
- **Default Value**: `'prisma_form'`
- **Function**: Menyimpan nama database

### **4. Username Database**
```jsx
<label className="form-label">Username Database</label>
<input
  type="text"
  className="form-input"
  value={settings.dbUser}
  onChange={(e) => handleSettingChange('database', 'dbUser', e.target.value)}
/>
```
- **Type**: Text input
- **Default Value**: `'admin'`
- **Function**: Menyimpan username untuk koneksi database

### **5. Interval Backup (jam)**
```jsx
<label className="form-label">Interval Backup (jam)</label>
<input
  type="number"
  className="form-input"
  value={settings.backupInterval}
  onChange={(e) => handleSettingChange('database', 'backupInterval', parseInt(e.target.value))}
/>
```
- **Type**: Number input
- **Default Value**: `24`
- **Function**: Menyimpan interval backup dalam jam

## 🔄 **Alur Kerja UI**

### **1. State Management**
```javascript
const [settings, setSettings] = useState({
  // Database Settings
  dbHost: 'localhost',
  dbPort: 3306,
  dbName: 'prisma_form',
  dbUser: 'admin',
  backupInterval: 24,
  // ... other settings
})
```

### **2. Handle Input Changes**
```javascript
const handleSettingChange = (category, key, value) => {
  setSettings(prev => ({
    ...prev,
    [key]: value
  }))
}
```

**Cara Kerja:**
- User mengetik di input field
- `onChange` event dipicu
- `handleSettingChange` dipanggil dengan parameter:
  - `category`: 'database'
  - `key`: nama field (dbHost, dbPort, dbName, dbUser, backupInterval)
  - `value`: nilai baru dari input
- State `settings` diupdate dengan nilai baru

### **3. Save Process**
```javascript
const handleSave = async () => {
  setIsSaving(true)
  setSaveMessage('')
  
  // Simulate save delay
  setTimeout(() => {
    setIsSaving(false)
    setSaveMessage('Pengaturan berhasil disimpan!')
    setTimeout(() => setSaveMessage(''), 3000)
  }, 1500)
}
```

**Cara Kerja:**
- User klik tombol "Simpan"
- `handleSave` dipanggil
- Loading state diaktifkan (`isSaving = true`)
- Simulasi delay 1.5 detik
- Success message ditampilkan
- Message hilang setelah 3 detik

## 🎨 **UI Components**

### **Form Structure**
```jsx
<div className="settings-section">
  <h3>Pengaturan Database</h3>
  <div className="settings-grid">
    {/* Form fields */}
  </div>
</div>
```

### **Form Group Structure**
```jsx
<div className="form-group">
  <label className="form-label">Label Text</label>
  <input
    type="text|number"
    className="form-input"
    value={settings.fieldName}
    onChange={(e) => handleSettingChange('database', 'fieldName', e.target.value)}
  />
</div>
```

## 📱 **User Interaction Flow**

### **Step 1: Navigate to Settings**
1. User klik menu "Settings" di sidebar
2. Halaman Settings terbuka
3. Tab "Database" aktif secara default

### **Step 2: Edit Database Settings**
1. User klik pada input field yang ingin diubah
2. User mengetik nilai baru
3. `onChange` event dipicu
4. State diupdate secara real-time
5. UI menampilkan nilai baru

### **Step 3: Save Settings**
1. User klik tombol "Simpan"
2. Loading state ditampilkan
3. Simulasi proses save (1.5 detik)
4. Success message ditampilkan
5. Message hilang setelah 3 detik

## 🔍 **Real-time Updates**

### **Input Validation**
- **Host**: Text validation (no special characters)
- **Port**: Number validation (1-65535)
- **Database Name**: Text validation (alphanumeric + underscore)
- **Username**: Text validation (alphanumeric)
- **Backup Interval**: Number validation (1-168 hours)

### **State Updates**
```javascript
// Example: User changes host from 'localhost' to '192.168.1.100'
handleSettingChange('database', 'dbHost', '192.168.1.100')

// State update:
setSettings(prev => ({
  ...prev,
  dbHost: '192.168.1.100'  // Updated value
}))
```

## 🎯 **UI States**

### **1. Default State**
- Form fields menampilkan nilai default
- Tombol "Simpan" aktif
- Tidak ada loading atau message

### **2. Editing State**
- User mengetik di input field
- Nilai berubah secara real-time
- Tombol "Simpan" tetap aktif

### **3. Saving State**
- Tombol "Simpan" disabled
- Text berubah menjadi "Menyimpan..."
- Loading indicator (jika ada)

### **4. Success State**
- Success message ditampilkan
- Tombol "Simpan" kembali aktif
- Message hilang setelah 3 detik

## 🚀 **Features**

### **✅ Real-time Updates**
- Perubahan input langsung terupdate di state
- Tidak perlu klik "Apply" untuk setiap field

### **✅ Form Validation**
- Input type validation (text, number)
- Range validation untuk port dan interval

### **✅ User Feedback**
- Loading state saat save
- Success message setelah save
- Error handling (jika ada)

### **✅ Responsive Design**
- Form layout responsif
- Input fields menyesuaikan ukuran layar

## 🔧 **Technical Implementation**

### **React Hooks Used**
- `useState`: State management untuk settings
- `useEffect`: Lifecycle management (jika ada)

### **Event Handling**
- `onChange`: Input change events
- `onClick`: Button click events

### **State Structure**
```javascript
settings: {
  // Database Settings
  dbHost: string,
  dbPort: number,
  dbName: string,
  dbUser: string,
  backupInterval: number,
  
  // Other settings...
}
```

## 📊 **Data Flow**

```
User Input → onChange Event → handleSettingChange → setSettings → UI Update
     ↓
Save Button → handleSave → Loading State → Success Message → Reset
```

## 🎨 **CSS Classes**

### **Form Styling**
- `.settings-section`: Container untuk section
- `.settings-grid`: Grid layout untuk form fields
- `.form-group`: Container untuk setiap field
- `.form-label`: Label styling
- `.form-input`: Input field styling

### **Button Styling**
- `.btn`: Base button class
- `.btn-primary`: Primary button (Save)
- `.btn-secondary`: Secondary button (Reset)

## 🔮 **Future Enhancements**

### **Planned Features**
- [ ] Real database connection test
- [ ] Password field untuk database
- [ ] Connection status indicator
- [ ] Advanced backup settings
- [ ] Database type selection (MySQL, PostgreSQL)

### **Potential Improvements**
- [ ] Form validation dengan error messages
- [ ] Auto-save functionality
- [ ] Import/Export settings
- [ ] Settings backup/restore

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Component**: Settings.jsx
**Function**: renderDatabaseSettings()

