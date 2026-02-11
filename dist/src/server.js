"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const Errors_1 = require("./Errors");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
// import { startCronJobs } from "./jobs/cronJobs";
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
// import { Server } from "socket.io";
// import { initSocket } from "./socket";
const logFile = path_1.default.join(__dirname, "../../server_debug.log");
const log = (msg) => fs_1.default.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
log("Starting server.ts...");
try {
    dotenv_1.default.config();
    log("Environment loaded.");
}
catch (e) {
    log(`Error loading dotenv: ${e}`);
}
const app = (0, express_1.default)();
// Trust proxy for correct IP/protocol behind Nginx/Passenger
app.set("trust proxy", 1);
const httpServer = http_1.default.createServer(app);
// const io = new Server(httpServer, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });
// initSocket(io);
// ✅ CORS بدون app.options
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
}));
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../../uploads")));
log("Middleware configured.");
app.get("/api/test", (req, res, next) => {
    res.json({ message: "API is working! notify token" });
});
app.use("/api", routes_1.default);
app.use((req, res, next) => {
    throw new Errors_1.NotFound("Route not found");
});
app.use(errorHandler_1.errorHandler);
// startCronJobs();
// startCronJobs();
const PORT = process.env.PORT || 3000;
log(`Attempting to listen on port/pipe: ${PORT}`);
try {
    httpServer.listen(PORT, () => {
        log(`🚀 Server successfully started on port ${PORT}`);
        console.log(`🚀 Server is running on port/pipe ${PORT}`);
    });
}
catch (error) {
    log(`❌ Failed to listen: ${error}`);
    process.exit(1);
}
exports.default = app;
