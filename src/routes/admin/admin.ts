import { Router } from "express";
import {
    createAdmin,
    deleteAdmin,
    getAllAdmins,
    getAdminById,
    updateAdmin,
    toggleAdminStatus,
    select,
} from "../../controllers/admin/admin";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// ── List & detail ─────────────────────────────────────────────────────────
router.get("/",    requirePermission("admins", "View"),   catchAsync(getAllAdmins));
router.get("/select",requirePermission("admins", "View"), catchAsync(select));
router.get("/:id", requirePermission("admins", "View"),   catchAsync(getAdminById));

// ── Create ────────────────────────────────────────────────────────────────
router.post("/",   requirePermission("admins", "Add"),    catchAsync(createAdmin));

// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id", requirePermission("admins", "Edit"),   catchAsync(updateAdmin));

// ── Toggle status ─────────────────────────────────────────────────────────
router.patch("/:id/toggle", requirePermission("admins", "Status"), catchAsync(toggleAdminStatus));

// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id", requirePermission("admins", "Delete"), catchAsync(deleteAdmin));

export default router;