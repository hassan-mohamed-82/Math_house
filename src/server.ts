import express from "express";
import path from "path";
import ApiRoute from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { NotFound } from "./Errors";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
// import { startCronJobs } from "./jobs/cronJobs";
import http from "http";
import fs from "fs";
// import { Server } from "socket.io";
// import { initSocket } from "./socket";

const logFile = path.join(__dirname, "../../server_debug.log");
const log = (msg: string) => fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);

log("Starting server.ts...");

try {
  dotenv.config();
  log("Environment loaded.");
} catch (e) {
  log(`Error loading dotenv: ${e}`);
}

const app = express();

// Trust proxy for correct IP/protocol behind Nginx/Passenger
app.set("trust proxy", 1);

const httpServer = http.createServer(app);
// const io = new Server(httpServer, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// initSocket(io);

// ✅ CORS بدون app.options
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

app.get("/api/test", (req, res, next) => {
  res.json({ message: "API is working! notify token" });
});

app.use("/api", ApiRoute);

app.use((req, res, next) => {
  throw new NotFound("Route not found");
});

app.use(errorHandler);

// startCronJobs();

// startCronJobs();

const PORT = process.env.PORT || 3000;
log(`Attempting to listen on port/pipe: ${PORT}`);

try {
  httpServer.listen(PORT, () => {
    log(`🚀 Server successfully started on port ${PORT}`);
    console.log(`🚀 Server is running on port/pipe ${PORT}`);
  });
} catch (error) {
  log(`❌ Failed to listen: ${error}`);
  process.exit(1);
}

export default app;