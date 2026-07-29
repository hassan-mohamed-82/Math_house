import { Router } from "express";
import { getDiagnosticExams, getDiagnosticExamById, getDiagnosticExamQuestions, startDiagnosticExamReq, submitDiagnosticExamReq, getStudentAttempts, getDiagnosticAttemptReview, getDiagnosticAttemptRecommendations } from "../../controllers/user/diagnosticExam";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(getDiagnosticExams));
router.get("/attempts", catchAsync(getStudentAttempts));
router.get("/attempts/:attemptId/review", catchAsync(getDiagnosticAttemptReview));
router.get("/attempts/:attemptId/recommendations", catchAsync(getDiagnosticAttemptRecommendations));
router.get("/:id", catchAsync(getDiagnosticExamById));
router.get("/:id/questions", catchAsync(getDiagnosticExamQuestions));
router.post("/:examId/start", catchAsync(startDiagnosticExamReq));
router.post("/:attemptId/submit", catchAsync(submitDiagnosticExamReq));

export default router;