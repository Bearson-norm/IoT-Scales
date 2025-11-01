# Vibra Scale RS232 Reader (Node.js)

Realtime reader untuk timbangan Vibra via RS232 menggunakan Node.js.

Konfigurasi: baud 9600, data bits 8, stop bits 2, parity none, parsing 7 digit numerik.

## Fitur
- RS232 reader (SerialPort) dengan 9600-8N2
- Parsing 7 digit numerik → kg (g/1000)
- WebSocket broadcast untuk realtime UI
- REST API: list ports, connect, disconnect, status
- UI sederhana di `public/index.html`

## Cara Menjalankan (Windows/Mac/Linux)
1. Install Node.js v16+
2. Install dependencies:
   ```bash
   npm install
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
4. Buka UI:
   - `http://localhost:3000`
5. Pilih port, klik Connect. Berat akan tampil realtime.

## Endpoint
- GET `/api/ports` → daftar port
- POST `/api/connect` `{ path }`
- POST `/api/disconnect`
- GET `/api/status`

## Catatan
- Pastikan driver USB-serial terpasang (cek Device Manager → Ports (COM & LPT))
- Jika data tidak terbaca, cek format output timbangan. Default parser mencari 7 digit numerik berturut-turut.
- Threshold stabilitas: 0.001 kg (dapat diubah di server jika perlu)

Lisensi: MIT
