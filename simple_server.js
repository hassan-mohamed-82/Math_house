const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Path to log file
const logFile = path.join(__dirname, 'minimal_debug.log');

// Log helper
const log = (msg) => {
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFile, `${timestamp} - ${msg}\n`);
    } catch (e) {
        console.error('Failed to write log:', e);
    }
};

log('Minimal server script started.');
log(`Current directory: ${process.cwd()}`);
log(`Node version: ${process.version}`);
log(`Platform: ${os.platform()}`);

try {
    const server = http.createServer((req, res) => {
        log(`Request received: ${req.method} ${req.url}`);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello! Node.js is working correctly on Plesk.');
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        log(`Server listening on port/pipe: ${PORT}`);
        console.log(`Server listening on port/pipe: ${PORT}`);
    });
} catch (error) {
    log(`CRITICAL ERROR: ${error.message}`);
    log(error.stack);
}
