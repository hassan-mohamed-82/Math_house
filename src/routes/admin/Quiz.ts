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
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// Selection API
router.get("/selection", catchAsync(getSelection));

// Questions Bank
router.get("/questions/bank", requirePermission("quizzes", "View"), catchAsync(getQuestionsBank));
router.get("/questions/filters", catchAsync(getFilterOptions));

// Quiz CRUD
router.post("/", requirePermission("quizzes", "Add"), catchAsync(createQuiz));
router.get("/", requirePermission("quizzes", "View"), catchAsync(getAllQuizzes));
router.get("/lesson/:id", requirePermission("quizzes", "View"), catchAsync(getQuizzesByLessonId));
router.get("/:id", requirePermission("quizzes", "View"), catchAsync(getQuizById));
router.put("/:id", requirePermission("quizzes", "Edit"), catchAsync(updateQuiz));
router.delete("/:id", requirePermission("quizzes", "Delete"), catchAsync(deleteQuiz));
router.patch("/:id/toggle-active", requirePermission("quizzes", "Status"), catchAsync(toggleQuizActive));

export default router;