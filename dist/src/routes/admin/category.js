"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_1 = require("../../controllers/admin/category");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// ── List & detail ─────────────────────────────────────────────────────────
router.get("/", (0, requirePermission_1.requirePermission)("categories", "View"), (0, catchAsync_1.catchAsync)(category_1.getAllCategory));
router.get("/lineage/:id", (0, requirePermission_1.requirePermission)("categories", "View"), (0, catchAsync_1.catchAsync)(category_1.getCategoryLineage));
router.get("/:id", (0, requirePermission_1.requirePermission)("categories", "View"), (0, catchAsync_1.catchAsync)(category_1.getCategoryById));
// ── Create ────────────────────────────────────────────────────────────────
router.post("/", (0, requirePermission_1.requirePermission)("categories", "Add"), (0, catchAsync_1.catchAsync)(category_1.createCategory));
// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id", (0, requirePermission_1.requirePermission)("categories", "Edit"), (0, catchAsync_1.catchAsync)(category_1.updateCategory));
// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id", (0, requirePermission_1.requirePermission)("categories", "Delete"), (0, catchAsync_1.catchAsync)(category_1.deleteCategory));
exports.default = router;
