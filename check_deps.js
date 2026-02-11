const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'check_deps.log');
const log = (msg) => {
    try {
        fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) { console.error(e) }
};

log('Starting dependency check...');
log(`CWD: ${process.cwd()}`);

try {
    log('Attempting to require express...');
    const express = require('express');
    log(`SUCCESS: Express found at ${require.resolve('express')}`);

    // Also check other potential crashers
    log('Attempting to require dotenv...');
    require('dotenv');
    log('SUCCESS: dotenv found');

    log('Attempting to require cors...');
    require('cors');
    log('SUCCESS: cors found');

} catch (error) {
    log(`CRITICAL: Dependency check failed: ${error.message}`);
    log(error.stack);
}
