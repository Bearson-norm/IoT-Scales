# Docker Deployment Guide - IoT Scales V2

## Overview
This guide explains how to deploy the IoT Scales V2 application using Docker for local development and testing.

## Prerequisites
- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- At least 4GB RAM available for Docker
- Ports 3001, 5432, and 8080 available on your system

## Quick Start

### 1. Clone and Navigate to Project
```bash
cd IoT-Scales/V2
```

### 2. Build and Start Services
```bash
# Build the Docker images
npm run docker:build

# Start all services in detached mode
npm run docker:up
```

### 3. Access the Application
- **Main Application**: http://localhost:3001
- **Database Admin (pgAdmin)**: http://localhost:8080 (optional)
  - Email: admin@iotscales.local
  - Password: admin123

## Available Docker Commands

### Basic Operations
```bash
# Build Docker images
npm run docker:build

# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Restart services
npm run docker:restart

# Clean up (removes volumes and containers)
npm run docker:clean
```

### Manual Docker Commands
```bash
# Build only the application
docker-compose build app

# Start only the database
docker-compose up -d postgres

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f postgres

# Execute commands in running container
docker-compose exec app sh
docker-compose exec postgres psql -U postgres -d FLB_MOWS
```

## Service Architecture

### Services Included
1. **postgres** - PostgreSQL 15 database
2. **app** - IoT Scales application (React + Express)
3. **pgadmin** - Database administration tool (optional)

### Ports
- **3001**: Main application
- **5432**: PostgreSQL database
- **8080**: pgAdmin (when enabled)

### Volumes
- **postgres_data**: Database persistent storage
- **app_logs**: Application logs
- **uploads**: File uploads directory

## Environment Configuration

### Database Configuration
The application uses the following default database settings:
- **Host**: postgres (Docker service name)
- **Port**: 5432
- **Database**: FLB_MOWS
- **Username**: postgres
- **Password**: Admin123

### Application Configuration
- **NODE_ENV**: production
- **PORT**: 3001
- **DB_HOST**: postgres

## Database Initialization

The database schema is automatically initialized when the PostgreSQL container starts for the first time. The schema file (`database/schema.sql`) is mounted and executed during container initialization.

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :3001
netstat -ano | findstr :5432

# Stop conflicting services or change ports in docker-compose.yml
```

#### 2. Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U postgres -d FLB_MOWS -c "SELECT 1;"
```

#### 3. Application Won't Start
```bash
# Check application logs
docker-compose logs app

# Check health endpoint
curl http://localhost:3001/api/health
```

#### 4. Permission Issues (Linux/Mac)
```bash
# Fix uploads directory permissions
sudo chown -R $USER:$USER uploads/
```

### Reset Everything
```bash
# Stop and remove all containers, networks, and volumes
npm run docker:clean

# Rebuild and start fresh
npm run docker:build
npm run docker:up
```

## Development Workflow

### Making Changes
1. Make your code changes
2. Rebuild the application: `npm run docker:build app`
3. Restart the app service: `docker-compose restart app`

### Database Changes
1. Update `database/schema.sql`
2. Recreate the database: `docker-compose down -v && npm run docker:up`

### Adding Dependencies
1. Update `package.json`
2. Rebuild: `npm run docker:build`
3. Restart: `docker-compose restart app`

## Production Considerations

### Security
- Change default database passwords
- Use environment variables for sensitive data
- Enable SSL/TLS for database connections
- Implement proper authentication

### Performance
- Configure PostgreSQL for production workloads
- Set up proper logging and monitoring
- Implement backup strategies
- Use reverse proxy (nginx) for production

### Scaling
- Use external PostgreSQL database
- Implement load balancing
- Set up container orchestration (Kubernetes)

## Monitoring

### Health Checks
- Application: http://localhost:3001/api/health
- Database: Built-in PostgreSQL health check

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f postgres
```

## Backup and Restore

### Backup Database
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres FLB_MOWS > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U postgres FLB_MOWS < backup.sql
```

### Backup Volumes
```bash
# Backup postgres data
docker run --rm -v iot-scales-v2_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

## Support

For issues related to Docker deployment:
1. Check the logs: `npm run docker:logs`
2. Verify all services are running: `docker-compose ps`
3. Test health endpoints
4. Check this documentation for common solutions

For application-specific issues, refer to the main project documentation.

## 🔌 Serial Port (RS232) Configuration

### Overview
The IoT Scales application requires access to serial ports (RS232) to communicate with weighing scales. Configuring serial port access in Docker requires special considerations depending on your operating system.

### Prerequisites
- **Linux**: Native device access support
- **Windows**: Requires WSL2 backend in Docker Desktop
- **macOS**: Native device access support

### Configuration Options

#### Option 1: Device Mapping (Recommended for Linux/macOS)

Edit `docker-compose.yml` and uncomment the `devices` section:

```yaml
devices:
  - /dev/ttyUSB0:/dev/ttyUSB0  # For USB serial adapter
  - /dev/ttyACM0:/dev/ttyACM0  # For USB CDC device
