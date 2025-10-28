# 📊 Import Logging & Server Database Features

## 🎯 Overview

Fitur import logging dan server database configuration telah ditambahkan ke IoT Scales V2 untuk memberikan kemampuan:

1. **Logging Import Database** - Mencatat semua aktivitas import master data
2. **Server Database Import** - Import data dari database server eksternal
3. **Import History UI** - Interface untuk melihat riwayat import
4. **Server Configuration** - Konfigurasi koneksi ke database server

---

## 🗄️ Database Schema Updates

### Tabel Import Logs
```sql
CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_type VARCHAR(50) NOT NULL, -- 'master_product', 'master_formulation', etc.
    source_type VARCHAR(20) NOT NULL, -- 'file', 'server', 'manual'
    source_name VARCHAR(255),
    server_config JSONB,
    total_records INTEGER NOT NULL DEFAULT 0,
    successful_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    error_details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    imported_by UUID NOT NULL REFERENCES master_user(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel Server Database Configurations
```sql
CREATE TABLE server_database_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 5432,
    database_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    connection_type VARCHAR(20) NOT NULL DEFAULT 'postgresql',
    ssl_enabled BOOLEAN DEFAULT FALSE,
    timeout_seconds INTEGER DEFAULT 30,
    max_connections INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES master_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Utility Classes

### ImportLogger (`src/utils/importLogger.js`)
Utility untuk menangani logging import database:

```javascript
// Start import logging
const logId = await importLogger.startImport(
  'master_product',
  'server',
  'Server Import - Config1',
  { server_config_id: 'config_123' }
)

// Update progress
await importLogger.updateImportProgress(
  logId,
  totalRecords,
  successfulRecords,
  failedRecords,
  errors
)

// Complete import
await importLogger.completeImport(logId, success)

// Get import history
const history = await importLogger.getImportHistory(50, 0)

// Get statistics
const stats = await importLogger.getImportStatistics()
```

### ServerDatabaseConfig (`src/utils/serverDatabaseConfig.js`)
Utility untuk konfigurasi server database:

```javascript
// Add configuration
const config = await serverDatabaseConfig.addConfiguration({
  name: 'Production DB',
  host: 'prod-server.com',
  port: 5432,
  database_name: 'production',
  username: 'user',
  password: 'pass',
  connection_type: 'postgresql'
})

// Test connection
const result = await serverDatabaseConfig.testConnection(configId)

// Import from server
const importResult = await serverDatabaseConfig.importFromServer(
  configId,
  'master_product',
  'products'
)
```

---

## 🎨 UI Components

### 1. Import History (`src/components/ImportHistory.jsx`)

**Features:**
- Statistics cards (total imports, successful, failed, records imported)
- Advanced filtering (type, status, source, search)
- Pagination support
- Detailed view modal
- Export functionality

**Usage:**
```jsx
import ImportHistory from './ImportHistory'

<ImportHistory />
```

### 2. Server Database Config (`src/components/ServerDatabaseConfig.jsx`)

**Features:**
- Add/Edit/Delete configurations
- Test connection functionality
- Support multiple database types (PostgreSQL, MySQL, SQL Server)
- SSL configuration
- Password encryption
- Active/Inactive status

**Usage:**
```jsx
import ServerDatabaseConfig from './ServerDatabaseConfig'

<ServerDatabaseConfig />
```

---

## 🔄 Updated Components

### MasterProduct & MasterFormulation
Kedua komponen telah diupdate dengan fitur:

1. **Server Import Button** - Tombol untuk import dari server database
2. **Import Progress** - Progress bar saat import berlangsung
3. **Logging Integration** - Otomatis log semua aktivitas import
4. **Error Handling** - Penanganan error yang comprehensive

**New Features:**
```jsx
// Server import functionality
const handleServerImport = async () => {
  const logId = await importLogger.startImport(
    'master_product',
    'server',
    `Server Import - ${selectedServerConfig}`,
    { server_config_id: selectedServerConfig }
  )
  
  // Import process with logging
  const result = await serverDatabaseConfig.importFromServer(
    selectedServerConfig,
    'master_product',
    'products'
  )
  
  await importLogger.completeImport(logId, result.success)
}
```

### History Component
Updated dengan tab system:

1. **Production History** - Riwayat produksi (existing)
2. **Import History** - Riwayat import database (new)

```jsx
// Tab navigation
<div className="history-tabs">
  <button className={`tab-button ${activeTab === 'production' ? 'active' : ''}`}>
    <Package size={20} />
    Production History
  </button>
  <button className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}>
    <Database size={20} />
    Import History
  </button>
</div>
```

