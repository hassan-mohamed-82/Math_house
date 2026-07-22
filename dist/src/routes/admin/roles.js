"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roles_1 = require("../../controllers/admin/roles");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// ── Permission discovery — no action gate, any authenticated admin can view ──
router.get("/available-permissions", (0, catchAsync_1.catchAsync)(roles_1.getAvailablePermissions));
router.get("/schema", (0, catchAsync_1.catchAsync)(roles_1.getAdminPermissions));
// ── List & detail ─────────────────────────────────────────────────────────
router.get("/", (0, requirePermission_1.requirePermission)("roles", "View"), (0, catchAsync_1.catchAsync)(roles_1.getAllRoles));
router.get("/:id", (0, requirePermission_1.requirePermission)("roles", "View"), (0, catchAsync_1.catchAsync)(roles_1.getRoleById));
// ── Create ────────────────────────────────────────────────────────────────
router.post("/", (0, requirePermission_1.requirePermission)("roles", "Add"), (0, catchAsync_1.catchAsync)(roles_1.createRole));
// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id", (0, requirePermission_1.requirePermission)("roles", "Edit"), (0, catchAsync_1.catchAsync)(roles_1.updateRole));
// ── Toggle status ─────────────────────────────────────────────────────────
router.patch("/:id/toggle", (0, requirePermission_1.requirePermission)("roles", "Status"), (0, catchAsync_1.catchAsync)(roles_1.toggleRoleStatus));
// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id", (0, requirePermission_1.requirePermission)("roles", "Delete"), (0, catchAsync_1.catchAsync)(roles_1.deleteRole));
exports.default = router;
