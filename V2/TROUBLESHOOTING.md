# 🔧 Troubleshooting Guide - IoT Scales V2

## 📋 Daftar Isi
1. [Database Setup Issues](#database-setup-issues)
2. [Application Issues](#application-issues)
3. [Hardware Issues](#hardware-issues)
4. [Network Issues](#network-issues)
5. [Performance Issues](#performance-issues)
6. [Common Solutions](#common-solutions)

---

## 🗄️ Database Setup Issues

### ❌ Problem: Database Does Not Exist
**Error Message:**
```
psql: error: connection to server at "localhost" (::1), port 5432 failed: FATAL: database "FLB_MOWS" does not exist
```

**✅ Solutions:**
```bash
# Method 1: Quick Fix
psql -U postgres -c "DROP DATABASE IF EXISTS flb_mows;"
psql -U postgres -c "DROP DATABASE IF EXISTS FLB_MOWS;"
psql -U postgres -c "CREATE DATABASE \"FLB_MOWS\";"
psql -U postgres -d FLB_MOWS -f database/schema.sql

# Method 2: Use Setup Script
setup.bat
```

### ❌ Problem: Case Sensitivity Issue
**Error Message:**
```
ERROR: database "flb_mows" already exists
FATAL: database "FLB_MOWS" does not exist
```

**✅ Solutions:**
```bash
# Drop all variations and recreate
psql -U postgres -c "DROP DATABASE IF EXISTS flb_mows;"
psql -U postgres -c "DROP DATABASE IF EXISTS FLB_MOWS;"
psql -U postgres -c "CREATE DATABASE \"FLB_MOWS\";"
```

### ❌ Problem: PostgreSQL Connection Failed
**Error Message:**
```
psql: error: connection to server at "localhost" (::1), port 5432 failed
```

**✅ Solutions:**

1. **Check PostgreSQL Service:**
   ```bash
   # Windows Services
   services.msc
   # Look for "postgresql" service and ensure it's running
   ```

2. **Start PostgreSQL Service:**
   ```bash
   # Windows Command Prompt (as Administrator)
   net start postgresql-x64-14
   # or
   net start postgresql
   ```

3. **Check PostgreSQL Installation:**
   ```bash
   psql --version
   ```

### ❌ Problem: Permission Denied
**Error Message:**
```
ERROR: permission denied to create database
```

**✅ Solutions:**
1. **Run as Administrator:**
   - Right-click Command Prompt
   - Select "Run as administrator"

2. **Grant Permissions:**
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres
   
   -- Grant permissions
   GRANT ALL PRIVILEGES ON DATABASE FLB_MOWS TO your_username;
   ```

### ❌ Problem: Schema Import Failed
**Error Message:**
```
psql: error: could not read file "database/schema.sql"
```

**✅ Solutions:**
1. **Check File Path:**
   ```bash
   dir database\schema.sql
   ```

2. **Use Absolute Path:**
   ```bash
   psql -U postgres -d FLB_MOWS -f "C:\full\path\to\database\schema.sql"
   ```

---

## 🚀 Application Issues

### ❌ Problem: Port 3000 Already in Use
**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**✅ Solutions:**
1. **Kill Process Using Port 3000:**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID_NUMBER> /F
   ```

2. **Use Different Port:**
   ```bash
   # Edit vite.config.js
   server: {
     port: 3001,  // Change to different port
     host: true
   }
   ```

### ❌ Problem: Dependencies Install Failed
**Error Message:**
```
npm ERR! code ENOENT
npm ERR! syscall open
```

**✅ Solutions:**
1. **Clear Cache and Reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Update npm:**
   ```bash
   npm install -g npm@latest
   ```

3. **Use Yarn Instead:**
   ```bash
   npm install -g yarn
   yarn install
   ```

### ❌ Problem: Build Failed
**Error Message:**
```
npm run build failed
```

**✅ Solutions:**
1. **Check Node.js Version:**
   ```bash
   node --version
   # Should be 18.x or higher
   ```

2. **Clear Build Cache:**
   ```bash
   rm -rf dist node_modules/.vite
   npm run build
   ```

---

## 🔌 Hardware Issues

### ❌ Problem: Scale Not Detected
**✅ Solutions:**
1. **Check Serial Port:**
   ```bash
   # Windows Device Manager
   # Look for COM ports under "Ports (COM & LPT)"
   ```

2. **Install Drivers:**
   - Install scale manufacturer drivers
   - Check scale documentation for driver requirements

3. **Test Connection:**
   ```bash
   # Use serial terminal software like PuTTY
   # Connect to COM port and test communication
   ```

### ❌ Problem: Barcode Scanner Not Working
**✅ Solutions:**
1. **Check USB Connection:**
   - Ensure scanner is properly connected
   - Try different USB port

2. **Install Scanner Drivers:**
   - Install manufacturer drivers
   - Check Windows Device Manager for unrecognized devices

3. **Test Scanner:**
   - Open Notepad and scan a barcode
   - Check if characters appear in text editor

### ❌ Problem: Camera Not Working
**✅ Solutions:**
1. **Check Camera Permissions:**
   - Browser settings > Privacy > Camera
   - Allow camera access for localhost

2. **Test Camera:**
   ```bash
   # Open browser console and test
   navigator.mediaDevices.getUserMedia({ video: true })
   ```

---

## 🌐 Network Issues

### ❌ Problem: Database Connection Timeout
**✅ Solutions:**
1. **Check Firewall:**
   ```bash
   # Windows Firewall
   # Allow PostgreSQL through firewall
   ```

2. **Check PostgreSQL Configuration:**
   ```bash
   # Edit postgresql.conf
   listen_addresses = '*'
   port = 5432
   ```

3. **Check pg_hba.conf:**
   ```bash
   # Add local connection
   local   all             all                                     trust
   host    all             all             127.0.0.1/32            trust
   ```

### ❌ Problem: CORS Issues
**Error Message:**
```
Access to fetch at 'localhost:3000' from origin 'localhost:3001' has been blocked by CORS policy
```

**✅ Solutions:**
1. **Configure CORS in vite.config.js:**
   ```javascript
   server: {
     cors: true,
     origin: ['http://localhost:3000', 'http://localhost:3001']
   }
   ```

---

## ⚡ Performance Issues

### ❌ Problem: Application Running Slow
**✅ Solutions:**
1. **Check System Resources:**
   - Monitor CPU and RAM usage
   - Close unnecessary applications

2. **Optimize Database:**
   ```sql
   -- Analyze database performance
   ANALYZE;
   
   -- Check for slow queries
   SELECT * FROM pg_stat_activity;
   ```

3. **Clear Browser Cache:**
   - Clear browser cache and cookies
   - Try different browser

### ❌ Problem: Memory Leaks
**✅ Solutions:**
1. **Check for Memory Leaks:**
   ```bash
   # Browser Developer Tools > Memory tab
   # Take heap snapshots
   ```

2. **Optimize React Components:**
   ```javascript
   // Use React.memo for expensive components
   const ExpensiveComponent = React.memo(({ data }) => {
     // component logic
   });
   ```

---

## 🔧 Common Solutions

### 🚀 Quick Fixes:
1. **Restart Services:**
   ```bash
   # Restart PostgreSQL
   net stop postgresql
   net start postgresql
   ```

2. **Clear and Reinstall:**
   ```bash
   # Clear node modules
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Logs:**
   ```bash
   # PostgreSQL logs
   # Windows: C:\Program Files\PostgreSQL\14\data\log\
   ```

### 🔄 Emergency Reset:
```bash
# Complete reset (WARNING: This will delete all data)
psql -U postgres -c "DROP DATABASE IF EXISTS FLB_MOWS;"
psql -U postgres -c "CREATE DATABASE \"FLB_MOWS\";"
psql -U postgres -d FLB_MOWS -f database/schema.sql
```

### 📊 System Requirements Check:
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check PostgreSQL version
psql --version

# Check available memory
systeminfo | findstr "Total Physical Memory"
```

---

## 🆘 Getting Help

### 📋 Before Asking for Help:
1. **Check Logs:**
   - Application console logs
   - PostgreSQL logs
   - Windows Event Viewer

2. **Gather Information:**
   - Error messages (full text)
   - System specifications
   - Steps to reproduce

3. **Try Common Solutions:**
   - Restart services
   - Clear cache
   - Check permissions

### 📞 Contact Support:
- **Email:** support@presisitech.com
- **Include:**
  - Error messages
  - System information
  - Steps already tried

### 📚 Documentation:
- **Setup Guide:** `SETUP_GUIDE.md`
- **Quick Start:** `QUICK_START.md`
- **Database Schema:** `database/schema.sql`

---

## 🎯 Prevention Tips

### ✅ Best Practices:
1. **Regular Backups:**
   ```bash
   # Backup database regularly
   pg_dump -U postgres -d FLB_MOWS > backup_$(date +%Y%m%d).sql
   ```

2. **Monitor Resources:**
   - Check disk space
   - Monitor memory usage
   - Watch for slow queries

3. **Keep Updated:**
   - Update Node.js regularly
   - Update PostgreSQL patches
   - Update application dependencies

4. **Test Changes:**
   - Test in development first
   - Backup before major changes
   - Document configuration changes

---

**🔧 Remember: Most issues can be resolved by restarting services, clearing cache, or checking permissions!**