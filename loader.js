// loader.js: A robust entry point for Plesk/Passenger
const path = require('path');
const fs = require('fs');

// Log file for immediate feedback
const logFile = path.join(__dirname, 'loader_debug.log');
const log = (msg) => {
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFile, `${timestamp} - ${msg}\n`);
    } catch (e) {
        console.error('Failed to write log:', e);
    }
};

log('Starting loader.js...');
log(`Current directory (CWD): ${process.cwd()}`);
log(`Entry dirname: ${__dirname}`);
log(`Node Environment: ${process.env.NODE_ENV}`);

try {
    // Force CWD to be the directory of this script (project root)
    process.chdir(__dirname);
    log(`Changed directory to: ${process.cwd()}`);

    // Path to the actual compiled server file
    const serverPath = './dist/src/server.js';

    // Safety check: Does the file exist?
    if (!fs.existsSync(serverPath)) {
        throw new Error(`Compiled server file not found at: ${path.resolve(serverPath)}`);
    }

    log(`Found server file at: ${serverPath}. Attempting require...`);

    // Start the application
    require(serverPath);

    log('Successfully required server file. App should be running.');

} catch (error) {
    log(`CRITICAL LOADER ERROR: ${error.message}`);
    if (error.code === 'MODULE_NOT_FOUND') {
        log('Dependency error? Did you run "NPM Install" on the server?');
    }
    log(error.stack);

    // Keep process alive briefly so logs flush? rarely needed but safe.
    process.exit(1);
}
