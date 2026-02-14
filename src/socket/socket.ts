import { Server } from "socket.io";
import { QueueEvents } from "bullmq";
import { verifyToken } from "../utils/auth";
import { TokenPayload } from "../types/custom";

export const initSocket = (io: Server) => {
    // Middleware for Authentication
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];

            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }

            const decoded = verifyToken(token);

            // Allow Admin, Teacher, Student
            if (!["admin", "teacher", "student"].includes(decoded.role)) {
                return next(new Error("Authentication error: Unauthorized role"));
            }

            // Attach user to socket data for later use
            socket.data.user = decoded;
            next();
        } catch (err) {
            next(new Error("Authentication error: Invalid Token"));
        }
    });

    io.on("connection", (socket) => {
        const user = socket.data.user as TokenPayload;
        console.log(`[Socket] User connected: ${socket.id} (${user.role}: ${user.name})`);

        // Client can join a "room" to listen for their specific job
        socket.on("join-job-room", (jobId) => {
            socket.join(`job-${jobId}`);
            console.log(`[Socket] ${user.name} joined room job-${jobId}`);
        });

        socket.on("disconnect", () => {
            console.log(`[Socket] User disconnected: ${socket.id}`);
        });
    });

    // --- Queue Events Listener ---
    // This listens to the Redis queue and notifies the frontend when done
    const queueEvents = new QueueEvents("parallel-question-generation", {
        connection: {
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
        },
    });

    queueEvents.on("completed", async ({ jobId, returnvalue }) => {
        console.log(`[QueueEvents] Job ${jobId} completed!`);

        // Notify Frontend via WebSocket
        io.to(`job-${jobId}`).emit("question-ready", returnvalue);
    });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
        console.log(`[QueueEvents] Job ${jobId} failed: ${failedReason}`);
        io.to(`job-${jobId}`).emit("question-failed", { error: failedReason });
    });
};
