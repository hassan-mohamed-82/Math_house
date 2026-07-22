"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const courses_1 = require("../../controllers/admin/courses");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// ── Selection helpers (open to any authenticated admin — used in dropdowns) ──
router.get("/categories", (0, catchAsync_1.catchAsync)(courses_1.getCategoriesSelection));
router.get("/selection", (0, catchAsync_1.catchAsync)(courses_1.selectionCourses));
// ── List & detail ─────────────────────────────────────────────────────────
router.get("/", (0, requirePermission_1.requirePermission)("courses", "View"), (0, catchAsync_1.catchAsync)(courses_1.getAllCourses));
router.get("/category/:categoryId", (0, requirePermission_1.requirePermission)("courses", "View"), (0, catchAsync_1.catchAsync)(courses_1.getCoursesbyCategoryId));
router.get("/:id", (0, requirePermission_1.requirePermission)("courses", "View"), (0, catchAsync_1.catchAsync)(courses_1.getCourseById));
router.get("/:id/teachers", (0, requirePermission_1.requirePermission)("courses", "View"), (0, catchAsync_1.catchAsync)(courses_1.getCourseTeachers));
// ── Create ────────────────────────────────────────────────────────────────
router.post("/", (0, requirePermission_1.requirePermission)("courses", "Add"), (0, catchAsync_1.catchAsync)(courses_1.createCourse));
router.post("/:id/teachers", (0, requirePermission_1.requirePermission)("courses", "Edit"), (0, catchAsync_1.catchAsync)(courses_1.addTeacherToCourse));
// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id", (0, requirePermission_1.requirePermission)("courses", "Edit"), (0, catchAsync_1.catchAsync)(courses_1.updateCourse));
// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id", (0, requirePermission_1.requirePermission)("courses", "Delete"), (0, catchAsync_1.catchAsync)(courses_1.deleteCourse));
router.delete("/:id/teachers/:teacherId", (0, requirePermission_1.requirePermission)("courses", "Edit"), (0, catchAsync_1.catchAsync)(courses_1.removeTeacherFromCourse));
exports.default = router;
