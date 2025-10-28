# Database Configuration - IoT Scales V2

## 📋 **Overview**
Dokumentasi konfigurasi database yang benar untuk IoT Scales V2.

## 🎯 **Database Configuration**

### **Primary Database**
- **Database Name**: `FLB_MOWS`
- **Database Type**: PostgreSQL
- **Host**: `localhost`
- **Port**: `5432`
- **Username**: `postgres`
- **Password**: `Admin123`

### **Configuration Files**

#### **1. Database Config (`src/config/database.js`)**
```javascript
const config = {
  development: {
    host: 'localhost',
    port: 5432,
    database: 'FLB_MOWS',
    username: 'postgres',
    password: 'Admin123',
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'FLB_MOWS',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Admin123',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  }
};
```

#### **2. Settings UI (`src/components/Settings.jsx`)**
```javascript
const [settings, setSettings] = useState({
  // Database Settings
  dbHost: 'localhost',
  dbPort: 5432,
  dbName: 'FLB_MOWS',
  dbUser: 'postgres',
  backupInterval: 24,
  // ... other settings
})
```

#### **3. Server Database Config (`src/components/ServerDatabaseConfig.jsx`)**
```javascript
const [newConfig, setNewConfig] = useState({
  name: '',
  host: 'localhost',
  port: 5432,
  database_name: '',
  username: '',
  password: '',
  connection_type: 'postgresql',
  ssl_enabled: false,
  is_active: true
})
```

## 🔧 **Database Schema**

### **Tables Structure**
```sql
-- Master Tables
CREATE TABLE master_tolerance_grouping (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tolerance_min DECIMAL(10,3) NOT NULL,
  tolerance_max DECIMAL(10,3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_product (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) DEFAULT 'g',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_formulation (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_weight DECIMAL(10,3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_user (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Operational Tables
CREATE TABLE work_orders (
  id SERIAL PRIMARY KEY,
  work_order_number VARCHAR(100) UNIQUE NOT NULL,
  sku VARCHAR(100) NOT NULL,
  formula_name VARCHAR(255) NOT NULL,
  operator VARCHAR(100) NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  total_weight DECIMAL(10,3),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weighing_sessions (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER REFERENCES work_orders(id),
  ingredient_name VARCHAR(255) NOT NULL,
  target_weight DECIMAL(10,3) NOT NULL,
  actual_weight DECIMAL(10,3),
  tolerance_min DECIMAL(10,3),
  tolerance_max DECIMAL(10,3),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE barcode_scans (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER REFERENCES work_orders(id),
  barcode VARCHAR(255) NOT NULL,
  scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Import Logging Tables
CREATE TABLE import_logs (
  id SERIAL PRIMARY KEY,
  import_type VARCHAR(50) NOT NULL,
  source VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE server_database_configs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  database_name VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  password_encrypted TEXT NOT NULL,
  connection_type VARCHAR(50) DEFAULT 'postgresql',
  ssl_enabled BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 **Database Setup**

### **1. PostgreSQL Installation**
```bash
# Windows (using Chocolatey)
choco install postgresql

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# macOS (using Homebrew)
brew install postgresql
```

### **2. Database Creation**
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE "FLB_MOWS";

-- Create user (optional)
CREATE USER flb_user WITH PASSWORD 'Admin123';
GRANT ALL PRIVILEGES ON DATABASE "FLB_MOWS" TO flb_user;
```

### **3. Schema Import**
```bash
# Import schema
psql -U postgres -d "FLB_MOWS" -f database/schema.sql
```

## 🔧 **Configuration Management**

### **Environment Variables**
```bash
# .env file
DB_HOST=localhost
DB_PORT=5432
DB_NAME=FLB_MOWS
DB_USER=postgres
DB_PASSWORD=Admin123
DB_DIALECT=postgres
```

### **Connection Pool Settings**
```javascript
// Development
pool: {
  max: 5,
  min: 0,
  acquire: 30000,
  idle: 10000
}

// Production
pool: {
  max: 20,
  min: 5,
  acquire: 30000,
  idle: 10000
}
```

## 📊 **Database Features**

### **✅ Import Logging**
- Track all database import operations
- Monitor success/failure rates
- Error logging and debugging

### **✅ Server Database Config**
- External database connections
- Multiple server configurations
- Encrypted password storage

### **✅ Master Data Management**
- Product management
- Formulation management
- User management
- Tolerance grouping

### **✅ Operational Data**
- Work order tracking
- Weighing session management
- Barcode scanning
- Production history

## 🔍 **Database Monitoring**

### **Connection Status**
```javascript
// Check database connection
const checkConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};
```

### **Performance Monitoring**
```javascript
// Query performance
const startTime = Date.now();
const result = await Model.findAll();
const endTime = Date.now();
console.log(`Query took ${endTime - startTime}ms`);
```

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. Connection Refused**
```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Start PostgreSQL service
sudo systemctl start postgresql
```

#### **2. Database Not Found**
```sql
-- Check if database exists
SELECT datname FROM pg_database WHERE datname = 'FLB_MOWS';

-- Create database if not exists
CREATE DATABASE "FLB_MOWS";
```

#### **3. Permission Denied**
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE "FLB_MOWS" TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

### **Database Backup**
```bash
# Backup database
pg_dump -U postgres -h localhost "FLB_MOWS" > backup.sql

# Restore database
psql -U postgres -h localhost "FLB_MOWS" < backup.sql
```

## 📈 **Performance Optimization**

### **Indexing**
```sql
-- Create indexes for better performance
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_weighing_sessions_work_order ON weighing_sessions(work_order_id);
CREATE INDEX idx_barcode_scans_work_order ON barcode_scans(work_order_id);
```

### **Query Optimization**
```sql
-- Use EXPLAIN to analyze queries
EXPLAIN ANALYZE SELECT * FROM work_orders WHERE status = 'completed';

-- Optimize slow queries
CREATE INDEX idx_work_orders_status_created ON work_orders(status, created_at);
```

## 🔐 **Security**

### **Password Encryption**
```javascript
// Encrypt passwords before storing
const encryptedPassword = encryptPassword(password);

// Decrypt passwords when needed
const decryptedPassword = decryptPassword(encryptedPassword);
```

### **SSL Connection**
```javascript
// Enable SSL for production
const config = {
  host: 'localhost',
  port: 5432,
  database: 'FLB_MOWS',
  username: 'postgres',
  password: 'Admin123',
  dialect: 'postgres',
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
};
```

## 📝 **Best Practices**

### **1. Connection Management**
- Use connection pooling
- Close connections properly
- Handle connection errors

### **2. Data Validation**
- Validate input data
- Use proper data types
- Implement constraints

### **3. Backup Strategy**
- Regular automated backups
- Test backup restoration
- Store backups securely

### **4. Monitoring**
- Monitor connection status
- Track query performance
- Log database errors

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Database**: PostgreSQL
**Schema**: FLB_MOWS

