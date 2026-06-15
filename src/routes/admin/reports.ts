import { Router } from "express";
import { getStudentQuizReports, getStudentExamReports } from "../../controllers/admin/reports";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();
router.get("/:studentId/quizzes", requirePermission("reports", "View"), catchAsync(getStudentQuizReports));
router.get("/:studentId/exams", requirePermission("reports", "View"), catchAsync(getStudentExamReports));

export default router;