```

**Find your serial port:**
```bash
# Linux/macOS
ls -la /dev/tty* | grep -E "(USB|ACM|S)"

# Common ports:
# /dev/ttyUSB0 - USB to Serial adapter
# /dev/ttyACM0 - USB CDC device
# /dev/ttyS0   - Serial port
```

#### Option 2: Privileged Mode (Easiest but Less Secure)

Edit `docker-compose.yml` and uncomment:

```yaml
privileged: true
```

⚠️ **Security Warning**: This gives the container extensive host access. Use only in development or trusted environments.

#### Option 3: Windows with WSL2

1. **Enable WSL2 Backend in Docker Desktop:**
   - Open Docker Desktop → Settings → General
   - Check "Use the WSL 2 based engine"

2. **Map COM port in docker-compose.yml:**
   ```yaml
   devices:
     - /dev/ttyS10:/dev/ttyS10  # For COM10 (adjust number as needed)
   ```

3. **Set environment variable:**
   ```yaml
   environment:
     SCALE_PORT: COM10  # Match your COM port
   ```

#### Option 4: Device CGroup Rules (Most Flexible)

Edit `docker-compose.yml`:

```yaml
device_cgroup_rules:
  - 'c *:* rmw'
```

This allows access to all devices but is the least secure option.

### Environment Variables

Configure the serial port via environment variable:

```yaml
environment:
  SCALE_PORT: ${SCALE_PORT:-COM1}  # Defaults to COM1 if not set
```

Or create a `.env` file:
```bash
SCALE_PORT=COM10
```

### Verification

After starting the container, verify serial port access:

```bash
# Check if device is accessible inside container
docker-compose exec app ls -la /dev/tty*

# Test scale reading endpoint
curl http://localhost:3001/api/scale/read

# Check container logs
docker-compose logs app | grep -i scale
```

### Troubleshooting Serial Port Access

#### Problem: "Cannot open port" error

**Solutions:**
1. **Check device permissions:**
   ```bash
   # Linux: Add user to dialout group
   sudo usermod -aG dialout $USER
   # Restart Docker after this change
   ```

2. **Verify device exists:**
   ```bash
   # Host
   ls -la /dev/ttyUSB0
   
   # Container
   docker-compose exec app ls -la /dev/ttyUSB0
   ```

3. **Check Docker Desktop settings:**
   - Windows: Ensure WSL2 backend is enabled
   - Linux: Ensure user is in `docker` group

#### Problem: Permission denied

**Solution:** Use privileged mode or fix device permissions:
```bash
# Host (Linux)
sudo chmod 666 /dev/ttyUSB0

# Or add udev rules for permanent fix:
sudo nano /etc/udev/rules.d/99-serial.rules
# Add: KERNEL=="ttyUSB*", MODE="0666"
```

#### Problem: Device not found in container

**Solutions:**
1. **Verify device mapping:**
   ```bash
   docker-compose config | grep -A 5 devices
   ```

2. **Check if device is available on host:**
   ```bash
   ls -la /dev/tty* | grep USB
   ```

3. **Try privileged mode temporarily to test**

### Production Considerations

For production deployments:

1. **Use specific device mapping** (not privileged mode)
2. **Set up udev rules** for consistent device naming
3. **Use device serial numbers** for reliable identification
4. **Monitor device availability** and handle disconnections gracefully
5. **Implement device hotplug detection** if needed

### Example Production Configuration

```yaml
devices:
  - /dev/serial/by-id/usb-FTDI_FT232R_USB_UART_XXXXXXXX-if00-port0:/dev/ttyUSB0
environment:
  SCALE_PORT: /dev/ttyUSB0
```

This uses device by ID, which remains consistent even if the physical USB port changes.

## 🚀 Quick Start with Serial Port

### Step 1: Configure Serial Port Access

Edit `docker-compose.yml` and choose one of the options above (recommended: Option 1 for Linux, Option 2 for Windows).

### Step 2: Set Serial Port Environment Variable

Create `.env` file:
```bash
SCALE_PORT=COM10  # or /dev/ttyUSB0 for Linux
```

### Step 3: Build and Start

```bash
# Build with serialport support
npm run docker:build

# Start services
npm run docker:up

# Verify serial port access
docker-compose exec app ls -la /dev/tty*
```

### Step 4: Configure in UI

1. Access application: http://localhost:3001
2. Go to Settings → Scale Configuration
3. Set the correct port and baud rate
4. Test connection using "Test Scale Reading" button



