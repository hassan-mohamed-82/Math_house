// 🚀 FIRST: Load Environment Variables BEFORE imports via hoisting
import "dotenv/config";

// 🔌 Built-in Modules
import http from "http";
import fs from "fs";
import path from "path";

// 📦 External Modules
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

// 🔄 App Modules
import ApiRoute from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { NotFound } from "./Errors";
// import { startCronJobs } from "./jobs/cronJobs";
// import { Server } from "socket.io";
// import { initSocket } from "./socket";
import { connectDB } from "./models/connection";

// 📝 Logging Setup
const logFile = path.join(__dirname, "../../server_debug.log");
const log = (msg: string) => {
  try {
    // Use synchronous append to ensure write happens before crash
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
  } catch (e) { console.error(e) }
};

log("Server.ts: Starting full application execution...");

const app = express();

// � Global Request Logger - Debugging 500
app.use((req, res, next) => {
  log(`[REQUEST] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// �🛡️ Security & Proxy
app.set("trust proxy", 1); // Essential for Passenger/Nginx
app.use(helmet({ crossOriginResourcePolicy: false }));

// 🔌 CORS Setup
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// 🍪 Middlewares
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// 📁 Static Files (Fixed path resolution)
// Use process.cwd() as backup if __dirname fails, but traverse up from dist/src/
const uploadsPath = path.resolve(__dirname, "../../uploads");
log(`Serving uploads from: ${uploadsPath}`);

if (!fs.existsSync(uploadsPath)) {
  log(`WARNING: Uploads directory does not exist at ${uploadsPath}`);
  // Optional: fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use("/uploads", express.static(uploadsPath));

// 🩺 Health Check
app.get("/api/test", (req, res, next) => {
  log("Received request on /api/test");
  res.json({ message: "API is working! (FULL MODE RESTORED)" });
});

// 🛣️ Main Routes
app.use("/api", ApiRoute);

// 🚫 404 Handler
app.use((req, res, next) => {
  throw new NotFound("Route not found");
});

// 🚨 Global Error Handler
app.use(errorHandler);

// 🚀 Server Startup
const httpServer = http.createServer(app);

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

  process.on('unhandledRejection', (reason: any, promise) => {
    log(`CRITICAL: Unhandled Rejection at: ${promise} reason: ${reason}`);
  });

  try {
    await connectDB();
    // startCronJobs();

    const PORT = process.env.PORT || 3000;
    log(`Attempting to listen on port/pipe: ${PORT}`);

    httpServer.listen(PORT, () => {
      log(`🚀 Server successfully started on port ${PORT}`);
      console.log(`🚀 Server is running on port/pipe ${PORT}`);
    });

  } catch (error: any) {
    log(`❌ CRITICAL STARTUP ERROR: ${error.message}`);
    log(error.stack);
    process.exit(1);
  }
};

startServer();

export default app;