### Settings Component
Updated dengan tab baru:

1. **General** - Pengaturan umum
2. **Scale** - Pengaturan timbangan
3. **Database** - Pengaturan database lokal
4. **Server Database** - Konfigurasi server database (new)
5. **User** - Pengaturan user
6. **Notifications** - Pengaturan notifikasi

---

## 📊 Import History Features

### Statistics Dashboard
- **Total Imports** - Jumlah total import
- **Successful Imports** - Import yang berhasil
- **Failed Imports** - Import yang gagal
- **Records Imported** - Total record yang diimport

### Advanced Filtering
- **Import Type** - master_product, master_formulation, etc.
- **Status** - completed, failed, in_progress, pending
- **Source Type** - file, server, manual
- **Search** - Pencarian berdasarkan nama atau type

### Detailed View
- **Import Information** - Type, source, status
- **Records Information** - Total, successful, failed, success rate
- **Timing Information** - Start time, completion time, duration
- **Error Details** - Error messages jika ada
- **Server Configuration** - Konfigurasi server yang digunakan

---

## 🔧 Server Database Configuration

### Supported Database Types
1. **PostgreSQL** - Default, most common
2. **MySQL** - Popular alternative
3. **SQL Server** - Microsoft SQL Server

### Configuration Options
- **Basic Connection** - Host, port, database name, credentials
- **Security** - SSL enabled/disabled, password encryption
- **Performance** - Timeout settings, max connections
- **Status** - Active/inactive configurations

### Connection Testing
- **Real-time Testing** - Test connection before saving
- **Response Time** - Measure connection speed
- **Error Reporting** - Detailed error messages
- **Validation** - Input validation for all fields

---

## 🚀 Usage Examples

### 1. Setup Server Database Configuration

```javascript
// Navigate to Settings > Server Database
// Click "Add Configuration"
// Fill in connection details:
// - Name: "Production Database"
// - Host: "prod-server.com"
// - Port: 5432
// - Database: "production"
// - Username: "import_user"
// - Password: "secure_password"
// - Type: PostgreSQL
// - SSL: Enabled
// - Active: Yes

// Test connection before saving
// Click "Test Connection" to verify
```

### 2. Import from Server Database

```javascript
// Navigate to Database > Master Product
// Click "Server Import" button
// Select server configuration
// Click "Start Import"
// Monitor progress in real-time
// View results and logs
```

### 3. View Import History

```javascript
// Navigate to History > Import History
// View statistics dashboard
// Filter by type, status, source
// Click "View Detail" for specific import
// Export history if needed
```

---

## 🔒 Security Features

### Password Encryption
- Passwords are encrypted before storage
- Base64 encoding for demo (use proper encryption in production)
- Password visibility toggle in UI

### Access Control
- User-based logging (imported_by field)
- Role-based access to server configurations
- Audit trail for all import activities

### Data Validation
- Input validation for all configuration fields
- Connection testing before saving
- Error handling and reporting

---

## 📈 Performance Considerations

### Logging Performance
- Async logging to prevent UI blocking
- LocalStorage for demo (use database in production)
- Automatic cleanup of old logs (30+ days)

### Import Performance
- Progress tracking for large imports
- Error handling for failed records
- Batch processing support
- Connection pooling for server imports

### UI Performance
- Pagination for large datasets
- Lazy loading of import details
- Real-time progress updates
- Efficient filtering and search

---

## 🛠️ Development Notes

### Demo Implementation
- Uses localStorage for demo purposes
- Simulated import processes
- Mock data generation
- Simulated connection testing

### Production Implementation
- Replace localStorage with database calls
- Implement real database connections
- Add proper encryption for passwords
- Add comprehensive error handling

### Testing
- Test all import scenarios
- Test connection failures
- Test large dataset imports
- Test UI responsiveness

---

## 🎯 Future Enhancements

### Planned Features
1. **Scheduled Imports** - Automated import scheduling
2. **Data Mapping** - Field mapping between databases
3. **Conflict Resolution** - Handle duplicate records
4. **Import Templates** - Save import configurations
5. **Real-time Monitoring** - Live import status dashboard

### Integration Points
1. **API Integration** - REST API for external systems
2. **Webhook Support** - Notify external systems
3. **Data Transformation** - Data format conversion
4. **Validation Rules** - Custom validation logic

---

**🎉 Fitur Import Logging & Server Database Configuration telah berhasil diimplementasikan!**

Semua fitur telah terintegrasi dengan UI yang ada dan siap untuk digunakan. Dokumentasi lengkap tersedia di file ini untuk referensi pengembangan selanjutnya.

