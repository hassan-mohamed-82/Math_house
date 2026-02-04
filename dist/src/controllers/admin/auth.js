"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const schema_1 = require("../../models/schema");
const connection_1 = require("../../models/connection");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_1 = __importDefault(require("bcrypt"));
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const jwt_1 = require("../../utils/jwt");
async function login(req, res) {
    const { email, password } = req.body;
    const admin = await connection_1.db
        .select()
        .from(schema_1.admins)
        .where((0, drizzle_orm_1.eq)(schema_1.admins.email, email))
        .limit(1);
    if (!admin[0]) {
        throw new Errors_1.UnauthorizedError("Invalid email or password");
    }
    const match = await bcrypt_1.default.compare(password, admin[0].password);
    if (!match) {
        throw new Errors_1.UnauthorizedError("Invalid email or password");
    }
    const tokenPayload = {
        id: admin[0].id,
        role: admin[0].type,
        email: admin[0].email,
        name: admin[0].name,
    };
    const token = (0, jwt_1.generateAdminToken)(tokenPayload);
    return (0, response_1.SuccessResponse)(res, {
        message: "Login successful",
        token,
        user: {
            id: admin[0].id,
            name: admin[0].name,
            email: admin[0].email,
            role: admin[0].type,
        },
    }, 200);
}
