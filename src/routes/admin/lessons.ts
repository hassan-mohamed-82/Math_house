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
} from "../../controllers/admin/lessons";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// ─── Lesson Routes ──────────────────────────────────────────────────────────
router.post("/", catchAsync(createLesson));
router.get("/", catchAsync(getAllLessons));
router.patch("/swap-order", catchAsync(swapLessonOrder));
router.get("/chapter/:chapterId", catchAsync(getLessonsByChapterId));
router.get("/:id", catchAsync(getLessonById));
router.put("/:id", catchAsync(updateLesson));
router.delete("/:id", catchAsync(deleteLesson));

// ─── Lesson Idea Routes ─────────────────────────────────────────────────────
router.post("/ideas", catchAsync(createLessonIdea));
router.get("/ideas/lesson/:lessonId", catchAsync(getIdeasByLessonId));
router.patch("/ideas/swap-order", catchAsync(swapIdeaOrder));
router.put("/ideas/:id", catchAsync(updateLessonIdea));
router.delete("/ideas/:id", catchAsync(deleteLessonIdea));

export default router;
