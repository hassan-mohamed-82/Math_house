"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const category_1 = require("../../controllers/user/category");
const router = (0, express_1.Router)();
router.get("/", (0, catchAsync_1.catchAsync)(category_1.getAllCategory));
router.get("/:id", (0, catchAsync_1.catchAsync)(category_1.getCategoryById));
exports.default = router;
