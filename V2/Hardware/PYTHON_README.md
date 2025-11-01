# Python Vibra Scale Reader - Requirements

## 📦 Dependencies

Install required packages:

```bash
pip install pyserial
```

## 🚀 Quick Start

1. **Install Python 3.7+** (if not already installed)
2. **Install dependencies:**
   ```bash
   pip install pyserial
   ```
3. **Run the application:**
   ```bash
   python vibra_scale_reader.py
   ```

## 🔧 Features

- ✅ **Real-time RS232 communication** with Vibra scale
- ✅ **Professional GUI** using Tkinter
- ✅ **7-digit numeric data processing**
- ✅ **Weight stability detection**
- ✅ **Multiple units** (kg, g, lb)
- ✅ **Data logging** with timestamps
- ✅ **CSV export** functionality
- ✅ **Configuration saving**
- ✅ **Cross-platform** (Windows, Linux, macOS)

## 📋 Configuration

The application uses the exact RS232 configuration you specified:
- **Baudrate:** 9600
- **Data bits:** 8
- **Stop bits:** 2
- **Parity:** None
- **Data format:** 7-digit numeric

## 🎯 Advantages over JavaScript/Web Serial

1. **No browser dependency** - runs as standalone application
2. **Better RS232 support** - PySerial is mature and stable
3. **No permission issues** - direct hardware access
4. **Cross-platform** - works on Windows, Linux, macOS
5. **Professional GUI** - native desktop application
6. **Better performance** - compiled Python is fast
7. **Easier deployment** - single executable possible

## 📊 Performance Comparison

| Feature | JavaScript/Web Serial | Python/PySerial |
|---------|----------------------|------------------|
| **Browser Required** | ✅ Yes | ❌ No |
| **Permission Issues** | ⚠️ Common | ❌ None |
| **Cross-platform** | ⚠️ Limited | ✅ Full |
| **Performance** | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Development Speed** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Deployment** | ⚠️ Complex | ✅ Simple |
| **RS232 Support** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🛠️ Customization

### Adding Database Support
```python
import sqlite3

def save_to_database(self, weight, timestamp):
    conn = sqlite3.connect('scale_data.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS weight_data (
            id INTEGER PRIMARY KEY,
            timestamp TEXT,
            weight REAL,
            unit TEXT
        )
    ''')
    cursor.execute('INSERT INTO weight_data (timestamp, weight, unit) VALUES (?, ?, ?)',
                   (timestamp, weight, self.current_unit))
    conn.commit()
    conn.close()
```

### Adding Web API
```python
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/weight')
def get_current_weight():
    return jsonify({
        'weight': self.last_weight,
        'unit': self.current_unit,
        'timestamp': datetime.now().isoformat(),
        'stable': self.stable_count > 5
    })
```

### Adding Email Alerts
```python
import smtplib
from email.mime.text import MIMEText

def send_weight_alert(self, weight):
    if weight > self.alert_threshold:
        msg = MIMEText(f"Weight alert: {weight} {self.current_unit}")
        msg['Subject'] = 'Weight Alert'
        msg['From'] = self.email_from
        msg['To'] = self.email_to
        
        server = smtplib.SMTP(self.smtp_server, 587)
        server.starttls()
        server.login(self.email_user, self.email_password)
        server.send_message(msg)
        server.quit()
```

## 📁 File Structure

```
vibra_scale_reader.py          # Main application
requirements.txt               # Dependencies
vibra_scale_config.json       # Saved configuration
vibra_scale_log_*.csv         # Exported data logs
```

## 🔄 Migration from JavaScript

If you want to migrate from the JavaScript version:

1. **Data format** - Same 7-digit processing
2. **RS232 config** - Identical settings
3. **GUI layout** - Similar interface
4. **Export format** - Same CSV structure
5. **Real-time updates** - Same functionality

## 🚀 Deployment Options

### Standalone Executable
```bash
pip install pyinstaller
pyinstaller --onefile --windowed vibra_scale_reader.py
```

### Docker Container
```dockerfile
FROM python:3.9-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY vibra_scale_reader.py .
CMD ["python", "vibra_scale_reader.py"]
```

### Windows Service
```python
import win32serviceutil
import win32service
import win32event

class VibraScaleService(win32serviceutil.ServiceFramework):
    _svc_name_ = "VibraScaleReader"
    _svc_display_name_ = "Vibra Scale Reader Service"
    
    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
    
    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)
    
    def SvcDoRun(self):
        app = VibraScaleReader()
        app.run()
```

## 📞 Support

For issues or questions:
1. Check Python version (3.7+ required)
2. Verify PySerial installation
3. Check COM port permissions
4. Review error messages in console

---

**Python is the recommended choice for RS232 scale reading applications!**

