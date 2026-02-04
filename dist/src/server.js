"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const Errors_1 = require("./Errors");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const connection_1 = require("./models/connection");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: false }));
app.use((0, cors_1.default)({ origin: "*" }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "20mb" }));
const uploadsPath = path_1.default.join(process.cwd(), "uploads");
app.use("/uploads", express_1.default.static(uploadsPath));
app.use("/api", routes_1.default);
app.use((req, res, next) => {
    throw new Errors_1.NotFound("Route not found");
});
app.use(errorHandler_1.errorHandler);
const server = http_1.default.createServer(app);
const startServer = async () => {
    await (0, connection_1.connectDB)();
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
};
startServer();
exports.default = app;
