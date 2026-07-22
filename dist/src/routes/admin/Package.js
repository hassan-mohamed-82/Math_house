"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/packages.routes.ts
const express_1 = require("express");
const Package_1 = require("../../controllers/admin/Package");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// Select Options
router.get("/select", (0, catchAsync_1.catchAsync)(Package_1.selectOptions));
router.get("/selection", (0, catchAsync_1.catchAsync)(Package_1.selectionPackages));
router.get("/courses/:categoryId", (0, catchAsync_1.catchAsync)(Package_1.getCoursesByCategory));
// Packages CRUD
router.post("/", (0, requirePermission_1.requirePermission)("packages", "Add"), (0, catchAsync_1.catchAsync)(Package_1.createPackage));
router.get("/", (0, requirePermission_1.requirePermission)("packages", "View"), (0, catchAsync_1.catchAsync)(Package_1.getAllPackages));
router.get("/:id", (0, requirePermission_1.requirePermission)("packages", "View"), (0, catchAsync_1.catchAsync)(Package_1.getPackageById));
router.put("/:id", (0, requirePermission_1.requirePermission)("packages", "Edit"), (0, catchAsync_1.catchAsync)(Package_1.updatePackage));
router.delete("/:id", (0, requirePermission_1.requirePermission)("packages", "Delete"), (0, catchAsync_1.catchAsync)(Package_1.deletePackage));
exports.default = router;
