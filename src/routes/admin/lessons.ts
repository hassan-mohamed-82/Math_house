import { Router } from "express";
import {
    createLesson,
    getAllLessons,
    getLessonsByChapterId,
    swapLessonOrder,
    getLessonById,
    updateLesson,
    deleteLesson,
    createLessonIdea,
    getIdeasByLessonId,
    swapIdeaOrder,
    updateLessonIdea,
    deleteLessonIdea,
    selectChapters,
    getLessonsbyCourseId,
} from "../../controllers/admin/lessons";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// ── Selection helpers (open to any authenticated admin) ──────────────────
router.get("/select-chapters", catchAsync(selectChapters));

// ── Lesson Routes ─────────────────────────────────────────────────────────
router.get("/",                    requirePermission("lessons", "View"),   catchAsync(getAllLessons));
router.get("/course/:courseId",    requirePermission("lessons", "View"),   catchAsync(getLessonsbyCourseId));
router.get("/chapter/:chapterId",  requirePermission("lessons", "View"),   catchAsync(getLessonsByChapterId));
router.get("/:id",                 requirePermission("lessons", "View"),   catchAsync(getLessonById));

router.post("/",                   requirePermission("lessons", "Add"),    catchAsync(createLesson));

router.put("/:id",                 requirePermission("lessons", "Edit"),   catchAsync(updateLesson));
router.patch("/swap-order",        requirePermission("lessons", "Edit"),   catchAsync(swapLessonOrder));

router.delete("/:id",              requirePermission("lessons", "Delete"), catchAsync(deleteLesson));

// ── Lesson Idea Routes ────────────────────────────────────────────────────
router.get("/ideas/lesson/:lessonId", requirePermission("lessons", "View"),   catchAsync(getIdeasByLessonId));
router.post("/ideas",                 requirePermission("lessons", "Edit"),   catchAsync(createLessonIdea));
router.patch("/ideas/swap-order",     requirePermission("lessons", "Edit"),   catchAsync(swapIdeaOrder));
router.put("/ideas/:id",              requirePermission("lessons", "Edit"),   catchAsync(updateLessonIdea));
router.delete("/ideas/:id",           requirePermission("lessons", "Delete"), catchAsync(deleteLessonIdea));

export default router;

