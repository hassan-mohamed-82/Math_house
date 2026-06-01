import { Router } from "express";
import { getStudentQuizReports } from "../../controllers/user/reports";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();
router.get("/quizzes", catchAsync(getStudentQuizReports));

export default router;
