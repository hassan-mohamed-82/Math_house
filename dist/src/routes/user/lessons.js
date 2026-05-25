"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lessons_1 = require("../../controllers/user/lessons");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
router.get("/chapter/:chapterId", (0, catchAsync_1.catchAsync)(lessons_1.getLessonsByChapterId));
router.get("/:id", (0, catchAsync_1.catchAsync)(lessons_1.getLessonById));
exports.default = router;
