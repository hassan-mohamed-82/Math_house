"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teacher_1 = require("../../controllers/admin/teacher");
const catchAsync_1 = require("../../utils/catchAsync");
const courses_1 = require("../../controllers/admin/courses");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// No Authorization for roles for it -------------
router.get("/selectionCourses", (0, catchAsync_1.catchAsync)(courses_1.getAllCourses));
router.get("/selectionCategories", (0, catchAsync_1.catchAsync)(teacher_1.getCategorySelection));
router.get("/selectionTeachers", (0, catchAsync_1.catchAsync)(teacher_1.getAllTeachers));
// -------------------------------------------------
router.post("/", (0, requirePermission_1.requirePermission)("teachers", "Add"), (0, catchAsync_1.catchAsync)(teacher_1.createTeacher));
router.get("/:id", (0, requirePermission_1.requirePermission)("teachers", "View"), (0, catchAsync_1.catchAsync)(teacher_1.getTeacherById));
router.get("/", (0, requirePermission_1.requirePermission)("teachers", "View"), (0, catchAsync_1.catchAsync)(teacher_1.getAllTeachers));
router.put("/:id", (0, requirePermission_1.requirePermission)("teachers", "Edit"), (0, catchAsync_1.catchAsync)(teacher_1.updateTeacher));
router.delete("/:id", (0, requirePermission_1.requirePermission)("teachers", "Delete"), (0, catchAsync_1.catchAsync)(teacher_1.deleteTeacher));
exports.default = router;
