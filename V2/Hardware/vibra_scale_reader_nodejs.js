const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const express = require('express');
const fs = require('fs');
const path = require('path');

class VibraScaleReader {
    constructor() {
        this.serialPort = null;
        this.isConnected = false;
        this.isReading = false;
        this.dataBuffer = '';
        this.lastWeight = 0;
        this.stableCount = 0;
        this.dataCount = 0;
        this.startTime = null;
        
        // Configuration
        this.config = {
            baudRate: 9600,
            dataBits: 8,
            stopBits: 2,
            parity: 'none',
            decimalPlaces: 6,
            stabilityThreshold: 0.001,
            unit: 'kg'
        };
        
        // Data logging
        this.logData = [];
        
        this.setupWebServer();
        this.scanPorts();
    }
    
    setupWebServer() {
        this.app = express();
        this.app.use(express.json());
        this.app.use(express.static('public'));
        
        // API Routes
        this.app.get('/api/ports', (req, res) => {
            this.scanPorts().then(ports => {
                res.json(ports);
            });
        });
        
        this.app.post('/api/connect', (req, res) => {
            const { port } = req.body;
            this.connect(port).then(() => {
                res.json({ success: true, message: 'Connected' });
            }).catch(err => {
                res.json({ success: false, message: err.message });
            });
        });
        
        this.app.post('/api/disconnect', (req, res) => {
            this.disconnect();
            res.json({ success: true, message: 'Disconnected' });
        });
        
        this.app.get('/api/status', (req, res) => {
            res.json({
                connected: this.isConnected,
                reading: this.isReading,
                lastWeight: this.lastWeight,
                dataCount: this.dataCount,
                uptime: this.startTime ? Date.now() - this.startTime : 0
            });
        });
        
        this.app.get('/api/log', (req, res) => {
            res.json(this.logData);
        });
        
        this.app.post('/api/export', (req, res) => {
            this.exportLog().then(filename => {
                res.json({ success: true, filename });
            }).catch(err => {
                res.json({ success: false, message: err.message });
            });
        });
        
        this.app.listen(3000, () => {
            console.log('Vibra Scale Reader running on http://localhost:3000');
        });
    }
    
    async scanPorts() {
        try {
            const ports = await SerialPort.list();
            return ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer,
                serialNumber: port.serialNumber
            }));
        } catch (error) {
            console.error('Error scanning ports:', error);
            return [];
        }
    }
    
    async connect(portPath) {
        if (this.isConnected) {
            throw new Error('Already connected');
        }
        
        try {
            this.serialPort = new SerialPort(portPath, {
                baudRate: this.config.baudRate,
                dataBits: this.config.dataBits,
                stopBits: this.config.stopBits,
                parity: this.config.parity
            });
            
            const parser = this.serialPort.pipe(new Readline({ delimiter: '\n' }));
            
            parser.on('data', (data) => {
                this.processData(data);
            });
            
            this.serialPort.on('error', (err) => {
                console.error('Serial port error:', err);
                this.disconnect();
            });
            
            this.isConnected = true;
            this.startTime = Date.now();
            this.dataCount = 0;
            
            console.log(`Connected to ${portPath}`);
            this.logMessage('CONNECT', `Connected to ${portPath}`);
            
        } catch (error) {
            throw new Error(`Failed to connect to ${portPath}: ${error.message}`);
        }
    }
    
    disconnect() {
        if (this.serialPort && this.serialPort.isOpen) {
            this.serialPort.close();
        }
        
        this.isConnected = false;
        this.isReading = false;
        
        console.log('Disconnected');
        this.logMessage('DISCONNECT', 'Disconnected from scale');
    }
    
    processData(rawData) {
        if (!rawData || rawData.trim() === '') {
            return;
        }
        
        try {
            // Extract 7-digit numeric data
            const numericMatch = rawData.match(/\d{7}/);
            if (!numericMatch) {
                this.logMessage('ERROR', `Invalid data: ${rawData}`);
                return;
            }
            
            const numericValue = numericMatch[0];
            let weight = parseFloat(numericValue) / 1000; // Convert to kg
            
            // Apply unit conversion
            weight = this.convertWeight(weight, 'kg', this.config.unit);
            
            // Check stability
            const isStable = Math.abs(weight - this.lastWeight) < this.config.stabilityThreshold;
            
            if (isStable) {
                this.stableCount++;
            } else {
                this.stableCount = 0;
            }
            
            this.lastWeight = weight;
            this.dataCount++;
            
            // Log data
            this.logDataEntry(weight, rawData, isStable);
            
        } catch (error) {
            this.logMessage('ERROR', `Data processing error: ${error.message}`);
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
    
    logDataEntry(weight, rawData, isStable) {
        const timestamp = new Date().toISOString();
        const status = isStable ? 'STABLE' : 'UNSTABLE';
        
        const logEntry = {
            timestamp,
            weight: parseFloat(weight.toFixed(this.config.decimalPlaces)),
            status,
            rawData,
            unit: this.config.unit
        };
        
        this.logData.push(logEntry);
        
        // Keep only last 1000 entries
        if (this.logData.length > 1000) {
            this.logData = this.logData.slice(-1000);
        }
        
        console.log(`${timestamp} | ${weight.toFixed(this.config.decimalPlaces)} ${this.config.unit} | ${status} | ${rawData}`);
    }
    
    logMessage(type, message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${type}: ${message}`);
    }
    
    async exportLog() {
        if (this.logData.length === 0) {
            throw new Error('No data to export');
        }
        
        const filename = `vibra_scale_log_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        const csvContent = this.generateCSV();
        
        try {
            fs.writeFileSync(filename, csvContent);
            return filename;
        } catch (error) {
            throw new Error(`Failed to export data: ${error.message}`);
        }
    }
    
    generateCSV() {
        const headers = ['timestamp', 'weight', 'unit', 'status', 'raw_data'];
        const csvRows = [headers.join(',')];
        
        this.logData.forEach(entry => {
            const row = [
                entry.timestamp,
                entry.weight,
                entry.unit,
                entry.status,
                `"${entry.rawData}"`
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
}

// Start the application
const scaleReader = new VibraScaleReader();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    scaleReader.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    scaleReader.disconnect();
    process.exit(0);
});

