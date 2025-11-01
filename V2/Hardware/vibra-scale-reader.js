class VibraScaleReader {
    constructor() {
        this.serialPort = null;
        this.reader = null;
        this.isConnected = false;
        this.isReading = false;
        this.dataBuffer = '';
        this.lastWeight = 0;
        this.stableCount = 0;
        this.dataCount = 0;
        this.startTime = null;
        this.updateInterval = 100; // ms
        this.decimalPlaces = 6;
        this.stabilityThreshold = 0.001;
        this.currentUnit = 'kg';
        
        this.initializeElements();
        this.setupEventListeners();
        this.updatePorts();
        this.startUptimeCounter();
    }

    initializeElements() {
        // Connection elements
        this.portSelect = document.getElementById('port-select');
        this.refreshPortsBtn = document.getElementById('refresh-ports');
        this.connectBtn = document.getElementById('connect-btn');
        this.disconnectBtn = document.getElementById('disconnect-btn');
        this.connectionIndicator = document.getElementById('connection-indicator');
        this.connectionText = document.getElementById('connection-text');
        this.currentPortSpan = document.getElementById('current-port');

        // Weight display elements
        this.weightValue = document.getElementById('weight-value');
        this.weightStatus = document.getElementById('weight-status');
        this.lastUpdateSpan = document.getElementById('last-update');

        // Log elements
        this.logContainer = document.getElementById('log-container');
        this.clearLogBtn = document.getElementById('clear-log');
        this.exportLogBtn = document.getElementById('export-log');
        this.autoScrollCheckbox = document.getElementById('auto-scroll');

        // Settings elements
        this.updateIntervalInput = document.getElementById('update-interval');
        this.decimalPlacesInput = document.getElementById('decimal-places');
        this.stabilityThresholdInput = document.getElementById('stability-threshold');
        this.unitSelect = document.getElementById('unit-select');

        // Status elements
        this.dataRateSpan = document.getElementById('data-rate');
        this.uptimeSpan = document.getElementById('uptime');

        // Modal elements
        this.errorModal = document.getElementById('error-modal');
        this.errorMessage = document.getElementById('error-message');
        this.errorOkBtn = document.getElementById('error-ok');
        this.closeBtn = document.querySelector('.close-btn');
    }

    setupEventListeners() {
        // Connection events
        this.refreshPortsBtn.addEventListener('click', () => this.updatePorts());
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        
        // Add request port button event
        const requestPortBtn = document.getElementById('request-port');
        if (requestPortBtn) {
            requestPortBtn.addEventListener('click', () => this.requestNewPort());
        }

        // Log events
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        this.exportLogBtn.addEventListener('click', () => this.exportLog());

        // Settings events
        this.updateIntervalInput.addEventListener('change', (e) => {
            this.updateInterval = parseInt(e.target.value);
        });
        this.decimalPlacesInput.addEventListener('change', (e) => {
            this.decimalPlaces = parseInt(e.target.value);
        });
        this.stabilityThresholdInput.addEventListener('change', (e) => {
            this.stabilityThreshold = parseFloat(e.target.value);
        });
        this.unitSelect.addEventListener('change', (e) => {
            this.currentUnit = e.target.value;
            this.updateWeightDisplay();
        });

        // Modal events
        this.errorOkBtn.addEventListener('click', () => this.hideError());
        this.closeBtn.addEventListener('click', () => this.hideError());
        this.errorModal.addEventListener('click', (e) => {
            if (e.target === this.errorModal) {
                this.hideError();
            }
        });
    }

    async updatePorts() {
        try {
            if (!navigator.serial) {
                throw new Error('Web Serial API tidak didukung oleh browser ini. Gunakan Chrome/Edge versi terbaru.');
            }

            // Request permission untuk mengakses port serial
            const ports = await navigator.serial.getPorts();
            this.portSelect.innerHTML = '<option value="">Pilih Port COM...</option>';
            
            if (ports.length === 0) {
                this.portSelect.innerHTML = '<option value="">Klik "Request Port" untuk memilih port</option>';
                this.addLogEntry('No Ports', 'Tidak ada port yang sudah diizinkan. Klik "Request Port".', 'INFO');
            } else {
                ports.forEach(port => {
                    const option = document.createElement('option');
                    option.value = port.path || port.portName;
                    option.textContent = port.path || port.portName;
                    this.portSelect.appendChild(option);
                });
            }
        } catch (error) {
            this.showError('Error saat mengambil daftar port: ' + error.message);
        }
    }

    async requestNewPort() {
        try {
            if (!navigator.serial) {
                throw new Error('Web Serial API tidak didukung oleh browser ini.');
            }

            // Request permission untuk port baru
            const port = await navigator.serial.requestPort();
            
            // Tambahkan ke dropdown
            const option = document.createElement('option');
            option.value = port.path || port.portName;
            option.textContent = port.path || port.portName;
            option.selected = true;
            this.portSelect.appendChild(option);
            
            this.addLogEntry('Port Added', `Port ${port.path || port.portName} berhasil ditambahkan`, 'SUCCESS');
            
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                this.showError('Permission ditolak. Silakan coba lagi dan izinkan akses port serial.');
            } else {
                this.showError('Error saat request port: ' + error.message);
            }
        }
    }

    async connect() {
        const selectedPort = this.portSelect.value;
        if (!selectedPort) {
            this.showError('Pilih port COM terlebih dahulu atau klik "Request Port"');
            return;
        }

        try {
            if (!navigator.serial) {
                throw new Error('Web Serial API tidak didukung');
            }

            // Get the selected port from the list of granted ports
            const ports = await navigator.serial.getPorts();
            this.serialPort = ports.find(port => (port.path || port.portName) === selectedPort);
            
            if (!this.serialPort) {
                throw new Error('Port tidak ditemukan. Silakan request port lagi.');
            }
            
            // Configure port dengan spesifikasi Vibra scale
            await this.serialPort.open({
                baudRate: 9600,
                dataBits: 8,
                stopBits: 2,
                parity: 'none',
                flowControl: 'none'
            });

            this.reader = this.serialPort.readable.getReader();
            this.isConnected = true;
            this.startTime = Date.now();
            this.dataCount = 0;

            this.updateConnectionStatus(true);
            this.startReading();
            this.addLogEntry('Connected', `Connected to ${selectedPort}`, 'CONNECT');

        } catch (error) {
            this.showError('Error saat koneksi: ' + error.message);
        }
    }

    async disconnect() {
        try {
            this.isReading = false;
            
            if (this.reader) {
                await this.reader.cancel();
                this.reader = null;
            }
            
            if (this.serialPort) {
                await this.serialPort.close();
                this.serialPort = null;
            }

            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.addLogEntry('Disconnected', 'Disconnected from scale', 'DISCONNECT');

        } catch (error) {
            this.showError('Error saat disconnect: ' + error.message);
        }
    }

    async startReading() {
        if (!this.isConnected || !this.reader) return;

        this.isReading = true;
        
        try {
            while (this.isReading && this.reader) {
                const { value, done } = await this.reader.read();
                
                if (done) {
                    break;
                }

                // Convert Uint8Array to string
                const data = new TextDecoder().decode(value);
                this.dataBuffer += data;
                
                // Process complete lines
                this.processDataBuffer();
                
                // Update data rate
                this.dataCount++;
                this.updateDataRate();
            }
        } catch (error) {
            if (this.isReading) {
                this.showError('Error saat membaca data: ' + error.message);
            }
        }
    }

    processDataBuffer() {
        const lines = this.dataBuffer.split('\n');
        
        // Keep the last incomplete line in buffer
        this.dataBuffer = lines.pop() || '';
        
        lines.forEach(line => {
            if (line.trim()) {
                this.processWeightData(line.trim());
            }
        });
    }

    processWeightData(rawData) {
        try {
            // Extract numeric data (7 digits as specified)
            const numericMatch = rawData.match(/\d{7}/);
            if (!numericMatch) {
                this.addLogEntry('Invalid Data', rawData, 'ERROR');
                return;
            }

            const numericValue = numericMatch[0];
            
            // Convert to weight (assuming the scale sends weight in grams)
            // Adjust this conversion based on your scale's actual data format
            let weight = parseFloat(numericValue) / 1000; // Convert to kg
            
            // Apply unit conversion
            weight = this.convertWeight(weight, 'kg', this.currentUnit);
            
            // Check stability
            const isStable = Math.abs(weight - this.lastWeight) < this.stabilityThreshold;
            
            if (isStable) {
                this.stableCount++;
            } else {
                this.stableCount = 0;
            }

            this.lastWeight = weight;
            
            // Update display
            this.updateWeightDisplay(weight, isStable);
            
            // Add to log
            this.addLogEntry(weight.toFixed(this.decimalPlaces), rawData, isStable ? 'STABLE' : 'UNSTABLE');

        } catch (error) {
            this.addLogEntry('Parse Error', rawData, 'ERROR');
        }
    }

    convertWeight(weight, fromUnit, toUnit) {
        if (fromUnit === toUnit) return weight;
        
        // Convert to kg first
        let weightInKg = weight;
        if (fromUnit === 'g') weightInKg = weight / 1000;
        if (fromUnit === 'lb') weightInKg = weight * 0.453592;
        
        // Convert to target unit
        if (toUnit === 'g') return weightInKg * 1000;
        if (toUnit === 'lb') return weightInKg / 0.453592;
        return weightInKg;
    }

    updateWeightDisplay(weight = this.lastWeight, isStable = true) {
        this.weightValue.textContent = weight.toFixed(this.decimalPlaces);
        this.weightStatus.textContent = isStable ? 'Stabil' : 'Tidak Stabil';
        this.lastUpdateSpan.textContent = new Date().toLocaleTimeString();
        
        // Update status color
        this.weightStatus.className = isStable ? 'value stable' : 'value unstable';
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        this.connectionIndicator.className = `status-indicator ${connected ? 'connected' : 'disconnected'}`;
        this.connectionText.textContent = connected ? 'Connected' : 'Disconnected';
        this.connectBtn.disabled = connected;
        this.disconnectBtn.disabled = !connected;
        this.currentPortSpan.textContent = connected ? this.portSelect.value : '-';
    }

    addLogEntry(weight, rawData, status) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        const timestamp = new Date().toLocaleTimeString();
        const weightDisplay = typeof weight === 'number' ? weight.toFixed(this.decimalPlaces) : weight;
        
        logEntry.innerHTML = `
            <span class="timestamp">${timestamp}</span>
            <span class="weight">${weightDisplay}</span>
            <span class="status ${status.toLowerCase()}">${status}</span>
            <span class="raw-data">${rawData}</span>
        `;
        
        this.logContainer.appendChild(logEntry);
        
        // Auto scroll if enabled
        if (this.autoScrollCheckbox.checked) {
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
        
        // Limit log entries to prevent memory issues
        const maxEntries = 1000;
        const entries = this.logContainer.querySelectorAll('.log-entry:not(.header)');
        if (entries.length > maxEntries) {
            entries[0].remove();
        }
    }

    clearLog() {
        const entries = this.logContainer.querySelectorAll('.log-entry:not(.header)');
        entries.forEach(entry => entry.remove());
    }

    exportLog() {
        const entries = this.logContainer.querySelectorAll('.log-entry:not(.header)');
        let csvContent = 'Timestamp,Weight,Status,Raw Data\n';
        
        entries.forEach(entry => {
            const cells = entry.querySelectorAll('span');
            const row = Array.from(cells).map(cell => `"${cell.textContent}"`).join(',');
            csvContent += row + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vibra-scale-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    updateDataRate() {
        if (this.startTime) {
            const elapsed = (Date.now() - this.startTime) / 1000 / 60; // minutes
            const rate = Math.round(this.dataCount / elapsed);
            this.dataRateSpan.textContent = `${rate}/min`;
        }
    }

    startUptimeCounter() {
        setInterval(() => {
            if (this.startTime) {
                const elapsed = Date.now() - this.startTime;
                const hours = Math.floor(elapsed / 3600000);
                const minutes = Math.floor((elapsed % 3600000) / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                this.uptimeSpan.textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                this.uptimeSpan.textContent = '00:00:00';
            }
        }, 1000);
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorModal.style.display = 'block';
    }

    hideError() {
        this.errorModal.style.display = 'none';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VibraScaleReader();
});

// Handle page visibility change to pause/resume reading
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - pausing operations');
    } else {
        console.log('Page visible - resuming operations');
    }
});
