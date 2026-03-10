"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const packages_1 = require("../../controllers/user/packages");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
router.get('/', (0, catchAsync_1.catchAsync)(packages_1.getPackages));
exports.default = router;
