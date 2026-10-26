import { Router } from "express";
import {
    getStudentQuizReports,
    getStudentExamReports,
    getStudentDiagnosticExamReports
} from "../../controllers/user/reports";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();
router.get("/quizzes", catchAsync(getStudentQuizReports));
router.get("/exams", catchAsync(getStudentExamReports));
router.get("/diagnostic-exam", catchAsync(getStudentDiagnosticExamReports));

export default router;
