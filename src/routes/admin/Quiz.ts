// routes/quiz.routes.ts

import { Router } from "express";
import {
    createQuiz,
    getAllQuizzes,
    getQuizById,
    updateQuiz,
    deleteQuiz,
    toggleQuizActive,
    getQuestionsBank,
    getFilterOptions,
    getSelection,
    getQuizzesByLessonId
} from "../../controllers/admin/Quiz";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// Selection API
router.get("/selection", catchAsync(getSelection));

// Questions Bank
router.get("/questions/bank", catchAsync(getQuestionsBank));
router.get("/questions/filters", catchAsync(getFilterOptions));

// Quiz CRUD
router.post("/", catchAsync(createQuiz));
router.get("/", catchAsync(getAllQuizzes));
router.get("/lesson/:id", catchAsync(getQuizzesByLessonId));
router.get("/:id", catchAsync(getQuizById));
router.put("/:id", catchAsync(updateQuiz));
router.delete("/:id", catchAsync(deleteQuiz));
router.patch("/:id/toggle-active", catchAsync(toggleQuizActive));

export default router;