"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Session_1 = require("../../controllers/admin/Session");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
router.get("/select/category", (0, catchAsync_1.catchAsync)(Session_1.selectCategory));
router.get("/select/sub-category", (0, catchAsync_1.catchAsync)(Session_1.selectSubCategory));
router.get("/select/course/:categoryId", (0, catchAsync_1.catchAsync)(Session_1.selectCourse));
router.get("/select/chapter/:courseId", (0, catchAsync_1.catchAsync)(Session_1.selectChapter));
router.get("/select/lesson/:chapterId", (0, catchAsync_1.catchAsync)(Session_1.selectLesson));
router.get("/select/students", (0, catchAsync_1.catchAsync)(Session_1.selectStudents));
router.get("/select/teachers", (0, catchAsync_1.catchAsync)(Session_1.selectTeachers));
router.get("/select/groups", (0, catchAsync_1.catchAsync)(Session_1.selectGroups));
router.post("/students/attendance", (0, requirePermission_1.requirePermission)("sessions", "View"), (0, catchAsync_1.catchAsync)(Session_1.getStudentsCourseAttendance));
router.get("/", (0, requirePermission_1.requirePermission)("sessions", "View"), (0, catchAsync_1.catchAsync)(Session_1.getAllSessions));
router.post("/", (0, requirePermission_1.requirePermission)("sessions", "Add"), (0, catchAsync_1.catchAsync)(Session_1.createSession));
router.get("/:id", (0, requirePermission_1.requirePermission)("sessions", "View"), (0, catchAsync_1.catchAsync)(Session_1.getSessionById));
router.post("/:id/generate-mistakes", (0, requirePermission_1.requirePermission)("sessions", "Edit"), (0, catchAsync_1.catchAsync)(Session_1.regenerateMistakesSessionPdfs));
router.put("/:id", (0, requirePermission_1.requirePermission)("sessions", "Edit"), (0, catchAsync_1.catchAsync)(Session_1.updateSession));
router.delete("/:id", (0, requirePermission_1.requirePermission)("sessions", "Delete"), (0, catchAsync_1.catchAsync)(Session_1.deleteSession));
// ── Mistakes-session PDFs ─────────────────────────────────────────────────────
// POST   /admin/sessions/:id/student-pdfs             — generate one combined PDF pair
router.post("/:id/student-pdfs", (0, requirePermission_1.requirePermission)("sessions", "Edit"), (0, catchAsync_1.catchAsync)(Session_1.upsertSessionStudentPdfs));
// DELETE /admin/sessions/:id/student-pdfs/:studentId  — remove a student's PDF row
router.delete("/:id/student-pdfs/:studentId", (0, requirePermission_1.requirePermission)("sessions", "Edit"), (0, catchAsync_1.catchAsync)(Session_1.deleteSessionStudentPdf));
exports.default = router;
