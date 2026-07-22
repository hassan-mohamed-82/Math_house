"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const questions_1 = require("../../controllers/admin/questions");
const catchAsync_1 = require("../../utils/catchAsync");
const multer_1 = require("../../middlewares/multer");
const questions_2 = require("../../controllers/admin/questions");
const examCodes_1 = require("../../controllers/admin/examCodes");
const lessons_1 = require("../../controllers/admin/lessons");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// ── Selection helpers (open to any authenticated admin) ──────────────────
router.get("/selectionExamCode", (0, catchAsync_1.catchAsync)(examCodes_1.getExamCodes));
router.get("/selectionLesson", (0, catchAsync_1.catchAsync)(lessons_1.selectLessons));
router.get("/selectionDriveContents", (0, catchAsync_1.catchAsync)(questions_2.selectDriveContents));
// ── OCR / AI helpers ──────────────────────────────────────────────────────
router.post("/ocr", (0, requirePermission_1.requirePermission)("questions", "Add"), multer_1.upload.single("image"), (0, catchAsync_1.catchAsync)(questions_1.getTextfromImage));
router.post("/parallel/generate", (0, requirePermission_1.requirePermission)("questions", "Add"), (0, catchAsync_1.catchAsync)(questions_2.sendParallelQuestionGenerate));
// ── Parallel questions ────────────────────────────────────────────────────
router.get("/parallel", (0, requirePermission_1.requirePermission)("questions", "View"), (0, catchAsync_1.catchAsync)(questions_2.getAllParallelQuestions));
router.get("/parallel/original/:id", (0, requirePermission_1.requirePermission)("questions", "View"), (0, catchAsync_1.catchAsync)(questions_2.getParallelQuestionsByOriginalId));
router.get("/parallel/:id", (0, requirePermission_1.requirePermission)("questions", "View"), (0, catchAsync_1.catchAsync)(questions_2.getParallelQuestionbyId));
router.post("/parallel", (0, requirePermission_1.requirePermission)("questions", "Add"), (0, catchAsync_1.catchAsync)(questions_2.createParallelQuestion));
router.put("/parallel/:id", (0, requirePermission_1.requirePermission)("questions", "Edit"), (0, catchAsync_1.catchAsync)(questions_2.updateParallelQuestion));
router.delete("/parallel/:id", (0, requirePermission_1.requirePermission)("questions", "Delete"), (0, catchAsync_1.catchAsync)(questions_2.deleteParallelQuestion));
// ── Main questions ────────────────────────────────────────────────────────
router.get("/", (0, requirePermission_1.requirePermission)("questions", "View"), (0, catchAsync_1.catchAsync)(questions_2.getAllQuestions));
router.get("/course/:courseId", (0, requirePermission_1.requirePermission)("questions", "View"), (0, catchAsync_1.catchAsync)(questions_2.getQuestionsbyCourseId));
router.get("/lesson/:id", (0, requirePermission_1.requirePermission)("questions", "View"), (0, catchAsync_1.catchAsync)(questions_2.getQuestionsbyLessonId));
router.get("/section/:sectionId", (0, requirePermission_1.requirePermission)("questions", "View"), (0, catchAsync_1.catchAsync)(questions_2.getQuestionsbySectiondId));
router.get("/:id", (0, requirePermission_1.requirePermission)("questions", "View"), (0, catchAsync_1.catchAsync)(questions_2.getQuestionbyId));
router.post("/", (0, requirePermission_1.requirePermission)("questions", "Add"), (0, catchAsync_1.catchAsync)(questions_2.createQuestion));
router.put("/:id", (0, requirePermission_1.requirePermission)("questions", "Edit"), (0, catchAsync_1.catchAsync)(questions_2.updateQuestion));
router.delete("/:id", (0, requirePermission_1.requirePermission)("questions", "Delete"), (0, catchAsync_1.catchAsync)(questions_2.deleteQuestion));
exports.default = router;
