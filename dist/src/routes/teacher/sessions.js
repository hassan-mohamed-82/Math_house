"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sessions_1 = require("../../controllers/teacher/sessions");
const SessionRating_1 = require("../../controllers/teacher/SessionRating");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
// GET /api/teacher/sessions                            — all sessions for logged-in teacher
router.get("/", (0, catchAsync_1.catchAsync)(sessions_1.getAllTeacherSessions));
// GET /api/teacher/sessions/upcoming                   — upcoming only
router.get("/upcoming", (0, catchAsync_1.catchAsync)(sessions_1.getUpcomingTeacherSessions));
// GET /api/teacher/sessions/past                       — past only
router.get("/past", (0, catchAsync_1.catchAsync)(sessions_1.getPastTeacherSessions));
// GET /api/teacher/sessions/students/:studentId/ratings — student ratings across teacher's sessions
router.get("/students/:studentId/ratings", (0, catchAsync_1.catchAsync)(SessionRating_1.getStudentSessionRatings));
// GET /api/teacher/sessions/:id                        — single session detail with resources
router.get("/:id", (0, catchAsync_1.catchAsync)(sessions_1.getTeacherSessionById));
// GET /api/teacher/sessions/:id/students               — students + attendance for a session
router.get("/:id/students", (0, catchAsync_1.catchAsync)(sessions_1.getSessionStudents));
// POST /api/teacher/sessions/:id/explanation-pdf       — upload teacher explanation PDF (optionally per student)
router.post("/:id/explanation-pdf", (0, catchAsync_1.catchAsync)(sessions_1.uploadTeacherExplanationPdf));
// DELETE /api/teacher/sessions/:id/explanation-pdf     — delete teacher explanation PDF
router.delete("/:id/explanation-pdf", (0, catchAsync_1.catchAsync)(sessions_1.deleteTeacherExplanationPdf));
// ── Session Ratings ───────────────────────────────────────────────
// GET /api/teacher/sessions/:id/ratings                — get all student ratings for a session
router.get("/:id/ratings", (0, catchAsync_1.catchAsync)(SessionRating_1.getSessionRatings));
// GET /api/teacher/sessions/:id/rating-form            — get active questions + students for session rating
router.get("/:id/rating-form", (0, catchAsync_1.catchAsync)(SessionRating_1.getTeacherSessionRatingForm));
// POST /api/teacher/sessions/:id/ratings               — submit ratings (1-10) for session students
// router.post("/:id/ratings", catchAsync(submitTeacherSessionRatings));
exports.default = router;
