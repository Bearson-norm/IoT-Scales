#!/usr/bin/env python3
"""
Vibra Scale RS232 Reader - Python Implementation
Real-time weight reading from Vibra scale via RS232 communication

Configuration:
- Baudrate: 9600
- Data bits: 8
- Stop bits: 2
- Parity: none
- Data format: 7-digit numeric
"""

import serial
import time
import threading
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from datetime import datetime
import csv
import json
import os

class VibraScaleReader:
    def __init__(self):
        self.serial_port = None
        self.is_connected = False
        self.is_reading = False
        self.data_buffer = ""
        self.last_weight = 0
        self.stable_count = 0
        self.data_count = 0
        self.start_time = None
        
        # Configuration
        self.baudrate = 9600
        self.data_bits = 8
        self.stop_bits = 2
        self.parity = 'N'
        self.decimal_places = 6
        self.stability_threshold = 0.001
        self.current_unit = 'kg'
        
        # Data logging
        self.log_data = []
        
        self.setup_gui()
        self.scan_ports()
    
    def setup_gui(self):
        """Setup the GUI interface"""
        self.root = tk.Tk()
        self.root.title("Vibra Scale RS232 Reader - Python")
        self.root.geometry("1000x700")
        self.root.configure(bg='#f0f0f0')
        
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Connection frame
        self.setup_connection_frame(main_frame)
        
        # Weight display frame
        self.setup_weight_frame(main_frame)
        
        # Log frame
        self.setup_log_frame(main_frame)
        
        # Settings frame
        self.setup_settings_frame(main_frame)
        
        # Status bar
        self.setup_status_bar(main_frame)
    
    def setup_connection_frame(self, parent):
        """Setup connection controls"""
        conn_frame = ttk.LabelFrame(parent, text="RS232 Connection", padding="10")
        conn_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Port selection
        ttk.Label(conn_frame, text="Port COM:").grid(row=0, column=0, sticky=tk.W, padx=(0, 5))
        self.port_var = tk.StringVar()
        self.port_combo = ttk.Combobox(conn_frame, textvariable=self.port_var, width=15)
        self.port_combo.grid(row=0, column=1, sticky=tk.W, padx=(0, 10))
        
        # Buttons
        ttk.Button(conn_frame, text="Scan Ports", command=self.scan_ports).grid(row=0, column=2, padx=(0, 5))
        self.connect_btn = ttk.Button(conn_frame, text="Connect", command=self.connect)
        self.connect_btn.grid(row=0, column=3, padx=(0, 5))
        self.disconnect_btn = ttk.Button(conn_frame, text="Disconnect", command=self.disconnect, state='disabled')
        self.disconnect_btn.grid(row=0, column=4)
        
        # Connection status
        self.status_label = ttk.Label(conn_frame, text="Status: Disconnected", foreground="red")
        self.status_label.grid(row=1, column=0, columnspan=5, sticky=tk.W, pady=(10, 0))
        
        # Configuration display
        config_frame = ttk.Frame(conn_frame)
        config_frame.grid(row=2, column=0, columnspan=5, sticky=(tk.W, tk.E), pady=(10, 0))
        
        ttk.Label(config_frame, text="Configuration:").grid(row=0, column=0, sticky=tk.W)
        config_text = f"Baudrate: {self.baudrate}, Data Bits: {self.data_bits}, Stop Bits: {self.stop_bits}, Parity: {self.parity}"
        ttk.Label(config_frame, text=config_text, font=('Courier', 9)).grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
    
    def setup_weight_frame(self, parent):
        """Setup weight display"""
        weight_frame = ttk.LabelFrame(parent, text="Weight Display", padding="10")
        weight_frame.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, 5))
        
        # Weight value
        self.weight_var = tk.StringVar(value="0.000000")
        weight_label = ttk.Label(weight_frame, textvariable=self.weight_var, font=('Arial', 24, 'bold'))
        weight_label.grid(row=0, column=0, pady=20)
        
        # Unit
        self.unit_var = tk.StringVar(value="kg")
        unit_label = ttk.Label(weight_frame, textvariable=self.unit_var, font=('Arial', 16))
        unit_label.grid(row=0, column=1, padx=(10, 0), pady=20)
        
        # Weight info
        info_frame = ttk.Frame(weight_frame)
        info_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E))
        
        self.stability_var = tk.StringVar(value="Stable")
        ttk.Label(info_frame, text="Status:").grid(row=0, column=0, sticky=tk.W)
        self.stability_label = ttk.Label(info_frame, textvariable=self.stability_var, foreground="green")
        self.stability_label.grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        self.last_update_var = tk.StringVar(value="-")
        ttk.Label(info_frame, text="Last Update:").grid(row=1, column=0, sticky=tk.W, pady=(5, 0))
        ttk.Label(info_frame, textvariable=self.last_update_var).grid(row=1, column=1, sticky=tk.W, padx=(10, 0), pady=(5, 0))
    
    def setup_log_frame(self, parent):
        """Setup data log display"""
        log_frame = ttk.LabelFrame(parent, text="Data Log", padding="10")
        log_frame.grid(row=1, column=1, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(5, 0))
        
        # Log controls
        log_controls = ttk.Frame(log_frame)
        log_controls.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        ttk.Button(log_controls, text="Clear Log", command=self.clear_log).grid(row=0, column=0, padx=(0, 5))
        ttk.Button(log_controls, text="Export CSV", command=self.export_log).grid(row=0, column=1, padx=(0, 5))
        ttk.Button(log_controls, text="Save Config", command=self.save_config).grid(row=0, column=2)
        
        # Log display
        self.log_text = scrolledtext.ScrolledText(log_frame, height=15, width=50)
        self.log_text.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(1, weight=1)
    
    def setup_settings_frame(self, parent):
        """Setup settings controls"""
        settings_frame = ttk.LabelFrame(parent, text="Settings", padding="10")
        settings_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(10, 0))
        
        # Decimal places
        ttk.Label(settings_frame, text="Decimal Places:").grid(row=0, column=0, sticky=tk.W)
        self.decimal_var = tk.IntVar(value=self.decimal_places)
        decimal_spin = ttk.Spinbox(settings_frame, from_=0, to=8, textvariable=self.decimal_var, width=10)
        decimal_spin.grid(row=0, column=1, sticky=tk.W, padx=(5, 20))
        
        # Stability threshold
        ttk.Label(settings_frame, text="Stability Threshold:").grid(row=0, column=2, sticky=tk.W)
        self.threshold_var = tk.DoubleVar(value=self.stability_threshold)
        threshold_spin = ttk.Spinbox(settings_frame, from_=0.001, to=1.0, increment=0.001, 
                                    textvariable=self.threshold_var, width=10)
        threshold_spin.grid(row=0, column=3, sticky=tk.W, padx=(5, 20))
        
        # Unit selection
        ttk.Label(settings_frame, text="Unit:").grid(row=0, column=4, sticky=tk.W)
        self.unit_combo = ttk.Combobox(settings_frame, values=['kg', 'g', 'lb'], 
                                      textvariable=self.unit_var, width=10)
        self.unit_combo.grid(row=0, column=5, sticky=tk.W, padx=(5, 0))
        
        # Apply button
        ttk.Button(settings_frame, text="Apply Settings", command=self.apply_settings).grid(row=0, column=6, padx=(20, 0))
    
    def setup_status_bar(self, parent):
        """Setup status bar"""
        status_frame = ttk.Frame(parent)
        status_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(10, 0))
        
        self.port_status_var = tk.StringVar(value="Port: -")
        ttk.Label(status_frame, textvariable=self.port_status_var).grid(row=0, column=0, sticky=tk.W)
        
        self.data_rate_var = tk.StringVar(value="Data Rate: 0/min")
        ttk.Label(status_frame, textvariable=self.data_rate_var).grid(row=0, column=1, sticky=tk.W, padx=(20, 0))
        
        self.uptime_var = tk.StringVar(value="Uptime: 00:00:00")
        ttk.Label(status_frame, textvariable=self.uptime_var).grid(row=0, column=2, sticky=tk.W, padx=(20, 0))
    
    def scan_ports(self):
        """Scan for available COM ports"""
        import serial.tools.list_ports
        
        ports = serial.tools.list_ports.comports()
        port_list = [port.device for port in ports]
        
        self.port_combo['values'] = port_list
        if port_list:
            self.port_combo.current(0)
        
        self.log_message(f"Found {len(port_list)} ports: {', '.join(port_list)}")
    
    def connect(self):
        """Connect to the selected COM port"""
        port = self.port_var.get()
        if not port:
            messagebox.showerror("Error", "Please select a COM port")
            return
        
        try:
            self.serial_port = serial.Serial(
                port=port,
                baudrate=self.baudrate,
                bytesize=self.data_bits,
                parity=self.parity,
                stopbits=self.stop_bits,
                timeout=1
            )
            
            self.is_connected = True
            self.start_time = time.time()
            self.data_count = 0
            
            self.update_connection_status(True)
            self.start_reading()
            self.log_message(f"Connected to {port}")
            
        except serial.SerialException as e:
            messagebox.showerror("Connection Error", f"Failed to connect to {port}: {str(e)}")
    
    def disconnect(self):
        """Disconnect from the COM port"""
        self.is_reading = False
        
        if self.serial_port and self.serial_port.is_open:
            self.serial_port.close()
        
        self.is_connected = False
        self.update_connection_status(False)
        self.log_message("Disconnected")
    
    def start_reading(self):
        """Start reading data from the serial port"""
        if not self.is_connected:
            return
        
        self.is_reading = True
        self.reading_thread = threading.Thread(target=self.read_data_loop, daemon=True)
        self.reading_thread.start()
    
    def read_data_loop(self):
        """Main data reading loop"""
        while self.is_reading and self.serial_port and self.serial_port.is_open:
            try:
                if self.serial_port.in_waiting > 0:
                    data = self.serial_port.readline().decode('utf-8').strip()
                    self.process_data(data)
                time.sleep(0.1)
            except Exception as e:
                self.log_message(f"Reading error: {str(e)}")
                break
    
    def process_data(self, raw_data):
        """Process incoming data from the scale"""
        if not raw_data:
            return
        
        try:
            # Extract 7-digit numeric data
            import re
            numeric_match = re.search(r'\d{7}', raw_data)
            if not numeric_match:
                self.log_message(f"Invalid data: {raw_data}")
                return
            
            numeric_value = numeric_match.group()
            weight = float(numeric_value) / 1000  # Convert to kg
            
            # Apply unit conversion
            weight = self.convert_weight(weight, 'kg', self.current_unit)
            
            # Check stability
            is_stable = abs(weight - self.last_weight) < self.stability_threshold
            
            if is_stable:
                self.stable_count += 1
            else:
                self.stable_count = 0
            
            self.last_weight = weight
            self.data_count += 1
            
            # Update GUI
            self.root.after(0, lambda: self.update_weight_display(weight, is_stable))
            self.root.after(0, lambda: self.log_data_entry(weight, raw_data, is_stable))
            
        except Exception as e:
            self.log_message(f"Data processing error: {str(e)}")
    
    def convert_weight(self, weight, from_unit, to_unit):
        """Convert weight between units"""
        if from_unit == to_unit:
            return weight
        
        # Convert to kg first
        weight_in_kg = weight
        if from_unit == 'g':
            weight_in_kg = weight / 1000
        elif from_unit == 'lb':
            weight_in_kg = weight * 0.453592
        
        # Convert to target unit
        if to_unit == 'g':
            return weight_in_kg * 1000
        elif to_unit == 'lb':
            return weight_in_kg / 0.453592
        
        return weight_in_kg
    
    def update_weight_display(self, weight, is_stable):
        """Update the weight display"""
        self.weight_var.set(f"{weight:.{self.decimal_places}f}")
        self.stability_var.set("Stable" if is_stable else "Unstable")
        self.last_update_var.set(datetime.now().strftime("%H:%M:%S"))
        
        # Update color based on stability
        if is_stable:
            self.stability_label.configure(foreground="green")
        else:
            self.stability_label.configure(foreground="red")
    
    def log_data_entry(self, weight, raw_data, is_stable):
        """Log data entry"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        status = "STABLE" if is_stable else "UNSTABLE"
        
        log_entry = {
            'timestamp': timestamp,
            'weight': weight,
            'status': status,
            'raw_data': raw_data
        }
        
        self.log_data.append(log_entry)
        
        # Update log display
        log_text = f"{timestamp} | {weight:.{self.decimal_places}f} {self.current_unit} | {status} | {raw_data}\n"
        self.log_text.insert(tk.END, log_text)
        self.log_text.see(tk.END)
        
        # Update data rate
        if self.start_time:
            elapsed = (time.time() - self.start_time) / 60  # minutes
            rate = int(self.data_count / elapsed) if elapsed > 0 else 0
            self.data_rate_var.set(f"Data Rate: {rate}/min")
    
    def log_message(self, message):
        """Log a general message"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_text = f"[{timestamp}] {message}\n"
        self.log_text.insert(tk.END, log_text)
        self.log_text.see(tk.END)
    
    def update_connection_status(self, connected):
        """Update connection status display"""
        if connected:
            self.status_label.configure(text="Status: Connected", foreground="green")
            self.connect_btn.configure(state='disabled')
            self.disconnect_btn.configure(state='normal')
            self.port_status_var.set(f"Port: {self.port_var.get()}")
        else:
            self.status_label.configure(text="Status: Disconnected", foreground="red")
            self.connect_btn.configure(state='normal')
            self.disconnect_btn.configure(state='disabled')
            self.port_status_var.set("Port: -")
    
    def clear_log(self):
        """Clear the log display"""
        self.log_text.delete(1.0, tk.END)
        self.log_data.clear()
    
    def export_log(self):
        """Export log data to CSV"""
        if not self.log_data:
            messagebox.showwarning("Warning", "No data to export")
            return
        
        filename = f"vibra_scale_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        try:
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['timestamp', 'weight', 'status', 'raw_data']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                for entry in self.log_data:
                    writer.writerow(entry)
            
            messagebox.showinfo("Success", f"Data exported to {filename}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to export data: {str(e)}")
    
    def save_config(self):
        """Save current configuration"""
        config = {
            'decimal_places': self.decimal_var.get(),
            'stability_threshold': self.threshold_var.get(),
            'unit': self.unit_var.get(),
            'baudrate': self.baudrate,
            'data_bits': self.data_bits,
            'stop_bits': self.stop_bits,
            'parity': self.parity
        }
        
        try:
            with open('vibra_scale_config.json', 'w') as f:
                json.dump(config, f, indent=2)
            messagebox.showinfo("Success", "Configuration saved to vibra_scale_config.json")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save config: {str(e)}")
    
    def apply_settings(self):
        """Apply current settings"""
        self.decimal_places = self.decimal_var.get()
        self.stability_threshold = self.threshold_var.get()
        self.current_unit = self.unit_var.get()
        
        self.log_message("Settings applied")
    
    def start_uptime_counter(self):
        """Start uptime counter"""
        def update_uptime():
            if self.start_time:
                elapsed = time.time() - self.start_time
                hours = int(elapsed // 3600)
                minutes = int((elapsed % 3600) // 60)
                seconds = int(elapsed % 60)
                self.uptime_var.set(f"Uptime: {hours:02d}:{minutes:02d}:{seconds:02d}")
            else:
                self.uptime_var.set("Uptime: 00:00:00")
            
            self.root.after(1000, update_uptime)
        
        update_uptime()
    
    def run(self):
        """Start the application"""
        self.start_uptime_counter()
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        self.root.mainloop()
    
    def on_closing(self):
        """Handle application closing"""
        if self.is_connected:
            self.disconnect()
        self.root.destroy()

if __name__ == "__main__":
    try:
        app = VibraScaleReader()
        app.run()
    except Exception as e:
        print(f"Application error: {e}")
        input("Press Enter to exit...")

