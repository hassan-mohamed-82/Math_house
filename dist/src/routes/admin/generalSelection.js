"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const generalSelection_1 = require("../../controllers/admin/generalSelection");
const router = (0, express_1.Router)();
router.get("/calculators", (0, catchAsync_1.catchAsync)(generalSelection_1.getAllCalculators));
exports.default = router;
