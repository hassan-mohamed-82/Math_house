"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SessionRating_1 = require("../../controllers/user/SessionRating");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
// GET /api/user/session-ratings                      — all session ratings for logged-in student
router.get("/", (0, catchAsync_1.catchAsync)(SessionRating_1.getMySessionRatings));
// GET /api/user/session-ratings/:sessionId/form      — get rating form (questions + existing rating) for a session
router.get("/:sessionId/form", (0, catchAsync_1.catchAsync)(SessionRating_1.getSessionRatingForm));
// POST /api/user/session-ratings/:sessionId          — submit ratings (1-10 per question) for a session
router.post("/:sessionId", (0, catchAsync_1.catchAsync)(SessionRating_1.submitSessionRatings));
// GET /api/user/session-ratings/:sessionId           — single session evaluation details
router.get("/:sessionId", (0, catchAsync_1.catchAsync)(SessionRating_1.getMySessionRatingBySessionId));
exports.default = router;
