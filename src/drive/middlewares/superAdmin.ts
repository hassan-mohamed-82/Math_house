import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { UnauthorizedError } from "../../Errors";
import { db } from "../../models/connection";
import { admins, roles } from "../../models/schema";

export const requireDriveSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.id) {
            throw new UnauthorizedError("Not authenticated");
        }

        if (req.user.role === "superadmin" || req.user.role === "driver") {
            return next();
        }

        const [admin] = await db
            .select({
                id: admins.id,
                type: admins.type,
                status: admins.status,
                roleName: roles.name,
            })
            .from(admins)
            .leftJoin(roles, eq(admins.roleId, roles.id))
            .where(eq(admins.id, req.user.id))
            .limit(1);

        if (!admin || admin.status !== "active") {
            throw new UnauthorizedError("Account not found or inactive");
        }

        if (admin.type !== "super_admin" && admin.roleName !== "driver") {
            throw new UnauthorizedError("Only super admins or drivers can access Drive");
        }

        next();
    } catch (error) {
        next(error);
    }
};