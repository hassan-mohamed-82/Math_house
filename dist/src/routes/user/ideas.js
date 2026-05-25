"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ideas_1 = require("../../controllers/user/ideas");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
router.get("/lesson/:lessonId", (0, catchAsync_1.catchAsync)(ideas_1.getIdeasByLessonId));
router.get("/:id", (0, catchAsync_1.catchAsync)(ideas_1.getIdeaById));
exports.default = router;
