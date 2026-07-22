"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chapters_1 = require("../../controllers/admin/chapters");
const semester_1 = require("../../controllers/admin/semester");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// ── Selection helpers (open to any authenticated admin) ──────────────────
router.get("/selectionSemester/:courseId", (0, catchAsync_1.catchAsync)(semester_1.getSemestersByCourseId));
// ── List & detail ─────────────────────────────────────────────────────────
router.get("/", (0, requirePermission_1.requirePermission)("chapters", "View"), (0, catchAsync_1.catchAsync)(chapters_1.getAllChapters));
router.get("/course/:courseId", (0, requirePermission_1.requirePermission)("chapters", "View"), (0, catchAsync_1.catchAsync)(chapters_1.getAllChaptersByCourseId));
router.get("/:id", (0, requirePermission_1.requirePermission)("chapters", "View"), (0, catchAsync_1.catchAsync)(chapters_1.getChapterById));
// ── Create ────────────────────────────────────────────────────────────────
router.post("/", (0, requirePermission_1.requirePermission)("chapters", "Add"), (0, catchAsync_1.catchAsync)(chapters_1.createChapter));
// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id", (0, requirePermission_1.requirePermission)("chapters", "Edit"), (0, catchAsync_1.catchAsync)(chapters_1.updateChapter));
router.patch("/swap-order", (0, requirePermission_1.requirePermission)("chapters", "Edit"), (0, catchAsync_1.catchAsync)(chapters_1.swapChapterOrder));
// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id", (0, requirePermission_1.requirePermission)("chapters", "Delete"), (0, catchAsync_1.catchAsync)(chapters_1.deleteChapter));
exports.default = router;
