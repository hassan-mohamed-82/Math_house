"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_1 = require("../../controllers/admin/dashboard");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
// GET /admin/dashboard
// Query params:
//   - filter: "7_days" | "last_7_days" | "this_month" | "custom" (default: "last_7_days")
//   - startDate: "YYYY-MM-DD" (required when filter="custom")
//   - endDate: "YYYY-MM-DD"   (required when filter="custom")
router.get("/", (0, catchAsync_1.catchAsync)(dashboard_1.getDashboard));
exports.default = router;
