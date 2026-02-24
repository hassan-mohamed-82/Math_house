"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/packages.routes.ts
const express_1 = require("express");
const Package_1 = require("../../controllers/admin/Package");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
// Select Options
router.get("/select", (0, catchAsync_1.catchAsync)(Package_1.selectOptions));
router.get("/selection", (0, catchAsync_1.catchAsync)(Package_1.selectionPackages));
router.get("/courses/:categoryId", (0, catchAsync_1.catchAsync)(Package_1.getCoursesByCategory));
// Packages CRUD
router.post("/", (0, catchAsync_1.catchAsync)(Package_1.createPackage));
router.get("/", (0, catchAsync_1.catchAsync)(Package_1.getAllPackages));
router.get("/:id", (0, catchAsync_1.catchAsync)(Package_1.getPackageById));
router.put("/:id", (0, catchAsync_1.catchAsync)(Package_1.updatePackage));
router.delete("/:id", (0, catchAsync_1.catchAsync)(Package_1.deletePackage));
exports.default = router;
