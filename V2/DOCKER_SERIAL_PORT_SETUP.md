# 🔌 Docker Serial Port Setup - Quick Guide

## Quick Setup untuk Windows

### 1. Pastikan Docker Desktop Menggunakan WSL2 Backend

1. Buka Docker Desktop
2. Settings → General
3. Centanglah **"Use the WSL 2 based engine"**
4. Klik "Apply & Restart"

### 2. Edit `docker-compose.yml`

Buka `docker-compose.yml` dan uncomment salah satu opsi berikut:

**Opsi A: Privileged Mode (Paling Mudah)**
```yaml
app:
  # ... other config ...
  privileged: true  # Uncomment baris ini
```

**Opsi B: Device Mapping (Lebih Aman)**
```yaml
app:
  # ... other config ...
  devices:
    - /dev/ttyS10:/dev/ttyS10  # Ganti 10 dengan nomor COM port Anda (COM10$
```

### 3. Buat File `.env`

Buat file `.env` di root project:
```bash
SCALE_PORT=COM10
```

Ganti `COM10` dengan COM port yang benar (cek di Device Manager).

### 4. Build dan Start

```bash
npm run docker:build
npm run docker:up
```

### 5. Verifikasi

```bash
# Test endpoint
curl http://localhost:3001/api/scale/read

# Atau buka browser
# http://localhost:3001 → Settings → Scale Configuration
```

---

## Quick Setup untuk Linux

### 1. Cari Serial Port Anda

```bash
ls -la /dev/tty* | grep -E "(USB|ACM|S)"
```

Contoh output:
- `/dev/ttyUSB0` - USB to Serial adapter
- `/dev/ttyACM0` - USB CDC device

### 2. Edit `docker-compose.yml`

```yaml
app:
  # ... other config ...
  devices:
    - /dev/ttyUSB0:/dev/ttyUSB0  # Sesuaikan dengan port Anda
```

### 3. Buat File `.env`

```bash
SCALE_PORT=/dev/ttyUSB0
```

### 4. Build dan Start

```bash
npm run docker:build
npm run docker:up
```

---

## Troubleshooting

### Error: "Cannot open port"

**Windows:**
- Pastikan WSL2 backend aktif
- Cek COM port di Device Manager
- Coba gunakan `privileged: true` terlebih dahulu

**Linux:**
- Pastikan user ada di group `dialout`:
  ```bash
  sudo usermod -aG dialout $USER
  # Logout dan login lagi
  ```
- Atau gunakan `privileged: true` untuk testing

### Device tidak ditemukan di container

```bash
# Cek apakah device ada di host
ls -la /dev/ttyUSB0

# Cek apakah device ada di container
docker-compose exec app ls -la /dev/ttyUSB0
```

### Permission denied

```bash
# Linux: Berikan permission
sudo chmod 666 /dev/ttyUSB0

# Atau gunakan privileged mode
```

---

## Catatan Penting

1. **Windows**: Docker Desktop harus menggunakan WSL2 backend untuk akses serial port
2. **Privileged Mode**: Lebih mudah tetapi kurang aman. Gunakan hanya untuk development.
3. **Production**: Gunakan device mapping spesifik, bukan privileged mode.
4. **COM Port**: Di Windows, COM10+ mungkin perlu di-normalize (sudah di-handle di code).

---

Untuk dokumentasi lengkap, lihat `DOCKER_DEPLOYMENT.md` bagian "Serial Port (RS232) Configuration".

