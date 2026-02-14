# 🚀 IntelliSOC Backend - No Database Setup

## Quick Start (No Database Required!)

This version uses **JSON files** for data storage - perfect for testing and development without setting up PostgreSQL.

---

## ✅ Prerequisites

Only **Node.js** is required (v14 or higher):
- Download from: https://nodejs.org/

That's it! No database installation needed.

---

## 📦 Installation & Setup

### Step 1: Install Dependencies

```bash
# Navigate to your project directory
cd /path/to/your/project

# Install required packages (only 2 packages!)
npm install express cors

# Optional: Install nodemon for auto-reload during development
npm install --save-dev nodemon
```

### Step 2: Start the Server

```bash
# Start the server
node server-no-db.js

# Or with auto-reload (if you installed nodemon)
npx nodemon server-no-db.js
```

You should see:
```
✅ Server running on port 5000
✅ Storage: JSON files in ./data directory
✅ No database required!
```

---

## 🔧 Frontend Configuration

### Update your `login.js` file:

Find this section:
```javascript
const LOG_CONFIG = {
    enabled: true,
    endpoint: '/api/log', // Change this line below
    sessionId: generateSessionId(),
    deviceFingerprint: generateDeviceFingerprint()
};
```

Change to:
```javascript
const LOG_CONFIG = {
    enabled: true,
    endpoint: 'http://localhost:5000/api/log', // Updated!
    sessionId: generateSessionId(),
    deviceFingerprint: generateDeviceFingerprint()
};
```

Then **uncomment** the fetch call in the `sendToBackend()` function:
```javascript
function sendToBackend(logEntry) {
    // Uncomment these lines:
    fetch(LOG_CONFIG.endpoint + '/event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
    }).catch(err => console.error('Logging failed:', err));
}
```

---

## 🧪 Testing

### 1. Start Backend Server
```bash
node server-no-db.js
```

### 2. Start Frontend
```bash
# In a different terminal
cd /path/to/frontend
python -m http.server 8000
# Or use any other web server
```

### 3. Test Login
- Open browser: http://localhost:8000
- Click "Login"
- Use test credentials:
  - **Username:** `admin` / **Password:** `admin123`
  - **Username:** `user1` / **Password:** `password123`
  - **Username:** `testuser` / **Password:** `test123`

### 4. Check Logs
All data is stored in the `./data` directory:
```
data/
├── users.json              # User accounts
├── sessions.json           # Active sessions
├── event_logs.json         # All logged events
├── login_attempts.json     # Login attempts
└── ip_reputation.json      # IP reputation scores
```

You can open these files in any text editor to see the logged data!

---

## 📊 API Endpoints

All endpoints work the same as the database version:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User authentication |
| `/api/log/event` | POST | Log single event |
| `/api/log/batch` | POST | Log multiple events |
| `/api/ip/info` | GET | Get IP information |
| `/api/analytics/login-stats` | GET | Get login statistics |
| `/api/analytics/ip-reputation/:ip` | GET | Get IP reputation |
| `/api/export/all-logs` | GET | Export all data (for research) |
| `/health` | GET | Server health check |

---

## 🔍 Viewing Your Data

### Option 1: Open JSON Files Directly
```bash
# View event logs
cat data/event_logs.json

# View login attempts
cat data/login_attempts.json

# View IP reputation
cat data/ip_reputation.json
```

### Option 2: Use API to Export All Data
```bash
# Export everything
curl http://localhost:5000/api/export/all-logs > my_research_data.json
```

### Option 3: Use Browser
Navigate to: http://localhost:5000/api/export/all-logs

---

## 📈 Example: Getting Login Statistics

### Using curl:
```bash
curl http://localhost:5000/api/analytics/login-stats?timeRange=24h
```

### Response:
```json
{
  "status": "success",
  "data": {
    "SUCCESS": {
      "count": 5,
      "unique_ips": 2,
      "unique_users": 3
    },
    "FAILURE": {
      "count": 2,
      "unique_ips": 1,
      "unique_users": 1
    }
  },
  "timestamp": "2026-02-14T10:30:45.123Z"
}
```

---

## 🔐 Test Login Request

### Using curl:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123",
    "deviceInfo": {
      "fingerprint": "test_device_123",
      "browser": {
        "userAgent": "Mozilla/5.0"
      }
    },
    "sessionId": "test_session_456"
  }'
