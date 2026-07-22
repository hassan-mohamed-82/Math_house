"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reports_1 = require("../../controllers/user/reports");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
router.get("/quizzes", (0, catchAsync_1.catchAsync)(reports_1.getStudentQuizReports));
exports.default = router;
