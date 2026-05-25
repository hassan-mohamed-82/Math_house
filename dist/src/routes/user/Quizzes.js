"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Quizzes_1 = require("../../controllers/user/Quizzes");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
router.get("/:quizId/questions", (0, catchAsync_1.catchAsync)(Quizzes_1.getQuizQuestions));
exports.default = router;
