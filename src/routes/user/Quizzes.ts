import { Router } from "express";
import { getQuizQuestions } from "../../controllers/user/Quizzes";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();
router.get("/:quizId/questions", catchAsync(getQuizQuestions));

export default router;