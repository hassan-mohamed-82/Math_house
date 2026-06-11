import { Router } from "express";
import { getQuizQuestions, getQuizById, startQuiz, submitQuiz, getQuizzesByLessonId } from "../../controllers/user/Quizzes";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();
router.get("/lesson/:lessonId", catchAsync(getQuizzesByLessonId));
router.get("/:quizId", catchAsync(getQuizById));
router.get("/:quizId/questions", catchAsync(getQuizQuestions));
router.post("/:quizId/start", catchAsync(startQuiz));
router.post("/:quizId/submit", catchAsync(submitQuiz));

export default router;