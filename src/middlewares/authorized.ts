// src/middlewares/authorizeRoles.ts

import { Request, Response, NextFunction, RequestHandler } from "express";
import { UnauthorizedError } from "../Errors";

type Role = "superadmin" | "admin" | "teacher" | "student" | "parent" | "driver";

export const authorizeRoles = (...roles: Role[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError("Not authenticated");
    }

    const userRole = (req.user.role || "").toLowerCase();

    // superadmin can access any route
    if (userRole === "superadmin" || userRole === "super_admin") {
      return next();
    }

    // Direct match
    if (roles.includes(req.user.role as Role)) {
      return next();
    }

    // If route accepts "admin" and user has any admin role (e.g. "admin role")
    if (roles.includes("admin") && userRole.includes("admin")) {
      return next();
    }

    throw new UnauthorizedError("You don't have permission to access this resource");
  };
};
