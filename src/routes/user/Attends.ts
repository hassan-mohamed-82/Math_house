import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizeRoles } from "../../middlewares/authorized";
import { getUpcomingSessions, getSessionHistory, getSessionDetails, joinSession } from "../../controllers/user/Attends";

const router = Router();

router.use(authorizeRoles("student"));

router.get("/upcoming", catchAsync(getUpcomingSessions));
router.get("/history", catchAsync(getSessionHistory));
router.get("/:sessionId", catchAsync(getSessionDetails));
router.post("/:sessionId/join", catchAsync(joinSession));

export default router;
