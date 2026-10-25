import { Router } from "express";
import {
    createRole,
    deleteRole,
    getAllRoles,
    getRoleById,
    updateRole,
    toggleRoleStatus,
    getAvailablePermissions,
    getAdminPermissions,
} from "../../controllers/admin/roles";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// ── Permission discovery ──
router.get("/available-permissions", requirePermission("roles", "View"), catchAsync(getAvailablePermissions));
router.get("/schema", requirePermission("roles", "View"), catchAsync(getAdminPermissions));

// ── List & detail ─────────────────────────────────────────────────────────
router.get("/",    requirePermission("roles", "View"),   catchAsync(getAllRoles));
router.get("/:id", requirePermission("roles", "View"),   catchAsync(getRoleById));

// ── Create ────────────────────────────────────────────────────────────────
router.post("/",   requirePermission("roles", "Add"),    catchAsync(createRole));

// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id", requirePermission("roles", "Edit"),   catchAsync(updateRole));

// ── Toggle status ─────────────────────────────────────────────────────────
router.patch("/:id/toggle", requirePermission("roles", "Status"), catchAsync(toggleRoleStatus));

// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id", requirePermission("roles", "Delete"), catchAsync(deleteRole));

export default router;