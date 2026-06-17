// src/middlewares/requirePermission.ts
//
// Usage:
//   router.post("/", requirePermission("courses", "Add"), catchAsync(createCourse));
//
// How it works:
//   1. Expects `req.user` to already be set by the `authenticated` middleware.
//   2. Loads the admin row + joined role from the DB (fresh on every request, so
//      permission changes take effect without re-login).
//   3. Merges role-level permissions with admin-level override permissions.
//   4. super_admin type → bypass all permission checks.
//   5. Checks whether the merged set contains { module, action }.
//   6. Grants access (next()) or throws ForbiddenError.

import { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "../models/connection";
import { admins, roles } from "../models/schema";
import { eq } from "drizzle-orm";
import { ForbiddenError, UnauthorizedError } from "../Errors";
import type { Permission } from "../types/custom";
import type { ModuleName, ActionName } from "../types/constant";

// ─────────────────────────────────────────────────────────────────
// 🔧 Internal helpers
// ─────────────────────────────────────────────────────────────────

/** Safely parse a permissions value that might be a JSON string or already an array. */
function safeParsePermissions(raw: any): Permission[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Permission[];
    if (typeof raw === "string") {
        try {
            let parsed = JSON.parse(raw);
            // Handle double-encoded JSON
            while (typeof parsed === "string") {
                parsed = JSON.parse(parsed);
            }
            return Array.isArray(parsed) ? (parsed as Permission[]) : [];
        } catch {
            return [];
        }
    }
    return [];
}

/**
 * Merge role-level permissions with admin-level overrides.
 * Admin-level actions that already exist in the role are NOT duplicated.
 * Admin-level modules that don't exist in the role are appended.
 */
function mergePermissions(
    rolePerms: Permission[],
    adminPerms: Permission[]
): Permission[] {
    if (rolePerms.length === 0 && adminPerms.length === 0) return [];
    if (rolePerms.length === 0) return adminPerms;
    if (adminPerms.length === 0) return rolePerms;

    const merged: Permission[] = rolePerms.map((rp) => ({
        module: rp.module,
        actions: [...(rp.actions ?? [])],
    }));

    for (const ap of adminPerms) {
        if (!ap?.module || !Array.isArray(ap?.actions)) continue;

        const existing = merged.find((m) => m.module === ap.module);
        if (existing) {
            for (const act of ap.actions) {
                if (act && !existing.actions.includes(act)) {
                    existing.actions.push(act);
                }
            }
        } else {
            merged.push({ module: ap.module, actions: [...ap.actions] });
        }
    }

    return merged;
}

/**
 * Check whether `permissions` contains the required `module` + `action` pair.
 */
function hasPermission(
    permissions: Permission[],
    module: ModuleName,
    action: ActionName
): boolean {
    const modulePerm = permissions.find((p) => p.module === module);
    if (!modulePerm) return false;
    return modulePerm.actions.includes(action);
}

// ─────────────────────────────────────────────────────────────────
// 🛡️ requirePermission — the exported middleware factory
// ─────────────────────────────────────────────────────────────────

/**
 * Express middleware factory that guards a route by module + action.
 *
 * @param module  - The module constant (e.g. "courses", "categories")
 * @param action  - The action constant (e.g. "Add", "Edit", "Delete", "View", "Status")
 *
 * @example
 *   router.post("/", requirePermission("courses", "Add"), catchAsync(createCourse));
 *   router.delete("/:id", requirePermission("courses", "Delete"), catchAsync(deleteCourse));
 */
export const requirePermission = (
    module: ModuleName,
    action: ActionName
): RequestHandler => {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            // ── 1. Must be authenticated ──────────────────────────────────
            if (!req.user?.id) {
                throw new UnauthorizedError("Not authenticated");
            }

            // ── 2. Load admin + role from DB ──────────────────────────────
            const [adminRow] = await db
                .select({
                    id: admins.id,
                    type: admins.type,
                    status: admins.status,
                    permissions: admins.permissions,
                    rolePermissions: roles.permissions,
                })
                .from(admins)
                .leftJoin(roles, eq(admins.roleId, roles.id))
                .where(eq(admins.id, req.user.id))
                .limit(1);

            if (!adminRow) {
                throw new UnauthorizedError("Admin account not found");
            }

            if (adminRow.status !== "active") {
                throw new UnauthorizedError("Admin account is inactive");
            }

            // ── 3. super_admin type or superadmin role → bypass all permission checks ─────────────
            if (adminRow.type === "super_admin" || req.user.role === "superadmin") {
                return next();
            }

            // ── 4. Parse & merge permissions ──────────────────────────────
            const rolePerms = safeParsePermissions(adminRow.rolePermissions);
            const adminPerms = safeParsePermissions(adminRow.permissions);
            const merged = mergePermissions(rolePerms, adminPerms);

            // Attach merged permissions to req.user for downstream use
            req.user.permissions = merged;

            // ── 5. Check permission ───────────────────────────────────────
            if (!hasPermission(merged, module, action)) {
                throw new ForbiddenError(
                    `You don't have permission to ${action.toLowerCase()} ${module}. ` +
                    `Contact your administrator to request access.`
                );
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};
