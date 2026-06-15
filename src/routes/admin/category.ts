import { Router } from "express";
import { createCategory, deleteCategory, getAllCategory, getCategoryById, updateCategory, getCategoryLineage } from "../../controllers/admin/category";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// ── List & detail ─────────────────────────────────────────────────────────
router.get("/",           requirePermission("categories", "View"), catchAsync(getAllCategory));
router.get("/lineage/:id",requirePermission("categories", "View"), catchAsync(getCategoryLineage));
router.get("/:id",        requirePermission("categories", "View"), catchAsync(getCategoryById));

// ── Create ────────────────────────────────────────────────────────────────
router.post("/",          requirePermission("categories", "Add"),  catchAsync(createCategory));

// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id",        requirePermission("categories", "Edit"), catchAsync(updateCategory));

// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id",     requirePermission("categories", "Delete"), catchAsync(deleteCategory));

export default router;