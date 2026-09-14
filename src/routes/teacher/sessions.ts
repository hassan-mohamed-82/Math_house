import { Router } from "express";
import {
    getAllTeacherSessions,
    getUpcomingTeacherSessions,
    getPastTeacherSessions,
    getTeacherSessionById,
    getSessionStudents,
} from "../../controllers/teacher/sessions";
import {
    getSessionRatings,
    getStudentSessionRatings,
    getTeacherSessionRatingForm,
    // submitTeacherSessionRatings,
} from "../../controllers/teacher/SessionRating";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// GET /api/teacher/sessions                            — all sessions for logged-in teacher
router.get("/", catchAsync(getAllTeacherSessions));

// GET /api/teacher/sessions/upcoming                   — upcoming only
router.get("/upcoming", catchAsync(getUpcomingTeacherSessions));

// GET /api/teacher/sessions/past                       — past only
router.get("/past", catchAsync(getPastTeacherSessions));

// GET /api/teacher/sessions/students/:studentId/ratings — student ratings across teacher's sessions
router.get("/students/:studentId/ratings", catchAsync(getStudentSessionRatings));

// GET /api/teacher/sessions/:id                        — single session detail with resources
router.get("/:id", catchAsync(getTeacherSessionById));

// GET /api/teacher/sessions/:id/students               — students + attendance for a session
router.get("/:id/students", catchAsync(getSessionStudents));

// ── Session Ratings ───────────────────────────────────────────────
// GET /api/teacher/sessions/:id/ratings                — get all student ratings for a session
router.get("/:id/ratings", catchAsync(getSessionRatings));

// GET /api/teacher/sessions/:id/rating-form            — get active questions + students for session rating
router.get("/:id/rating-form", catchAsync(getTeacherSessionRatingForm));

// POST /api/teacher/sessions/:id/ratings               — submit ratings (1-10) for session students
// router.post("/:id/ratings", catchAsync(submitTeacherSessionRatings));

export default router;
