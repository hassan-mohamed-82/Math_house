"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireDriveSuperAdmin = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const Errors_1 = require("../../Errors");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const requireDriveSuperAdmin = async (req, res, next) => {
    try {
        if (!req.user?.id) {
            throw new Errors_1.UnauthorizedError("Not authenticated");
        }
        if (req.user.role === "superadmin" || req.user.role === "driver") {
            return next();
        }
        const [admin] = await connection_1.db
            .select({
            id: schema_1.admins.id,
            type: schema_1.admins.type,
            status: schema_1.admins.status,
            roleName: schema_1.roles.name,
        })
            .from(schema_1.admins)
            .leftJoin(schema_1.roles, (0, drizzle_orm_1.eq)(schema_1.admins.roleId, schema_1.roles.id))
            .where((0, drizzle_orm_1.eq)(schema_1.admins.id, req.user.id))
            .limit(1);
        if (!admin || admin.status !== "active") {
            throw new Errors_1.UnauthorizedError("Account not found or inactive");
        }
        if (admin.type !== "super_admin" && admin.roleName !== "driver") {
            throw new Errors_1.UnauthorizedError("Only super admins or drivers can access Drive");
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireDriveSuperAdmin = requireDriveSuperAdmin;
