// ============================================
// IntelliSOC Backend - No Database Version
// Uses JSON files for storage (perfect for testing)
// ============================================

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// Data Storage Paths
// ============================================
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const EVENT_LOGS_FILE = path.join(DATA_DIR, 'event_logs.json');
const LOGIN_ATTEMPTS_FILE = path.join(DATA_DIR, 'login_attempts.json');
const IP_REPUTATION_FILE = path.join(DATA_DIR, 'ip_reputation.json');

// ============================================
// Initialize Data Storage
// ============================================
async function initializeStorage() {
    try {
        // Create data directory if it doesn't exist
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Initialize users file with sample data
        try {
            await fs.access(USERS_FILE);
        } catch {
            const initialUsers = [
                {
                    user_id: 1,
                    username: 'admin',
                    password: 'admin123', // In production, hash this!
                    email: 'admin@securebank.com',
                    full_name: 'Admin User',
                    account_balance: 50000.00,
                    created_at: new Date().toISOString()
                },
                {
                    user_id: 2,
                    username: 'user1',
                    password: 'password123',
                    email: 'user1@example.com',
                    full_name: 'John Doe',
                    account_balance: 12450.00,
                    created_at: new Date().toISOString()
                },
                {
                    user_id: 3,
                    username: 'testuser',
                    password: 'test123',
                    email: 'test@example.com',
                    full_name: 'Test User',
                    account_balance: 5000.00,
                    created_at: new Date().toISOString()
                }
            ];
            await fs.writeFile(USERS_FILE, JSON.stringify(initialUsers, null, 2));
        }
        
        // Initialize other files if they don't exist
        const files = [
            SESSIONS_FILE,
            EVENT_LOGS_FILE,
            LOGIN_ATTEMPTS_FILE,
            IP_REPUTATION_FILE
        ];
        
        for (const file of files) {
            try {
                await fs.access(file);
            } catch {
                await fs.writeFile(file, JSON.stringify([], null, 2));
            }
        }
        
        console.log('✅ Storage initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing storage:', error);
    }
}

// ============================================
// Helper Functions
// ============================================

// Read JSON file
async function readJSON(filepath) {
    try {
        const data = await fs.readFile(filepath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filepath}:`, error);
        return [];
    }
}

// Write JSON file
async function writeJSON(filepath, data) {
    try {
        await fs.writeFile(filepath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filepath}:`, error);
        return false;
    }
}

// Get client IP
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           '127.0.0.1';
}

