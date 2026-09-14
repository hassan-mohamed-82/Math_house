import { Router } from "express";
import {
    getMySessionRatings,
    getMySessionRatingBySessionId,
    getSessionRatingForm,
    submitSessionRatings,
} from "../../controllers/user/SessionRating";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// GET /api/user/session-ratings                      — all session ratings for logged-in student
router.get("/", catchAsync(getMySessionRatings));

// GET /api/user/session-ratings/:sessionId/form      — get rating form (questions + existing rating) for a session
router.get("/:sessionId/form", catchAsync(getSessionRatingForm));

// POST /api/user/session-ratings/:sessionId          — submit ratings (1-10 per question) for a session
router.post("/:sessionId", catchAsync(submitSessionRatings));

// GET /api/user/session-ratings/:sessionId           — single session evaluation details
router.get("/:sessionId", catchAsync(getMySessionRatingBySessionId));

export default router;
