// Login Page JavaScript with Comprehensive Logging for IntelliSOC
// This script logs all user interactions for security monitoring and behavioral analysis

// ============================================
// Logging Configuration
// ============================================
const LOG_CONFIG = {
    enabled: true,
    endpoint: 'http://localhost:5000/api/log',  // Configure this to your IntelliSOC backend
    sessionId: generateSessionId(),
    deviceFingerprint: generateDeviceFingerprint()
};

// ============================================
// Utility Functions
// ============================================
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Fingerprint', 2, 2);
    return canvas.toDataURL().slice(-50);
}

function getIPAddress() {
    // In a real implementation, this would be fetched from a backend service
    return 'Client-Side (Use Backend)';
}

function getBrowserInfo() {
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        vendor: navigator.vendor,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
    };
}

function getScreenInfo() {
    return {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth
    };
}

function getTimezoneInfo() {
    return {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset()
    };
}

// ============================================
// Logging Functions
// ============================================
function createLogEntry(eventType, eventData) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        sessionId: LOG_CONFIG.sessionId,
        eventType: eventType,
        eventData: eventData,
        deviceInfo: {
            fingerprint: LOG_CONFIG.deviceFingerprint,
            browser: getBrowserInfo(),
            screen: getScreenInfo(),
            timezone: getTimezoneInfo(),
            referrer: document.referrer,
            currentUrl: window.location.href
        }
    };
    
    return logEntry;
}

function logEvent(eventType, eventData) {
    if (!LOG_CONFIG.enabled) return;
    
    const logEntry = createLogEntry(eventType, eventData);
    
    // Console logging for development
    console.log('🔒 IntelliSOC Log:', logEntry);
    
    // Send to backend (implement your API endpoint)
    sendToBackend(logEntry);
    
    // Store in localStorage for offline capability
    storeLogLocally(logEntry);
}

function sendToBackend(logEntry) {
    // Implement actual API call to your IntelliSOC backend
    // Example:
    /*
    fetch(LOG_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
    }).catch(err => console.error('Logging failed:', err));
    */
    
    // For now, just log to console
    console.log('📡 Would send to backend:', LOG_CONFIG.endpoint);
}

function storeLogLocally(logEntry) {
    try {
        const logs = JSON.parse(localStorage.getItem('intellisoc_logs') || '[]');
        logs.push(logEntry);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.shift();
        }
        
        localStorage.setItem('intellisoc_logs', JSON.stringify(logs));
    } catch (e) {
        console.error('Failed to store log locally:', e);
    }
}

// ============================================
// Page Load Tracking
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    logEvent('PAGE_LOAD', {
        page: 'login',
        loadTime: performance.now()
    });
});

window.addEventListener('load', () => {
    logEvent('PAGE_READY', {
        page: 'login',
        totalLoadTime: performance.now()
    });
});

