"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SessionRatingQuestions_1 = require("../../controllers/admin/SessionRatingQuestions");
const catchAsync_1 = require("../../utils/catchAsync");
const validation_1 = require("../../middlewares/validation");
const sessionRating_1 = require("../../validation/admin/sessionRating");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// List & Detail
router.get("/", (0, requirePermission_1.requirePermission)("session_rating_questions", "View"), (0, catchAsync_1.catchAsync)(SessionRatingQuestions_1.getAllRatingQuestions));
router.get("/:id", (0, requirePermission_1.requirePermission)("session_rating_questions", "View"), (0, catchAsync_1.catchAsync)(SessionRatingQuestions_1.getRatingQuestionById));
// Create
router.post("/", (0, validation_1.validate)(sessionRating_1.createRatingQuestionSchema), (0, requirePermission_1.requirePermission)("session_rating_questions", "Add"), (0, catchAsync_1.catchAsync)(SessionRatingQuestions_1.createRatingQuestion));
// Update & Toggle
router.put("/:id", (0, validation_1.validate)(sessionRating_1.updateRatingQuestionSchema), (0, requirePermission_1.requirePermission)("session_rating_questions", "Edit"), (0, catchAsync_1.catchAsync)(SessionRatingQuestions_1.updateRatingQuestion));
router.put("/:id/toggle", (0, requirePermission_1.requirePermission)("session_rating_questions", "Status"), (0, catchAsync_1.catchAsync)(SessionRatingQuestions_1.toggleRatingQuestionStatus));
// Delete
router.delete("/:id", (0, requirePermission_1.requirePermission)("session_rating_questions", "Delete"), (0, catchAsync_1.catchAsync)(SessionRatingQuestions_1.deleteRatingQuestion));
exports.default = router;
