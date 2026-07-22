"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const student_1 = require("../../controllers/admin/student");
const catchAsync_1 = require("../../utils/catchAsync");
const validation_1 = require("../../middlewares/validation");
const student_2 = require("../../validation/admin/student");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// ── Selection helpers (open to any authenticated admin) ──────────────────
router.get("/select", (0, catchAsync_1.catchAsync)(student_1.selection));
// ── List & detail ─────────────────────────────────────────────────────────
router.get("/", (0, requirePermission_1.requirePermission)("students", "View"), (0, catchAsync_1.catchAsync)(student_1.getAllStudents));
router.get("/:id", (0, validation_1.validate)(student_2.idParamsSchema, "params"), (0, requirePermission_1.requirePermission)("students", "View"), (0, catchAsync_1.catchAsync)(student_1.getStudentById));
router.get("/:id/open-account", (0, validation_1.validate)(student_2.idParamsSchema, "params"), (0, requirePermission_1.requirePermission)("students", "View"), (0, catchAsync_1.catchAsync)(student_1.openStudentAccount));
router.get("/:id/payment-history", (0, validation_1.validate)(student_2.idParamsSchema, "params"), (0, requirePermission_1.requirePermission)("students", "View"), (0, catchAsync_1.catchAsync)(student_1.getPaymentHistory));
router.get("/:id/content", (0, validation_1.validate)(student_2.idParamsSchema, "params"), (0, requirePermission_1.requirePermission)("students", "View"), (0, catchAsync_1.catchAsync)(student_1.getStudentContent));
router.get("/:id/packages", (0, validation_1.validate)(student_2.idParamsSchema, "params"), (0, requirePermission_1.requirePermission)("students", "View"), (0, catchAsync_1.catchAsync)(student_1.getStudentPackages));
// ── Create ────────────────────────────────────────────────────────────────
router.post("/", (0, validation_1.validate)(student_2.studentSchema), (0, requirePermission_1.requirePermission)("students", "Add"), (0, catchAsync_1.catchAsync)(student_1.createStudent));
// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id", (0, validation_1.validate)(student_2.updateStudentSchema), (0, requirePermission_1.requirePermission)("students", "Edit"), (0, catchAsync_1.catchAsync)(student_1.updateStudent));
router.post("/:id/top-up-wallet", (0, validation_1.validate)(student_2.idParamsSchema, "params"), (0, requirePermission_1.requirePermission)("students", "Edit"), (0, catchAsync_1.catchAsync)(student_1.topUpWallet));
router.post("/:id/enroll", (0, validation_1.validate)(student_2.idParamsSchema, "params"), (0, requirePermission_1.requirePermission)("students", "Edit"), (0, catchAsync_1.catchAsync)(student_1.attendItems));
router.post("/:id/packages", (0, validation_1.validate)(student_2.idParamsSchema, "params"), (0, requirePermission_1.requirePermission)("students", "Edit"), (0, catchAsync_1.catchAsync)(student_1.purchasePackageForStudent));
router.post("/:id/increase-lessons-duration", (0, validation_1.validate)(student_2.idParamsSchema, "params"), (0, validation_1.validate)(student_2.increaseLessonsDurationSchema), (0, requirePermission_1.requirePermission)("students", "Edit"), (0, catchAsync_1.catchAsync)(student_1.increaseLessonsDuration));
// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id", (0, validation_1.validate)(student_2.idParamsSchema, "params"), (0, requirePermission_1.requirePermission)("students", "Delete"), (0, catchAsync_1.catchAsync)(student_1.deleteStudent));
exports.default = router;
