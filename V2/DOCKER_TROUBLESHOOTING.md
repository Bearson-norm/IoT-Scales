# Docker Desktop Troubleshooting Guide

## Error: Docker Desktop Not Running

If you encounter this error:
```
error during connect: Head "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/_ping": open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

This means Docker Desktop is not running on your Windows system.

## Solutions

### 1. Start Docker Desktop
1. **Find Docker Desktop** in your Start menu or desktop
2. **Double-click** to launch Docker Desktop
3. **Wait** for Docker to fully start (you'll see a whale icon in system tray)
4. **Verify** Docker is running by opening Command Prompt and running:
   ```cmd
   docker --version
   ```

### 2. Check Docker Desktop Status
- Look for the **Docker whale icon** in your system tray (bottom-right corner)
- If the icon is **gray/red**, Docker is not running
- If the icon is **blue/white**, Docker is running

### 3. Restart Docker Desktop
If Docker Desktop is running but still having issues:
1. **Right-click** the Docker whale icon in system tray
2. Select **"Restart Docker Desktop"**
3. Wait for it to restart completely

### 4. Check Windows Features
Make sure these Windows features are enabled:
1. Open **Control Panel** → **Programs** → **Turn Windows features on or off**
2. Ensure these are checked:
   - ✅ **Hyper-V** (if available)
   - ✅ **Windows Subsystem for Linux**
   - ✅ **Virtual Machine Platform**

### 5. Alternative: Use Docker Toolbox (Legacy)
If Docker Desktop doesn't work, you can use Docker Toolbox:
1. Download Docker Toolbox from Docker website
2. Install and run Docker Quickstart Terminal
3. Use the same commands

## Quick Fix Commands

### Check Docker Status
```cmd
docker --version
docker info
```

### Test Docker Connection
```cmd
docker run hello-world
```

### If Docker Desktop is Running but Still Errors
```cmd
# Restart Docker service
net stop com.docker.service
net start com.docker.service

# Or restart Docker Desktop completely
taskkill /f /im "Docker Desktop.exe"
# Then restart Docker Desktop manually
```

## After Docker Desktop is Running

Once Docker Desktop is running, you can proceed with the deployment:

```cmd
# Build the images
npm run docker:build

# Start the services
npm run docker:up

# Check status
docker-compose ps
```

## Common Issues and Solutions

### Issue: "Docker Desktop is starting..."
**Solution**: Wait for Docker Desktop to fully start. This can take 1-2 minutes.

### Issue: "WSL 2 installation is incomplete"
**Solution**: 
1. Download WSL 2 from Microsoft Store
2. Restart Docker Desktop
3. Or enable WSL 2 in Windows Features

### Issue: "Hyper-V is not enabled"
**Solution**:
1. Enable Hyper-V in Windows Features
2. Restart computer
3. Restart Docker Desktop

### Issue: "Port already in use"
**Solution**:
```cmd
# Check what's using port 3001
netstat -ano | findstr :3001

# Kill the process if needed
taskkill /PID <process_id> /F
```

## Verification Steps

After Docker Desktop is running, verify everything works:

1. **Check Docker is running**:
   ```cmd
   docker --version
   ```

2. **Test Docker**:
   ```cmd
   docker run hello-world
   ```

3. **Build your project**:
   ```cmd
   npm run docker:build
   ```

4. **Start services**:
   ```cmd
   npm run docker:up
   ```

5. **Check services are running**:
   ```cmd
   docker-compose ps
   ```

6. **Access your application**:
   - Open browser to http://localhost:3001

## Still Having Issues?

If you're still having problems:

1. **Check Docker Desktop logs**:
   - Right-click Docker whale icon → Troubleshoot
   - Check the logs for specific errors

2. **Try Docker Desktop reset**:
   - Docker Desktop → Settings → Reset to factory defaults

3. **Reinstall Docker Desktop**:
   - Uninstall current version
   - Download latest from docker.com
   - Install fresh

4. **Use alternative deployment**:
   - You can still run the project without Docker using:
   ```cmd
   npm install
   npm run build
   npm run server
   ```

## Need Help?

If you continue to have issues:
1. Check Docker Desktop documentation
2. Visit Docker Community forums
3. Ensure your Windows version supports Docker Desktop
4. Consider using Docker Toolbox as alternative



