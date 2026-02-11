"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lessons_1 = require("../../controllers/admin/lessons");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
// ─── Lesson Routes ──────────────────────────────────────────────────────────
router.post("/", (0, catchAsync_1.catchAsync)(lessons_1.createLesson));
router.get("/", (0, catchAsync_1.catchAsync)(lessons_1.getAllLessons));
router.patch("/swap-order", (0, catchAsync_1.catchAsync)(lessons_1.swapLessonOrder));
router.get("/chapter/:chapterId", (0, catchAsync_1.catchAsync)(lessons_1.getLessonsByChapterId));
router.get("/:id", (0, catchAsync_1.catchAsync)(lessons_1.getLessonById));
router.put("/:id", (0, catchAsync_1.catchAsync)(lessons_1.updateLesson));
router.delete("/:id", (0, catchAsync_1.catchAsync)(lessons_1.deleteLesson));
// ─── Lesson Idea Routes ─────────────────────────────────────────────────────
router.post("/ideas", (0, catchAsync_1.catchAsync)(lessons_1.createLessonIdea));
router.get("/ideas/lesson/:lessonId", (0, catchAsync_1.catchAsync)(lessons_1.getIdeasByLessonId));
router.patch("/ideas/swap-order", (0, catchAsync_1.catchAsync)(lessons_1.swapIdeaOrder));
router.put("/ideas/:id", (0, catchAsync_1.catchAsync)(lessons_1.updateLessonIdea));
router.delete("/ideas/:id", (0, catchAsync_1.catchAsync)(lessons_1.deleteLessonIdea));
exports.default = router;
