"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const authorized_1 = require("../../middlewares/authorized");
const exams_1 = require("../../controllers/user/exams");
const router = (0, express_1.Router)();
router.use((0, authorized_1.authorizeRoles)("student"));
// ── Core exam flow ───────────────────────────────────────────────────────────
router.get("/", (0, catchAsync_1.catchAsync)(exams_1.getExams));
router.get("/attempts", (0, catchAsync_1.catchAsync)(exams_1.getExamAttemptsHistory));
router.get("/:examId", (0, catchAsync_1.catchAsync)(exams_1.getExamById));
router.post("/:examId/start", (0, catchAsync_1.catchAsync)(exams_1.startExam));
router.post("/:examId/submit", (0, catchAsync_1.catchAsync)(exams_1.submitExam));
// ── Per-section flow (sectioned exams) ───────────────────────────────────────
// Start or resume a specific section within an active exam attempt
router.get("/:examId/attempts/:attemptId/sections/:examSectionId/start", (0, catchAsync_1.catchAsync)(exams_1.startSection));
// Start a break after completing a section
router.get("/:examId/attempts/:attemptId/sections/:examSectionId/break", (0, catchAsync_1.catchAsync)(exams_1.startBreak));
// Submit answers for a section and end it
router.post("/:examId/attempts/:attemptId/sections/:examSectionId/submit", (0, catchAsync_1.catchAsync)(exams_1.submitSection));
// ── Reveal question answer (costs questionBalance) ───────────────────────────
router.post("/questions/:questionId/show-answer", (0, catchAsync_1.catchAsync)(exams_1.showQuestionAnswer));
// ── Parallel questions flow ──────────────────────────────────────────────────
// Step 1: Get parallel questions for wrong answers (deducts questionBalance)
router.post("/parallel/questions", (0, catchAsync_1.catchAsync)(exams_1.getParallelQuestions));
// Step 2: Submit answers for a parallel session and get graded results
router.post("/parallel/:parallelAttemptId/submit", (0, catchAsync_1.catchAsync)(exams_1.submitParallelAnswers));
// ── Exam answers (requires includedAnswers payment) ──────────────────────────
router.get("/:examId/attempts/:attemptId/answers", (0, catchAsync_1.catchAsync)(exams_1.getExamAttemptAnswers));
exports.default = router;
