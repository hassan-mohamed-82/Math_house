import { Router } from "express";
import { getStudentQuizReports, getStudentExamReports } from "../../controllers/admin/reports";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();
router.get("/:studentId/quizzes", catchAsync(getStudentQuizReports));
router.get("/:studentId/exams", catchAsync(getStudentExamReports));

export default router;
