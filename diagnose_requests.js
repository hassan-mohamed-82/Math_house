const http = require('http');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'diagnose_requests.log');
const log = (msg) => {
    try {
        fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) { console.error(e) }
};

log('diagnose_requests.js started.');

const server = http.createServer((req, res) => {
    log(`[RAW HTTP] Received request: ${req.method} ${req.url}`);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    if (req.url === '/health') {
        res.end('Health Check OK');
    } else if (req.url === '/api/test') {
        res.end('API Test OK');
    } else {
        res.end(`Received request for: ${req.url}`);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    log(`Server listening on port/pipe: ${PORT}`);
    console.log(`Server listening on port/pipe: ${PORT}`);
});
