import { Router } from "express";
import {
    createChapter,
    getAllChapters,
    getAllChaptersByCourseId,
    swapChapterOrder,
    getChapterById,
    updateChapter,
    deleteChapter
} from "../../controllers/admin/chapters";
import { getSemestersByCourseId } from "../../controllers/admin/semester";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// ── Selection helpers (open to any authenticated admin) ──────────────────
router.get("/selectionSemester/:courseId", catchAsync(getSemestersByCourseId));

// ── List & detail ─────────────────────────────────────────────────────────
router.get("/",                   requirePermission("chapters", "View"),   catchAsync(getAllChapters));
router.get("/course/:courseId",   requirePermission("chapters", "View"),   catchAsync(getAllChaptersByCourseId));
router.get("/:id",                requirePermission("chapters", "View"),   catchAsync(getChapterById));

// ── Create ────────────────────────────────────────────────────────────────
router.post("/",                  requirePermission("chapters", "Add"),    catchAsync(createChapter));

// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id",                requirePermission("chapters", "Edit"),   catchAsync(updateChapter));
router.patch("/swap-order",       requirePermission("chapters", "Edit"),   catchAsync(swapChapterOrder));

// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id",             requirePermission("chapters", "Delete"), catchAsync(deleteChapter));

export default router;