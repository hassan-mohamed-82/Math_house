"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 🚀 FIRST: Load Environment Variables BEFORE imports via hoisting
require("dotenv/config");
// 🔌 Built-in Modules
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 📦 External Modules
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
// 🔄 App Modules
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const Errors_1 = require("./Errors");
// import { startCronJobs } from "./jobs/cronJobs";
// import { Server } from "socket.io";
// import { initSocket } from "./socket";
const connection_1 = require("./models/connection");
// 📝 Logging Setup
const logFile = path_1.default.join(__dirname, "../../server_debug.log");
const log = (msg) => {
    try {
        // Use synchronous append to ensure write happens before crash
        fs_1.default.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
    }
    catch (e) {
        console.error(e);
    }
};
log("Server.ts: Starting full application execution...");
const app = (0, express_1.default)();
// � Global Request Logger - Debugging 500
app.use((req, res, next) => {
    log(`[REQUEST] ${req.method} ${req.url} from ${req.ip}`);
    next();
});
// �🛡️ Security & Proxy
app.set("trust proxy", 1); // Essential for Passenger/Nginx
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: false }));
// 🔌 CORS Setup
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
}));
// 🍪 Middlewares
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "20mb" }));
// 📁 Static Files (Fixed path resolution)
// Use process.cwd() as backup if __dirname fails, but traverse up from dist/src/
const uploadsPath = path_1.default.resolve(__dirname, "../../uploads");
log(`Serving uploads from: ${uploadsPath}`);
if (!fs_1.default.existsSync(uploadsPath)) {
    log(`WARNING: Uploads directory does not exist at ${uploadsPath}`);
    // Optional: fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use("/uploads", express_1.default.static(uploadsPath));
// 🩺 Health Check
app.get("/api/test", (req, res, next) => {
    log("Received request on /api/test");
    res.json({ message: "API is working! (FULL MODE RESTORED)" });
});
// 🛣️ Main Routes
app.use("/api", routes_1.default);
// 🚫 404 Handler
app.use((req, res, next) => {
    throw new Errors_1.NotFound("Route not found");
});
// 🚨 Global Error Handler
app.use(errorHandler_1.errorHandler);
// 🚀 Server Startup
const httpServer = http_1.default.createServer(app);
/*
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
initSocket(io);
*/
const startServer = async () => {
    // Global Exception Handlers
    process.on('uncaughtException', (err) => {
        log(`CRITICAL: Uncaught Exception: ${err.message}`);
        log(err.stack || '');
        // process.exit(1); // Don't crash immediately if possible
    });
    process.on('unhandledRejection', (reason, promise) => {
        log(`CRITICAL: Unhandled Rejection at: ${promise} reason: ${reason}`);
    });
    try {
        await (0, connection_1.connectDB)();
        // startCronJobs();
        const PORT = process.env.PORT || 3000;
        log(`Attempting to listen on port/pipe: ${PORT}`);
        httpServer.listen(PORT, () => {
            log(`🚀 Server successfully started on port ${PORT}`);
            console.log(`🚀 Server is running on port/pipe ${PORT}`);
        });
    }
    catch (error) {
        log(`❌ CRITICAL STARTUP ERROR: ${error.message}`);
        log(error.stack);
        process.exit(1);
    }
};
startServer();
exports.default = app;
