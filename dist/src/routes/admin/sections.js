"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sections_1 = require("../../controllers/admin/sections");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// No Authorization
router.get("/selectionSections", (0, catchAsync_1.catchAsync)(sections_1.getAllSections));
//---------------------------
router.post("/", (0, requirePermission_1.requirePermission)("sections", "Add"), (0, catchAsync_1.catchAsync)(sections_1.createSection));
router.get("/", (0, requirePermission_1.requirePermission)("sections", "View"), (0, catchAsync_1.catchAsync)(sections_1.getAllSections));
router.get("/:id", (0, requirePermission_1.requirePermission)("sections", "View"), (0, catchAsync_1.catchAsync)(sections_1.getSectionById));
router.put("/:id", (0, requirePermission_1.requirePermission)("sections", "Edit"), (0, catchAsync_1.catchAsync)(sections_1.updateSection));
router.delete("/:id", (0, requirePermission_1.requirePermission)("sections", "Delete"), (0, catchAsync_1.catchAsync)(sections_1.deleteSection));
exports.default = router;
