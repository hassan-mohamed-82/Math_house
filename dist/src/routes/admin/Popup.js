"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const Popup_1 = require("../../controllers/admin/Popup");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// User-facing: get active popups by destination
router.get("/active", (0, catchAsync_1.catchAsync)(Popup_1.getActivePopups));
// Admin CRUD
router.post("/", (0, requirePermission_1.requirePermission)("popups", "Add"), (0, catchAsync_1.catchAsync)(Popup_1.createPopup));
router.get("/", (0, requirePermission_1.requirePermission)("popups", "View"), (0, catchAsync_1.catchAsync)(Popup_1.getAllPopups));
router.get("/:id", (0, requirePermission_1.requirePermission)("popups", "View"), (0, catchAsync_1.catchAsync)(Popup_1.getPopupById));
router.put("/:id", (0, requirePermission_1.requirePermission)("popups", "Edit"), (0, catchAsync_1.catchAsync)(Popup_1.updatePopup));
router.delete("/:id", (0, requirePermission_1.requirePermission)("popups", "Delete"), (0, catchAsync_1.catchAsync)(Popup_1.deletePopup));
exports.default = router;
