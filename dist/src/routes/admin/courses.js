"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const courses_1 = require("../../controllers/admin/courses");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
router.post("/", (0, catchAsync_1.catchAsync)(courses_1.createCourse));
router.get("/", (0, catchAsync_1.catchAsync)(courses_1.getAllCourses));
router.get("/categories", (0, catchAsync_1.catchAsync)(courses_1.getCategoriesSelection));
router.get("/:id", (0, catchAsync_1.catchAsync)(courses_1.getCourseById));
router.put("/:id", (0, catchAsync_1.catchAsync)(courses_1.updateCourse));
router.delete("/:id", (0, catchAsync_1.catchAsync)(courses_1.deleteCourse));
// Course-Teacher management endpoints
router.get("/:id/teachers", (0, catchAsync_1.catchAsync)(courses_1.getCourseTeachers));
router.post("/:id/teachers", (0, catchAsync_1.catchAsync)(courses_1.addTeacherToCourse));
router.delete("/:id/teachers/:teacherId", (0, catchAsync_1.catchAsync)(courses_1.removeTeacherFromCourse));
exports.default = router;
