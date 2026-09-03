import { Router } from "express";
import {
    getAllTeacherSessions,
    getUpcomingTeacherSessions,
    getPastTeacherSessions,
    getTeacherSessionById,
    getSessionStudents,
} from "../../controllers/teacher/sessions";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// GET /api/teacher/sessions              — all sessions for logged-in teacher
router.get("/", catchAsync(getAllTeacherSessions));

// GET /api/teacher/sessions/upcoming     — upcoming only
router.get("/upcoming", catchAsync(getUpcomingTeacherSessions));

// GET /api/teacher/sessions/past         — past only
router.get("/past", catchAsync(getPastTeacherSessions));

// GET /api/teacher/sessions/:id          — single session detail with resources
router.get("/:id", catchAsync(getTeacherSessionById));

// GET /api/teacher/sessions/:id/students — students + attendance for a session
router.get("/:id/students", catchAsync(getSessionStudents));

export default router;
