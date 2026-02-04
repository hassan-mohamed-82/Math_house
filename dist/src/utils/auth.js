"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Errors_1 = require("../Errors");
require("dotenv/config");
const JWT_SECRET = process.env.JWT_SECRET;
// ═══════════════════════════════════════════════════════════════
// 🔐 GENERATE TOKEN
// ═══════════════════════════════════════════════════════════════
const generateToken = (data) => {
    const payload = {
        id: data.id,
        name: data.name,
        role: data.role,
    };
    // admin = 7 days, user = 30 days
    const expiresIn = data.role === 'admin' ? '7d' : '30d';
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn });
};
exports.generateToken = generateToken;
// ═══════════════════════════════════════════════════════════════
// ✅ VERIFY TOKEN
// ═══════════════════════════════════════════════════════════════
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        throw new Errors_1.UnauthorizedError('التوكن غير صالح أو منتهي الصلاحية');
    }
};
exports.verifyToken = verifyToken;
// ═══════════════════════════════════════════════════════════════
// 🔄 REFRESH TOKEN
// ═══════════════════════════════════════════════════════════════
const refreshToken = (oldToken) => {
    const decoded = (0, exports.verifyToken)(oldToken);
    const { iat, exp, ...payload } = decoded;
    const expiresIn = payload.role === 'admin' ? '7d' : '30d';
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn });
};
exports.refreshToken = refreshToken;