```

### Expected Response:
```json
{
  "status": "success",
  "message": "Authentication successful",
  "data": {
    "userId": "3",
    "username": "testuser",
    "sessionToken": "abc123...",
    "expiresAt": "2026-02-15T10:30:45.123Z",
    "sessionId": "test_session_456"
  },
  "timestamp": "2026-02-14T10:30:45.123Z"
}
```

---

## 🛠️ Troubleshooting

### Problem: Port 5000 already in use
**Solution:** Change the port
```bash
PORT=3000 node server-no-db.js
```

### Problem: CORS error in browser
**Solution:** The server already has CORS enabled, but make sure you're accessing from `http://localhost:8000` (not `file://`)

### Problem: Data not persisting
**Solution:** Check that the `./data` directory has write permissions
```bash
chmod 755 data
```

### Problem: Cannot find module 'express'
**Solution:** Install dependencies
```bash
npm install express cors
```

---

## 📁 Data Storage Details

### File Structure:
```json
// users.json
[
  {
    "user_id": 1,
    "username": "admin",
    "password": "admin123",
    "email": "admin@securebank.com",
    "full_name": "Admin User",
    "account_balance": 50000.00,
    "created_at": "2026-02-14T10:30:45.123Z"
  }
]

// event_logs.json
[
  {
    "log_id": 1,
    "timestamp": "2026-02-14T10:30:45.123Z",
    "session_id": "session_123",
    "user_id": 1,
    "event_type": "LOGIN_ATTEMPT",
    "event_data": { "status": "SUCCESS" },
    "ip_address": "192.168.1.100",
    "device_fingerprint": "device_abc"
  }
]

// ip_reputation.json
[
  {
    "ip_address": "192.168.1.100",
    "reputation_score": 95,
    "total_logins": 10,
    "failed_logins": 1,
    "successful_logins": 9,
    "suspicious_activities": 0,
    "first_seen": "2026-02-14T08:00:00.000Z",
    "last_seen": "2026-02-14T10:30:45.123Z",
    "is_blocked": false
  }
]
```

---

## 🎯 For Your Research

### Analyzing Data

```javascript
// Load and analyze in Node.js
const fs = require('fs');

// Read event logs
const logs = JSON.parse(fs.readFileSync('./data/event_logs.json', 'utf8'));

// Count events by type
const eventCounts = logs.reduce((acc, log) => {
  acc[log.event_type] = (acc[log.event_type] || 0) + 1;
  return acc;
}, {});

console.log('Event Distribution:', eventCounts);

// Find suspicious IPs
const ipReputation = JSON.parse(fs.readFileSync('./data/ip_reputation.json', 'utf8'));
const suspiciousIPs = ipReputation.filter(ip => ip.reputation_score < 50);
console.log('Suspicious IPs:', suspiciousIPs);
```

### Converting to CSV for Analysis
```bash
# Install json2csv globally
npm install -g json2csv

# Convert login attempts to CSV
json2csv -i data/login_attempts.json -o login_attempts.csv

# Convert event logs to CSV
json2csv -i data/event_logs.json -o event_logs.csv
```

---

## ⚡ Performance Notes

- **No database overhead** - Direct JSON file I/O
- **Fast startup** - No connection pooling or migrations
- **Good for:** Testing, development, small-scale research (<10,000 events)
- **Not recommended for:** Production, high-traffic scenarios

For production with large-scale data, use the database version (PostgreSQL/TimescaleDB).

---

## 🔄 Migrating to Database Later

When you're ready to scale:

1. Install PostgreSQL/TimescaleDB
2. Run `schema.sql` to create tables
3. Switch to `server.js` instead of `server-no-db.js`
4. Optionally import your JSON data into the database

---

## ✅ Checklist

- [ ] Node.js installed (v14+)
- [ ] Dependencies installed (`npm install express cors`)
- [ ] Server running (`node server-no-db.js`)
- [ ] Frontend updated with backend URL
- [ ] Test login successful
- [ ] Data appearing in `./data` directory
- [ ] Can access API endpoints

---

## 📞 Support

For issues or questions, check:
1. Console logs from server
2. Browser console (F12)
3. JSON files in `./data` directory

---

**Perfect for IntelliSOC Research Testing!** 🎓

No complex setup, just install Node.js and run! All your tracking data is saved in readable JSON files.
