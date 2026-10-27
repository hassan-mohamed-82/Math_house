"use strict";
// src/middlewares/authorizeRoles.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = void 0;
const Errors_1 = require("../Errors");
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new Errors_1.UnauthorizedError("Not authenticated");
        }
        const userRole = (req.user.role || "").toLowerCase();
        // superadmin can access any route
        if (userRole === "superadmin" || userRole === "super_admin") {
            return next();
        }
        // Direct match
        if (roles.includes(req.user.role)) {
            return next();
        }
        // If route accepts "admin" and user has any admin role (e.g. "admin role")
        if (roles.includes("admin") && userRole.includes("admin")) {
            return next();
        }
        throw new Errors_1.UnauthorizedError("You don't have permission to access this resource");
    };
};
exports.authorizeRoles = authorizeRoles;
