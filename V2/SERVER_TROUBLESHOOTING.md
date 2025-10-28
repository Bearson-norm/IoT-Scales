# Server Troubleshooting Guide

## 🚨 **Error: Port 3001 Already in Use**

### **Problem:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

### **Solution:**

#### **Method 1: Using Scripts (Recommended)**
```bash
# Stop existing server
npm run stop-server

# Start server
npm run start-server
```

#### **Method 2: Manual Process Management**
```bash
# Check what's using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Start server
npm run server
```

#### **Method 3: Using Task Manager**
1. Open Task Manager (Ctrl + Shift + Esc)
2. Go to "Details" tab
3. Find "node.exe" processes
4. End the process using port 3001
5. Start server again

## 🔧 **Alternative Solutions**

### **Change Port (if needed)**
Edit `server.js` line 332:
```javascript
// Change from:
app.listen(PORT, () => {

// To:
app.listen(3002, () => {
```

### **Kill All Node Processes**
```bash
# Kill all node processes (use with caution)
taskkill /IM node.exe /F
```

### **Check Multiple Ports**
```bash
# Check if other ports are available
netstat -ano | findstr :3002
netstat -ano | findstr :3003
```

## 🚀 **Quick Start Commands**

### **Development Mode**
```bash
# Terminal 1: Start API Backend
npm run start-server

# Terminal 2: Start React Dev Server
npm run dev
```

### **Production Mode**
```bash
# Build and start
npm start
```

## 📊 **Server Status Check**

### **Health Check**
```bash
curl http://localhost:3001/api/health
```

### **Test API Endpoints**
```bash
# Test products API
curl http://localhost:3001/api/products

# Test tolerance groupings API
curl http://localhost:3001/api/tolerance-groupings
```

## 🛠️ **Common Issues & Solutions**

### **Issue 1: Database Connection Failed**
```
Error: Database connection error
```
**Solution:**
- Check PostgreSQL is running
- Verify database credentials in `server.js`
- Test connection: `psql -U postgres -d FLB_MOWS`

### **Issue 2: CORS Error**
```
Access to fetch at 'http://localhost:3001/api/products' from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Solution:**
- CORS is already configured in `server.js`
- Make sure server is running on port 3001
- Check browser console for specific errors

### **Issue 3: API Not Responding**
```
Failed to fetch
```
**Solution:**
- Check if server is running: `netstat -ano | findstr :3001`
- Test health endpoint: `curl http://localhost:3001/api/health`
- Check server logs for errors

### **Issue 4: Frontend Can't Connect to API**
```
Error: Failed to load products
```
**Solution:**
- Verify API service URL in `src/services/api.js`
- Check if server is running
- Test API endpoints manually
- Check browser network tab for failed requests

## 🔍 **Debugging Steps**

### **Step 1: Check Server Status**
```bash
# Check if server is running
netstat -ano | findstr :3001

# Test health endpoint
curl http://localhost:3001/api/health
```

### **Step 2: Check Database Connection**
```bash
# Test PostgreSQL connection
psql -U postgres -d FLB_MOWS -c "SELECT 1;"
```

### **Step 3: Check API Endpoints**
```bash
# Test products API
curl http://localhost:3001/api/products

# Test tolerance groupings API
curl http://localhost:3001/api/tolerance-groupings
```

### **Step 4: Check Frontend**
- Open browser developer tools
- Check Console tab for errors
- Check Network tab for failed requests
- Verify API service URL

## 📝 **Server Logs**

### **Start Server with Logs**
```bash
# Start server with verbose logging
DEBUG=* npm run server
```

### **Check Server Logs**
Server logs will show:
- Database connection status
- API request/response logs
- Error details
- Port binding status

## 🎯 **Quick Fixes**

### **Fix 1: Port Already in Use**
```bash
# Kill process using port 3001
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3001') do taskkill /PID %a /F

# Start server
npm run server
```

### **Fix 2: Database Connection Issues**
```bash
# Restart PostgreSQL service
net stop postgresql-x64-13
net start postgresql-x64-13

# Test connection
psql -U postgres -d FLB_MOWS
```

### **Fix 3: Frontend Issues**
```bash
# Clear browser cache
# Hard refresh: Ctrl + Shift + R

# Restart development server
npm run dev
```

## 🚀 **Production Deployment**

### **Environment Variables**
Create `.env` file:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=FLB_MOWS
DB_USER=postgres
DB_PASSWORD=Admin123
PORT=3001
```

### **PM2 Process Manager**
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name "iot-scales-api"

# Monitor
pm2 monit

# Stop
pm2 stop iot-scales-api
```

## 📞 **Support**

If you continue to have issues:

1. **Check Server Logs** - Look for specific error messages
2. **Test API Endpoints** - Use curl or Postman
3. **Check Database** - Verify PostgreSQL is running
4. **Check Ports** - Ensure no conflicts
5. **Restart Services** - Try restarting everything

## 🎉 **Success Indicators**

When everything is working correctly, you should see:

- ✅ Server starts without errors
- ✅ Health check returns `200 OK`
- ✅ API endpoints return data
- ✅ Frontend loads data from API
- ✅ No CORS errors in browser
- ✅ Database queries execute successfully

