const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });

    let output = `<h1>Node.js Diagnostic Output</h1>`;
    output += `<p><strong>Platform:</strong> ${os.platform()} ${os.release()}</p>`;
    output += `<p><strong>Node Version:</strong> ${process.version}</p>`;
    output += `<p><strong>CWD:</strong> ${process.cwd()}</p>`;
    output += `<p><strong>__dirname:</strong> ${__dirname}</p>`;
    output += `<p><strong>ENV.PORT:</strong> ${process.env.PORT || 'undefined (using 3000)'}</p>`;

    // Check if node_modules exists
    const nmPath = path.join(process.cwd(), 'node_modules');
    const nmExists = fs.existsSync(nmPath);
    output += `<p><strong>node_modules exists:</strong> ${nmExists ? 'YES' : 'NO'}</p>`;

    if (nmExists) {
        try {
            const contents = fs.readdirSync(nmPath);
            output += `<p><strong>Items in node_modules:</strong> ${contents.length}</p>`;
            output += `<p><strong>Has express:</strong> ${contents.includes('express')}</p>`;
        } catch (e) {
            output += `<p style="color:red">Error reading node_modules: ${e.message}</p>`;
        }
    }

    // Try to require('express')
    try {
        const express = require('express');
        output += `<p style="color:green"><strong>require('express') SUCCESS</strong> resolved to: ${require.resolve('express')}</p>`;
    } catch (e) {
        output += `<p style="color:red"><strong>require('express') FAILED:</strong> ${e.message}</p>`;
        output += `<pre>${e.stack}</pre>`;
    }

    // Check logs write permission
    try {
        const logTest = path.join(__dirname, 'write_test.log');
        fs.writeFileSync(logTest, 'test');
        fs.unlinkSync(logTest); // clean up
        output += `<p style="color:green"><strong>FileSystem Write OK</strong> (can write to ${__dirname})</p>`;
    } catch (e) {
        output += `<p style="color:red"><strong>FileSystem Write FAILED:</strong> ${e.message}</p>`;
    }

    res.end(output);
}).listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
