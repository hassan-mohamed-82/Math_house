"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_1 = require("../../controllers/admin/admin");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// ── List & detail ─────────────────────────────────────────────────────────
router.get("/", (0, requirePermission_1.requirePermission)("admins", "View"), (0, catchAsync_1.catchAsync)(admin_1.getAllAdmins));
router.get("/select", (0, requirePermission_1.requirePermission)("admins", "View"), (0, catchAsync_1.catchAsync)(admin_1.select));
router.get("/:id", (0, requirePermission_1.requirePermission)("admins", "View"), (0, catchAsync_1.catchAsync)(admin_1.getAdminById));
// ── Create ────────────────────────────────────────────────────────────────
router.post("/", (0, requirePermission_1.requirePermission)("admins", "Add"), (0, catchAsync_1.catchAsync)(admin_1.createAdmin));
// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id", (0, requirePermission_1.requirePermission)("admins", "Edit"), (0, catchAsync_1.catchAsync)(admin_1.updateAdmin));
// ── Toggle status ─────────────────────────────────────────────────────────
router.patch("/:id/toggle", (0, requirePermission_1.requirePermission)("admins", "Status"), (0, catchAsync_1.catchAsync)(admin_1.toggleAdminStatus));
// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id", (0, requirePermission_1.requirePermission)("admins", "Delete"), (0, catchAsync_1.catchAsync)(admin_1.deleteAdmin));
exports.default = router;