// ============================================
// Form Elements
// ============================================
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const loginBtn = document.getElementById('loginBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const alertMessage = document.getElementById('alertMessage');

// ============================================
// Input Field Tracking
// ============================================
let usernameStartTime = null;
let passwordStartTime = null;

usernameInput.addEventListener('focus', () => {
    usernameStartTime = Date.now();
    logEvent('INPUT_FOCUS', {
        field: 'username',
        timestamp: new Date().toISOString()
    });
});

usernameInput.addEventListener('blur', () => {
    if (usernameStartTime) {
        const timeSpent = Date.now() - usernameStartTime;
        logEvent('INPUT_BLUR', {
            field: 'username',
            timeSpent: timeSpent,
            hasValue: usernameInput.value.length > 0,
            valueLength: usernameInput.value.length
        });
    }
});

usernameInput.addEventListener('input', () => {
    logEvent('INPUT_CHANGE', {
        field: 'username',
        length: usernameInput.value.length,
        timestamp: new Date().toISOString()
    });
});

passwordInput.addEventListener('focus', () => {
    passwordStartTime = Date.now();
    logEvent('INPUT_FOCUS', {
        field: 'password',
        timestamp: new Date().toISOString()
    });
});

passwordInput.addEventListener('blur', () => {
    if (passwordStartTime) {
        const timeSpent = Date.now() - passwordStartTime;
        logEvent('INPUT_BLUR', {
            field: 'password',
            timeSpent: timeSpent,
            hasValue: passwordInput.value.length > 0,
            valueLength: passwordInput.value.length
        });
    }
});

passwordInput.addEventListener('input', () => {
    logEvent('INPUT_CHANGE', {
        field: 'password',
        length: passwordInput.value.length,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Password Toggle Tracking
// ============================================
let passwordVisible = false;

togglePasswordBtn.addEventListener('click', () => {
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    
    logEvent('PASSWORD_TOGGLE', {
        visible: passwordVisible,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Form Submission with Comprehensive Logging
// ============================================
let loginAttemptCount = 0;
let firstAttemptTime = null;

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    loginAttemptCount++;
    
    if (!firstAttemptTime) {
        firstAttemptTime = Date.now();
    }
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Hide previous alerts
    alertMessage.style.display = 'none';
    
    // Validation
    if (!username || !password) {
        showAlert('error', 'Please enter both username and password');
        logEvent('LOGIN_ATTEMPT', {
            status: 'VALIDATION_FAILED',
            reason: 'empty_fields',
            attemptNumber: loginAttemptCount,
            timestamp: new Date().toISOString()
        });
        return;
    }
    
    // Show loading
    loginBtn.style.display = 'none';
    loadingSpinner.style.display = 'flex';
    
    // Log login attempt
    logEvent('LOGIN_ATTEMPT', {
        status: 'INITIATED',
        username: username, // In production, consider hashing or anonymizing
        passwordLength: password.length,
        rememberMe: rememberMe,
        attemptNumber: loginAttemptCount,
        timeSinceFirstAttempt: firstAttemptTime ? Date.now() - firstAttemptTime : 0,
        timestamp: new Date().toISOString(),
        ipAddress: getIPAddress() // Would need backend implementation
    });
    
    // Simulate authentication (replace with actual backend call)
    setTimeout(() => {
        // Mock authentication logic
        const isValidCredentials = authenticateUser(username, password);
        
        if (isValidCredentials) {
            // Success
            logEvent('LOGIN_SUCCESS', {
                username: username,
                attemptNumber: loginAttemptCount,
                totalTimeTaken: Date.now() - firstAttemptTime,
                timestamp: new Date().toISOString()
            });
            
            showAlert('success', 'Login successful! Redirecting to dashboard...');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html'; // Create this page
            }, 1500);
            
        } else {
            // Failure
            logEvent('LOGIN_FAILURE', {
                username: username,
                attemptNumber: loginAttemptCount,
                reason: 'invalid_credentials',
                timestamp: new Date().toISOString(),
                ipAddress: getIPAddress()
            });
            
            showAlert('error', 'Invalid username or password. Please try again.');
            
            // Hide loading, show button
            loadingSpinner.style.display = 'none';
            loginBtn.style.display = 'flex';
            
            // Clear password field
            passwordInput.value = '';
        }
    }, 2000);
});

// ============================================
// Mock Authentication (Replace with Backend)
// ============================================
function authenticateUser(username, password) {
    // Mock credentials for testing
    const validCredentials = {
        'admin': 'admin123',
        'user1': 'password123',
        'testuser': 'test123'
    };
    
    return validCredentials[username] === password;
}

// ============================================
// Alert Display Function
// ============================================
function showAlert(type, message) {
    alertMessage.className = `alert-message ${type}`;
    alertMessage.textContent = message;
    alertMessage.style.display = 'flex';
    
    logEvent('ALERT_SHOWN', {
        type: type,
        message: message,
        timestamp: new Date().toISOString()
    });
}

// ============================================
// Mouse Movement Tracking (Behavioral Analysis)
// ============================================
let mouseMovements = [];
let lastMouseTime = Date.now();

document.addEventListener('mousemove', (e) => {
    const currentTime = Date.now();
    
    // Log mouse movement every 500ms to avoid excessive logging
    if (currentTime - lastMouseTime > 500) {
        mouseMovements.push({
            x: e.clientX,
            y: e.clientY,
            timestamp: currentTime
        });
        
        // Keep only last 20 movements
        if (mouseMovements.length > 20) {
            mouseMovements.shift();
        }
        
        lastMouseTime = currentTime;
    }
});

// ============================================
// Keyboard Behavior Tracking
// ============================================
let keyPressTimings = [];

document.addEventListener('keydown', (e) => {
    keyPressTimings.push({
        key: e.key === 'Enter' ? 'Enter' : 'Key', // Don't log actual keys for security
        timestamp: Date.now()
    });
    
    if (keyPressTimings.length > 50) {
        keyPressTimings.shift();
    }
});

// ============================================
// Copy/Paste Detection
// ============================================
usernameInput.addEventListener('paste', () => {
    logEvent('PASTE_DETECTED', {
        field: 'username',
        timestamp: new Date().toISOString()
    });
});

passwordInput.addEventListener('paste', () => {
    logEvent('PASTE_DETECTED', {
        field: 'password',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Tab Visibility Tracking
// ============================================
document.addEventListener('visibilitychange', () => {
    logEvent('TAB_VISIBILITY_CHANGE', {
        hidden: document.hidden,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Page Unload Tracking
// ============================================
window.addEventListener('beforeunload', () => {
    logEvent('PAGE_UNLOAD', {
        timeOnPage: Date.now() - performance.timing.navigationStart,
        loginAttempts: loginAttemptCount,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Browser Console Detection (Security)
// ============================================
(function() {
    const devtools = { open: false };
    const threshold = 160;
    
    setInterval(() => {
        if (window.outerWidth - window.innerWidth > threshold || 
            window.outerHeight - window.innerHeight > threshold) {
            if (!devtools.open) {
                devtools.open = true;
                logEvent('DEVTOOLS_OPENED', {
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            if (devtools.open) {
                devtools.open = false;
                logEvent('DEVTOOLS_CLOSED', {
                    timestamp: new Date().toISOString()
                });
            }
        }
    }, 1000);
})();

// ============================================
// Export Logs Function (for testing)
// ============================================
window.exportLogs = function() {
    const logs = JSON.parse(localStorage.getItem('intellisoc_logs') || '[]');
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `intellisoc_logs_${Date.now()}.json`;
    link.click();
    
    console.log('✅ Logs exported successfully');
};

// ============================================
// Clear Logs Function (for testing)
// ============================================
window.clearLogs = function() {
    localStorage.removeItem('intellisoc_logs');
    console.log('🗑️ Logs cleared');
};

// ============================================
// Console Info
// ============================================
console.log('%c🔒 IntelliSOC Security Monitoring Active', 'color: #4A90E2; font-size: 16px; font-weight: bold;');
console.log('%cSession ID:', 'color: #666; font-weight: bold;', LOG_CONFIG.sessionId);
console.log('%cTo export logs, run: exportLogs()', 'color: #666;');
console.log('%cTo clear logs, run: clearLogs()', 'color: #666;');
