import { Router } from "express";
import { getTextfromImage } from "../../controllers/admin/questions";
import { catchAsync } from "../../utils/catchAsync";
import { upload } from "../../middlewares/multer";
import {
    sendParallelQuestionGenerate,
    createQuestion,
    createParallelQuestion,
    getAllQuestions,
    getQuestionbyId,
    updateQuestion,
    deleteQuestion,
    updateParallelQuestion,
    deleteParallelQuestion,
    getAllParallelQuestions,
    getParallelQuestionbyId,
    getParallelQuestionsByOriginalId,
    getQuestionsbyLessonId,
    getQuestionsbyCourseId,
} from "../../controllers/admin/questions";

import { getExamCodes } from "../../controllers/admin/examCodes";
import { selectLessons } from "../../controllers/admin/lessons";
const router = Router();

// No Permissions Required
router.get("/selectionExamCode", catchAsync(getExamCodes));
router.get("/selectionLesson", catchAsync(selectLessons));
// ---------------------------------------------------------


router.post("/ocr", upload.single('image'), catchAsync(getTextfromImage));
router.post("/parallel/generate", catchAsync(sendParallelQuestionGenerate));
router.post("/parallel", catchAsync(createParallelQuestion));
router.put("/parallel/:id", catchAsync(updateParallelQuestion));
router.delete("/parallel/:id", catchAsync(deleteParallelQuestion));
router.get("/parallel/original/:id", catchAsync(getParallelQuestionsByOriginalId));
router.get("/parallel/:id", catchAsync(getParallelQuestionbyId));
router.get("/parallel", catchAsync(getAllParallelQuestions));
router.post("/", catchAsync(createQuestion));
router.get("/", catchAsync(getAllQuestions));
router.get("/course/:courseId", catchAsync(getQuestionsbyCourseId));
router.get("/lesson/:id", catchAsync(getQuestionsbyLessonId));
router.get("/:id", catchAsync(getQuestionbyId));
router.put("/:id", catchAsync(updateQuestion));
router.delete("/:id", catchAsync(deleteQuestion));

export default router;