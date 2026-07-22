"use strict";
// routes/quiz.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Quiz_1 = require("../../controllers/admin/Quiz");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// Selection API
router.get("/selection", (0, catchAsync_1.catchAsync)(Quiz_1.getSelection));
// Questions Bank
router.get("/questions/bank", (0, requirePermission_1.requirePermission)("quizzes", "View"), (0, catchAsync_1.catchAsync)(Quiz_1.getQuestionsBank));
router.get("/questions/filters", (0, catchAsync_1.catchAsync)(Quiz_1.getFilterOptions));
// Quiz CRUD
router.post("/", (0, requirePermission_1.requirePermission)("quizzes", "Add"), (0, catchAsync_1.catchAsync)(Quiz_1.createQuiz));
router.get("/", (0, requirePermission_1.requirePermission)("quizzes", "View"), (0, catchAsync_1.catchAsync)(Quiz_1.getAllQuizzes));
router.get("/lesson/:id", (0, requirePermission_1.requirePermission)("quizzes", "View"), (0, catchAsync_1.catchAsync)(Quiz_1.getQuizzesByLessonId));
router.get("/:id", (0, requirePermission_1.requirePermission)("quizzes", "View"), (0, catchAsync_1.catchAsync)(Quiz_1.getQuizById));
router.put("/:id", (0, requirePermission_1.requirePermission)("quizzes", "Edit"), (0, catchAsync_1.catchAsync)(Quiz_1.updateQuiz));
router.delete("/:id", (0, requirePermission_1.requirePermission)("quizzes", "Delete"), (0, catchAsync_1.catchAsync)(Quiz_1.deleteQuiz));
router.patch("/:id/toggle-active", (0, requirePermission_1.requirePermission)("quizzes", "Status"), (0, catchAsync_1.catchAsync)(Quiz_1.toggleQuizActive));
exports.default = router;
