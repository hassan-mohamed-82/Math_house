"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = void 0;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const Errors_1 = require("../Errors");
// ─────────────────────────────────────────────────────────────────
// 🔧 Internal helpers
// ─────────────────────────────────────────────────────────────────
/** Safely parse a permissions value that might be a JSON string or already an array. */
function safeParsePermissions(raw) {
    if (!raw)
        return [];
    if (Array.isArray(raw))
        return raw;
    if (typeof raw === "string") {
        try {
            let parsed = JSON.parse(raw);
            // Handle double-encoded JSON
            while (typeof parsed === "string") {
                parsed = JSON.parse(parsed);
            }
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
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
function mergePermissions(rolePerms, adminPerms) {
    if (rolePerms.length === 0 && adminPerms.length === 0)
        return [];
    if (rolePerms.length === 0)
        return adminPerms;
    if (adminPerms.length === 0)
        return rolePerms;
    const merged = rolePerms.map((rp) => ({
        module: rp.module,
        actions: [...(rp.actions ?? [])],
    }));
    for (const ap of adminPerms) {
        if (!ap?.module || !Array.isArray(ap?.actions))
            continue;
        const existing = merged.find((m) => m.module === ap.module);
        if (existing) {
            for (const act of ap.actions) {
                if (act && !existing.actions.includes(act)) {
                    existing.actions.push(act);
                }
            }
        }
        else {
            merged.push({ module: ap.module, actions: [...ap.actions] });
        }
    }
    return merged;
}
/**
 * Check whether `permissions` contains the required `module` + `action` pair.
 */
function hasPermission(permissions, module, action) {
    const modulePerm = permissions.find((p) => p.module === module);
    if (!modulePerm)
        return false;
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
const requirePermission = (module, action) => {
    return async (req, _res, next) => {
        try {
            // ── 1. Must be authenticated ──────────────────────────────────
            if (!req.user?.id) {
                throw new Errors_1.UnauthorizedError("Not authenticated");
            }
            // ── 2. Load admin + role from DB ──────────────────────────────
            const [adminRow] = await connection_1.db
                .select({
                id: schema_1.admins.id,
                type: schema_1.admins.type,
                status: schema_1.admins.status,
                permissions: schema_1.admins.permissions,
                rolePermissions: schema_1.roles.permissions,
            })
                .from(schema_1.admins)
                .leftJoin(schema_1.roles, (0, drizzle_orm_1.eq)(schema_1.admins.roleId, schema_1.roles.id))
                .where((0, drizzle_orm_1.eq)(schema_1.admins.id, req.user.id))
                .limit(1);
            if (!adminRow) {
                throw new Errors_1.UnauthorizedError("Admin account not found");
            }
            if (adminRow.status !== "active") {
                throw new Errors_1.UnauthorizedError("Admin account is inactive");
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
                throw new Errors_1.ForbiddenError(`You don't have permission to ${action.toLowerCase()} ${module}. ` +
                    `Contact your administrator to request access.`);
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
};
exports.requirePermission = requirePermission;
