import express from "express";
import http from "http";
import ApiRoute from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { NotFound } from "./Errors";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { connectDB } from "./models/connection";
import path from "path";

dotenv.config();

const app = express();

// Trust proxy for correct IP/protocol behind Nginx/Passenger
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: "*" }));
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsPath));

app.use("/api", ApiRoute);

app.use((req, res, next) => {
  throw new NotFound("Route not found");
});

app.use(errorHandler);

const server = http.createServer(app);

const startServer = async () => {
  await connectDB();


  const PORT = process.env.PORT || 3000;
  /* 
   * Bind explicitly to 0.0.0.0 for Passenger/Container compatibility.
   * Passenger will still manage the port via process.env.PORT, but this ensures
   * the app is reachable on all interfaces if run standalone or in container.
   */
  server.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });

  // Graceful shutdown logic
  const shutdown = () => {
    console.log("🛑 Received kill signal, shutting down gracefully...");
    server.close(() => {
      console.log("✅ Closed out remaining connections.");
      process.exit(0);
    });

    // Force close if it takes too long
    setTimeout(() => {
      console.error("❌ Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

startServer();

export default app;
