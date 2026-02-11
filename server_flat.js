"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logFile = path_1.default.join(__dirname, "../../SERVER_CRASH.log");
const log = (msg) => {
    try {
        fs_1.default.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
    }
    catch (e) {
        console.error(e);
    }
};
log("Server.ts: Starting pure node execution...");
try {
    const server = http_1.default.createServer((req, res) => {
        log(`Received request: ${req.method} ${req.url}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "API is working! PURE NODE MODE" }));
    });
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        log(`Server listening on port/pipe: ${PORT}`);
        console.log(`Server listening on port/pipe: ${PORT}`);
    });
}
catch (e) {
    log(`FATAL ERROR: ${e.message}`);
}
