"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExtraHomework_1 = require("../../controllers/admin/ExtraHomework");
const catchAsync_1 = require("../../utils/catchAsync");
const validation_1 = require("../../middlewares/validation");
const extraHomework_1 = require("../../validation/admin/extraHomework");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// ── List & Detail ─────────────────────────────────────────────────
router.get("/", (0, requirePermission_1.requirePermission)("extra_homework", "View"), (0, catchAsync_1.catchAsync)(ExtraHomework_1.getAllExtraHomework));
router.get("/student/:id", (0, requirePermission_1.requirePermission)("extra_homework", "View"), (0, catchAsync_1.catchAsync)(ExtraHomework_1.getStudentExtraHomework));
router.get("/:id", (0, requirePermission_1.requirePermission)("extra_homework", "View"), (0, catchAsync_1.catchAsync)(ExtraHomework_1.getExtraHomeworkById));
// ── Create ────────────────────────────────────────────────────────
router.post("/", (0, validation_1.validate)(extraHomework_1.createExtraHomeworkSchema), (0, requirePermission_1.requirePermission)("extra_homework", "Add"), (0, catchAsync_1.catchAsync)(ExtraHomework_1.createExtraHomework));
// ── Update & Assign ───────────────────────────────────────────────
router.put("/:id", (0, validation_1.validate)(extraHomework_1.updateExtraHomeworkSchema), (0, requirePermission_1.requirePermission)("extra_homework", "Edit"), (0, catchAsync_1.catchAsync)(ExtraHomework_1.updateExtraHomework));
// router.post("/:id/assign", validate(assignStudentsSchema), requirePermission("extra_homework", "Edit"), catchAsync(assignStudentsToHomework));
// ── Grade / Review Submission ─────────────────────────────────────
router.put("/:id/submissions/:submissionId/review", (0, validation_1.validate)(extraHomework_1.reviewSubmissionSchema), (0, requirePermission_1.requirePermission)("extra_homework", "Edit"), (0, catchAsync_1.catchAsync)(ExtraHomework_1.reviewStudentSubmission));
// ── Delete ────────────────────────────────────────────────────────
router.delete("/:id", (0, requirePermission_1.requirePermission)("extra_homework", "Delete"), (0, catchAsync_1.catchAsync)(ExtraHomework_1.deleteExtraHomework));
exports.default = router;