// Generate session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Update IP reputation
async function updateIPReputation(ipAddress, result) {
    const ipReputations = await readJSON(IP_REPUTATION_FILE);
    const ipIndex = ipReputations.findIndex(ip => ip.ip_address === ipAddress);
    
    if (ipIndex !== -1) {
        // Update existing IP
        const ip = ipReputations[ipIndex];
        ip.total_logins++;
        
        if (result === 'success') {
            ip.successful_logins++;
            ip.reputation_score = Math.min(ip.reputation_score + 1, 100);
        } else {
            ip.failed_logins++;
            ip.suspicious_activities++;
            ip.reputation_score = Math.max(ip.reputation_score - 5, 0);
        }
        
        ip.last_seen = new Date().toISOString();
        ipReputations[ipIndex] = ip;
    } else {
        // Create new IP record
        const initialScore = result === 'success' ? 95 : 90;
        ipReputations.push({
            ip_address: ipAddress,
            reputation_score: initialScore,
            total_logins: 1,
            failed_logins: result === 'success' ? 0 : 1,
            successful_logins: result === 'success' ? 1 : 0,
            suspicious_activities: result === 'success' ? 0 : 1,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            is_blocked: false
        });
    }
    
    await writeJSON(IP_REPUTATION_FILE, ipReputations);
}

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// Authentication Endpoints
// ============================================

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password, deviceInfo, sessionId, rememberMe } = req.body;
        const ipAddress = getClientIP(req);
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Username and password required',
                timestamp: new Date().toISOString()
            });
        }
        
        // Read users
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        
        // Log login attempt
        const loginAttempts = await readJSON(LOGIN_ATTEMPTS_FILE);
        const attemptRecord = {
            attempt_id: loginAttempts.length + 1,
            timestamp: new Date().toISOString(),
            username,
            user_id: user?.user_id || null,
            session_id: sessionId,
            ip_address: ipAddress,
            device_fingerprint: deviceInfo?.fingerprint,
            user_agent: deviceInfo?.browser?.userAgent,
            password_length: password.length,
            remember_me: rememberMe
        };
        
        // Verify password (simple comparison - in production use hashing!)
        if (!user || user.password !== password) {
            // Failed login
            attemptRecord.attempt_status = 'FAILURE';
            attemptRecord.failure_reason = !user ? 'user_not_found' : 'invalid_password';
            
            loginAttempts.push(attemptRecord);
            await writeJSON(LOGIN_ATTEMPTS_FILE, loginAttempts);
            
            // Update IP reputation
            await updateIPReputation(ipAddress, 'failure');
            
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials',
                data: { remainingAttempts: 2 },
                timestamp: new Date().toISOString()
            });
        }
        
        // Successful login
        attemptRecord.attempt_status = 'SUCCESS';
        loginAttempts.push(attemptRecord);
        await writeJSON(LOGIN_ATTEMPTS_FILE, loginAttempts);
        
        // Create session
        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        const sessions = await readJSON(SESSIONS_FILE);
        sessions.push({
            session_id: sessionId,
            user_id: user.user_id,
            session_token: sessionToken,
            device_fingerprint: deviceInfo?.fingerprint,
            ip_address: ipAddress,
            user_agent: deviceInfo?.browser?.userAgent,
            created_at: new Date().toISOString(),
            expires_at: expiresAt,
            is_active: true
        });
        await writeJSON(SESSIONS_FILE, sessions);
        
        // Update IP reputation
        await updateIPReputation(ipAddress, 'success');
        
        res.json({
            status: 'success',
            message: 'Authentication successful',
            data: {
                userId: user.user_id.toString(),
                username: user.username,
                sessionToken,
                expiresAt,
                sessionId
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// Logging Endpoints
// ============================================

app.post('/api/log/event', async (req, res) => {
    try {
        const { timestamp, sessionId, eventType, eventData, deviceInfo } = req.body;
        const ipAddress = getClientIP(req);
        
        // Get user_id from session
        const sessions = await readJSON(SESSIONS_FILE);
        const session = sessions.find(s => s.session_id === sessionId);
        const userId = session?.user_id || null;
        
        // Read existing logs
        const eventLogs = await readJSON(EVENT_LOGS_FILE);
        
        // Create log entry
        const logEntry = {
            log_id: eventLogs.length + 1,
            timestamp: timestamp || new Date().toISOString(),
            session_id: sessionId,
            user_id: userId,
            event_type: eventType,
            event_data: eventData || {},
            ip_address: ipAddress,
            device_fingerprint: deviceInfo?.fingerprint,
            browser_info: deviceInfo?.browser || {},
            screen_info: deviceInfo?.screen || {},
            timezone_info: deviceInfo?.timezone || {},
            referrer: deviceInfo?.referrer,
            current_url: deviceInfo?.currentUrl
        };
        
        // Add to logs
        eventLogs.push(logEntry);
        await writeJSON(EVENT_LOGS_FILE, eventLogs);
        
        res.status(201).json({
            status: 'success',
            message: 'Event logged successfully',
            data: {
                logId: logEntry.log_id.toString(),
                eventType,
                timestamp: logEntry.timestamp
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Logging error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to log event',
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/log/batch', async (req, res) => {
    try {
        const { events } = req.body;
        const ipAddress = getClientIP(req);
        
        if (!events || events.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No events provided',
                timestamp: new Date().toISOString()
            });
        }
        
        const eventLogs = await readJSON(EVENT_LOGS_FILE);
        const sessions = await readJSON(SESSIONS_FILE);
        
        let loggedCount = 0;
        let failedCount = 0;
        
        for (const event of events) {
            try {
                const { timestamp, sessionId, eventType, eventData, deviceInfo } = event;
                
                // Get user_id
                const session = sessions.find(s => s.session_id === sessionId);
                const userId = session?.user_id || null;
                
                // Create log entry
                const logEntry = {
                    log_id: eventLogs.length + loggedCount + 1,
                    timestamp: timestamp || new Date().toISOString(),
                    session_id: sessionId,
                    user_id: userId,
                    event_type: eventType,
                    event_data: eventData || {},
                    ip_address: ipAddress,
                    device_fingerprint: deviceInfo?.fingerprint,
                    browser_info: deviceInfo?.browser || {},
                    screen_info: deviceInfo?.screen || {},
                    timezone_info: deviceInfo?.timezone || {},
                    referrer: deviceInfo?.referrer,
                    current_url: deviceInfo?.currentUrl
                };
                
                eventLogs.push(logEntry);
                loggedCount++;
                
            } catch (error) {
                console.error('Error logging event:', error);
                failedCount++;
            }
        }
        
        await writeJSON(EVENT_LOGS_FILE, eventLogs);
        
        res.status(201).json({
            status: 'success',
            message: 'Batch logged successfully',
            data: {
                eventsLogged: loggedCount,
                failedEvents: failedCount
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Batch logging error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to log batch',
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// IP Information Endpoint
// ============================================

app.get('/api/ip/info', async (req, res) => {
    try {
        const ipAddress = getClientIP(req);
        
        res.json({
            status: 'success',
            message: 'IP information retrieved',
            data: {
                ipAddress,
                ipType: 'IPv4',
                isProxy: false,
                isVPN: false,
                country: 'Sri Lanka',
                city: 'Negombo',
                region: 'Western Province',
                timezone: 'Asia/Colombo'
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('IP info error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get IP info',
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// Analytics Endpoints
// ============================================

app.get('/api/analytics/login-stats', async (req, res) => {
    try {
        const loginAttempts = await readJSON(LOGIN_ATTEMPTS_FILE);
        const { timeRange = '24h' } = req.query;
        
        // Calculate time threshold
        let hoursAgo;
        switch (timeRange) {
            case '1h': hoursAgo = 1; break;
            case '24h': hoursAgo = 24; break;
            case '7d': hoursAgo = 168; break;
            default: hoursAgo = 24;
        }
        
        const threshold = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
        
        // Filter recent attempts
        const recentAttempts = loginAttempts.filter(
            attempt => new Date(attempt.timestamp) > threshold
        );
        
        // Calculate stats
        const stats = {
            SUCCESS: {
                count: recentAttempts.filter(a => a.attempt_status === 'SUCCESS').length,
                unique_ips: new Set(recentAttempts.filter(a => a.attempt_status === 'SUCCESS').map(a => a.ip_address)).size,
                unique_users: new Set(recentAttempts.filter(a => a.attempt_status === 'SUCCESS').map(a => a.username)).size
            },
            FAILURE: {
                count: recentAttempts.filter(a => a.attempt_status === 'FAILURE').length,
                unique_ips: new Set(recentAttempts.filter(a => a.attempt_status === 'FAILURE').map(a => a.ip_address)).size,
                unique_users: new Set(recentAttempts.filter(a => a.attempt_status === 'FAILURE').map(a => a.username)).size
            }
        };
        
        res.json({
            status: 'success',
            data: stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get analytics',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/analytics/ip-reputation/:ip', async (req, res) => {
    try {
        const { ip } = req.params;
        const ipReputations = await readJSON(IP_REPUTATION_FILE);
        
        const ipData = ipReputations.find(item => item.ip_address === ip);
        
        if (!ipData) {
            return res.status(404).json({
                status: 'error',
                message: 'IP not found',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            status: 'success',
            data: ipData,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('IP reputation error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get IP reputation',
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// Data Export Endpoints (for research)
// ============================================

app.get('/api/export/all-logs', async (req, res) => {
    try {
        const eventLogs = await readJSON(EVENT_LOGS_FILE);
        const loginAttempts = await readJSON(LOGIN_ATTEMPTS_FILE);
        const ipReputations = await readJSON(IP_REPUTATION_FILE);
        const sessions = await readJSON(SESSIONS_FILE);
        
        res.json({
            status: 'success',
            data: {
                event_logs: eventLogs,
                login_attempts: loginAttempts,
                ip_reputation: ipReputations,
                sessions: sessions
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to export data',
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// Health Check
// ============================================

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        storage: 'JSON files',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================
// Start Server
// ============================================

initializeStorage().then(() => {
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════╗
║       IntelliSOC Backend Server               ║
║       No Database - JSON File Storage         ║
╚═══════════════════════════════════════════════╝

✅ Server running on port ${PORT}
✅ Storage: JSON files in ./data directory
✅ No database required!

Test Credentials:
  Username: admin     Password: admin123
  Username: user1     Password: password123
  Username: testuser  Password: test123

API Endpoints:
  POST   /api/auth/login
  POST   /api/log/event
  POST   /api/log/batch
  GET    /api/ip/info
  GET    /api/analytics/login-stats
  GET    /api/analytics/ip-reputation/:ip
  GET    /api/export/all-logs
  GET    /health

Data Storage Location:
  ${DATA_DIR}

Frontend Configuration:
  Update login.js endpoint to: http://localhost:${PORT}/api/log
        `);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing server');
    process.exit(0);
});
