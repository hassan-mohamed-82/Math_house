"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireDriveSuperAdmin = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const Errors_1 = require("../../Errors");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const requireDriveSuperAdmin = async (req, res, next) => {
    try {
        if (!req.user?.id || req.user.role !== "admin") {
            throw new Errors_1.UnauthorizedError("Not authenticated");
        }
        const [admin] = await connection_1.db
            .select({
            id: schema_1.admins.id,
            type: schema_1.admins.type,
            status: schema_1.admins.status,
        })
            .from(schema_1.admins)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.admins.id, req.user.id), (0, drizzle_orm_1.eq)(schema_1.admins.type, "super_admin")));
        if (!admin || admin.status !== "active") {
            throw new Errors_1.UnauthorizedError("Only super admins can access Drive");
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireDriveSuperAdmin = requireDriveSuperAdmin;
