"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SessionRating_1 = require("../../controllers/admin/SessionRating");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// Rate students for a specific session
router.post("/session/:sessionId", (0, requirePermission_1.requirePermission)("session_ratings", "Add"), (0, catchAsync_1.catchAsync)(SessionRating_1.rateSessionStudents));
// Get all ratings for a session
router.get("/session/:sessionId", (0, requirePermission_1.requirePermission)("session_ratings", "View"), (0, catchAsync_1.catchAsync)(SessionRating_1.getSessionRatings));
// Get ratings history for a student
router.get("/student/:id", (0, requirePermission_1.requirePermission)("session_ratings", "View"), (0, catchAsync_1.catchAsync)(SessionRating_1.getStudentSessionRatings));
// Get single rating by ID
router.get("/:ratingId", (0, requirePermission_1.requirePermission)("session_ratings", "View"), (0, catchAsync_1.catchAsync)(SessionRating_1.getRatingById));
// Delete a rating
router.delete("/:ratingId", (0, requirePermission_1.requirePermission)("session_ratings", "Delete"), (0, catchAsync_1.catchAsync)(SessionRating_1.deleteSessionRating));
exports.default = router;
