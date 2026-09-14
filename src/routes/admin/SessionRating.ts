import { Router } from "express";
import {
    rateSessionStudents,
    getSessionRatings,
    getStudentSessionRatings,
    getRatingById,
    deleteSessionRating,
} from "../../controllers/admin/SessionRating";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { rateSessionStudentsSchema } from "../../validation/admin/sessionRating";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// Rate students for a specific session
router.post("/session/:sessionId", requirePermission("session_ratings", "Add"), catchAsync(rateSessionStudents));

// Get all ratings for a session
router.get("/session/:sessionId", requirePermission("session_ratings", "View"), catchAsync(getSessionRatings));

// Get ratings history for a student
router.get("/student/:id", requirePermission("session_ratings", "View"), catchAsync(getStudentSessionRatings));

// Get single rating by ID
router.get("/:ratingId", requirePermission("session_ratings", "View"), catchAsync(getRatingById));

// Delete a rating
router.delete("/:ratingId", requirePermission("session_ratings", "Delete"), catchAsync(deleteSessionRating));

export default router;
