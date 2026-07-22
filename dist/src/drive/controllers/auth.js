"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const drizzle_orm_1 = require("drizzle-orm");
const Errors_1 = require("../../Errors");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const response_1 = require("../../utils/response");
const jwt_1 = require("../../utils/jwt");
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new Errors_1.BadRequest("Email and password are required");
    }
    const [admin] = await connection_1.db
        .select()
        .from(schema_1.admins)
        .where((0, drizzle_orm_1.eq)(schema_1.admins.email, email));
    if (!admin) {
        throw new Errors_1.UnauthorizedError("Invalid Credentials");
    }
    const isPasswordValid = await bcrypt_1.default.compare(password, admin.password);
    if (!isPasswordValid) {
        throw new Errors_1.UnauthorizedError("Invalid Credentials");
    }
    if (admin.status !== "active") {
        throw new Errors_1.UnauthorizedError("Admin is inactive");
    }
    let role = null;
    if (admin.roleId) {
        const [roleRow] = await connection_1.db.select().from(schema_1.roles).where((0, drizzle_orm_1.eq)(schema_1.roles.id, admin.roleId));
        role = roleRow;
    }
    const isSuperAdmin = admin.type === "super_admin";
    const isDriver = role && role.name === "driver";
    if (!isSuperAdmin && !isDriver) {
        throw new Errors_1.UnauthorizedError("Only super admins or drivers can access Drive");
    }
    const token = (0, jwt_1.generateAdminToken)({
        id: admin.id,
        name: admin.name,
        role: (isSuperAdmin ? "superadmin" : "driver"),
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Drive login successful",
        token,
        admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            phoneNumber: admin.phoneNumber,
            type: admin.type,
            status: admin.status,
        },
    }, 200);
};
exports.login = login;
