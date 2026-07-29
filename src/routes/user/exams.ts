import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizeRoles } from "../../middlewares/authorized";
import {
    getExams,
    getExamById,
    startExam,
    submitExam,
    showQuestionAnswer,
    getParallelQuestions,
    submitParallelAnswers,
    getExamAttemptAnswers,
} from "../../controllers/user/exams";

const router = Router();

router.use(authorizeRoles("student"));

// ── Core exam flow ───────────────────────────────────────────────────────────
router.get("/", catchAsync(getExams));
router.get("/:examId", catchAsync(getExamById));
router.post("/:examId/start", catchAsync(startExam));
router.post("/:examId/submit", catchAsync(submitExam));

// ── Reveal question answer (costs questionBalance) ───────────────────────────
router.post("/questions/:questionId/show-answer", catchAsync(showQuestionAnswer));

// ── Parallel questions flow ──────────────────────────────────────────────────
// Step 1: Get parallel questions for wrong answers (deducts questionBalance)
router.post("/parallel/questions", catchAsync(getParallelQuestions));
// Step 2: Submit answers for a parallel session and get graded results
router.post("/parallel/:parallelAttemptId/submit", catchAsync(submitParallelAnswers));

// ── Exam answers (requires includedAnswers payment) ──────────────────────────
router.get("/:examId/attempts/:attemptId/answers", catchAsync(getExamAttemptAnswers));

export default router;
