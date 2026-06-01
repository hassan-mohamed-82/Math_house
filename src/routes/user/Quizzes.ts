import { Router } from "express";
import { getQuizQuestions, getQuizById, startQuiz, submitQuiz } from "../../controllers/user/Quizzes";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();
router.get("/:quizId", catchAsync(getQuizById));
router.get("/:quizId/questions", catchAsync(getQuizQuestions));
router.post("/:quizId/start", catchAsync(startQuiz));
router.post("/:quizId/submit", catchAsync(submitQuiz));

export default router;