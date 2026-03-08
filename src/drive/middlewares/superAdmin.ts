import { NextFunction, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { UnauthorizedError } from "../../Errors";
import { db } from "../../models/connection";
import { admins } from "../../models/schema";

export const requireDriveSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.id || req.user.role !== "admin") {
            throw new UnauthorizedError("Not authenticated");
        }

        const [admin] = await db
            .select({
                id: admins.id,
                type: admins.type,
                status: admins.status,
            })
            .from(admins)
            .where(and(eq(admins.id, req.user.id), eq(admins.type, "super_admin")));

        if (!admin || admin.status !== "active") {
            throw new UnauthorizedError("Only super admins can access Drive");
        }

        next();
    } catch (error) {
        next(error);
    }
};