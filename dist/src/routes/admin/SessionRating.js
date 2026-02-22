"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const SessionRating_1 = require("../../controllers/admin/SessionRating");
const router = (0, express_1.Router)();
// Get all sessions with their ratings (supports filtering by teacher, category, course)
router.get("/all", (0, catchAsync_1.catchAsync)(SessionRating_1.getAllSessionsWithRatings));
// Get all ratings for a specific session
router.get("/:sessionId", (0, catchAsync_1.catchAsync)(SessionRating_1.getSessionRatings));
exports.default = router;
