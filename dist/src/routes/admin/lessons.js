"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lessons_1 = require("../../controllers/admin/lessons");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// ── Selection helpers (open to any authenticated admin) ──────────────────
router.get("/select-chapters", (0, catchAsync_1.catchAsync)(lessons_1.selectChapters));
// ── Lesson Routes ─────────────────────────────────────────────────────────
router.get("/", (0, requirePermission_1.requirePermission)("lessons", "View"), (0, catchAsync_1.catchAsync)(lessons_1.getAllLessons));
router.get("/course/:courseId", (0, requirePermission_1.requirePermission)("lessons", "View"), (0, catchAsync_1.catchAsync)(lessons_1.getLessonsbyCourseId));
router.get("/chapter/:chapterId", (0, requirePermission_1.requirePermission)("lessons", "View"), (0, catchAsync_1.catchAsync)(lessons_1.getLessonsByChapterId));
router.get("/:id", (0, requirePermission_1.requirePermission)("lessons", "View"), (0, catchAsync_1.catchAsync)(lessons_1.getLessonById));
router.post("/", (0, requirePermission_1.requirePermission)("lessons", "Add"), (0, catchAsync_1.catchAsync)(lessons_1.createLesson));
router.put("/:id", (0, requirePermission_1.requirePermission)("lessons", "Edit"), (0, catchAsync_1.catchAsync)(lessons_1.updateLesson));
router.patch("/swap-order", (0, requirePermission_1.requirePermission)("lessons", "Edit"), (0, catchAsync_1.catchAsync)(lessons_1.swapLessonOrder));
router.delete("/:id", (0, requirePermission_1.requirePermission)("lessons", "Delete"), (0, catchAsync_1.catchAsync)(lessons_1.deleteLesson));
// ── Lesson Idea Routes ────────────────────────────────────────────────────
router.get("/ideas/lesson/:lessonId", (0, requirePermission_1.requirePermission)("lessons", "View"), (0, catchAsync_1.catchAsync)(lessons_1.getIdeasByLessonId));
router.post("/ideas", (0, requirePermission_1.requirePermission)("lessons", "Edit"), (0, catchAsync_1.catchAsync)(lessons_1.createLessonIdea));
router.patch("/ideas/swap-order", (0, requirePermission_1.requirePermission)("lessons", "Edit"), (0, catchAsync_1.catchAsync)(lessons_1.swapIdeaOrder));
router.put("/ideas/:id", (0, requirePermission_1.requirePermission)("lessons", "Edit"), (0, catchAsync_1.catchAsync)(lessons_1.updateLessonIdea));
router.delete("/ideas/:id", (0, requirePermission_1.requirePermission)("lessons", "Delete"), (0, catchAsync_1.catchAsync)(lessons_1.deleteLessonIdea));
exports.default = router;
