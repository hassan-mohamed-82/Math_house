import { Router } from "express";
import { getDiagnosticExams, getDiagnosticExamById, getDiagnosticExamQuestions, startDiagnosticExamReq, submitDiagnosticExamReq, getStudentAttempts, getDiagnosticAttemptReview, getDiagnosticAttemptRecommendations } from "../../controllers/user/diagnosticExam";

const router = Router();

router.get("/", getDiagnosticExams);
router.get("/attempts", getStudentAttempts);
router.get("/attempts/:attemptId/review", getDiagnosticAttemptReview);
router.get("/attempts/:attemptId/recommendations", getDiagnosticAttemptRecommendations);
router.get("/:id", getDiagnosticExamById);
router.get("/:id/questions", getDiagnosticExamQuestions);
router.post("/:examId/start", startDiagnosticExamReq);
router.post("/:attemptId/submit", submitDiagnosticExamReq);

export default router;