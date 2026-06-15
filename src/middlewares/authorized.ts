// src/middlewares/authorizeRoles.ts

import { Request, Response, NextFunction, RequestHandler } from "express";
import { UnauthorizedError } from "../Errors";

type Role = "superadmin" | "admin" | "teacher" | "student" | "parent" | "driver";

export const authorizeRoles = (...roles: Role[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError("Not authenticated");
    }

    // superadmin can access any route
    if (req.user.role === "superadmin") {
      return next();
    }

    if (!roles.includes(req.user.role as Role)) {
      throw new UnauthorizedError("You don't have permission to access this resource");
    }

    next();
  };
};
