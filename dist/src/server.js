"use strict";
// import express from "express";
// import path from "path";
// import ApiRoute from "./routes";
// import { errorHandler } from "./middlewares/errorHandler";
// import { NotFound } from "./Errors";
// import dotenv from "dotenv";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import helmet from "helmet";
// // import { startCronJobs } from "./jobs/cronJobs";
// import http from "http";
// import fs from "fs";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Minimal import block
const express_1 = __importDefault(require("express"));
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
log("Server.ts: Starting minimal execution...");
try {
    // dotenv.config();
    log("Environment config skipped (minimal mode).");
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
/*
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

log("Middleware configured.");
*/
app.get("/api/test", (req, res, next) => {
    log("Received request on /api/test");
    res.json({ message: "API is working! notify token (MINIMAL MODE)" });
});
/*
app.use("/api", ApiRoute);

app.use((req, res, next) => {
  throw new NotFound("Route not found");
});

app.use(errorHandler);
*/
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
