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
    getQuestionsbySectiondId,
    selectDriveContents,
} from "../../controllers/admin/questions";
import { getExamCodes } from "../../controllers/admin/examCodes";
import { selectLessons } from "../../controllers/admin/lessons";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// ── Selection helpers (open to any authenticated admin) ──────────────────
router.get("/selectionExamCode", catchAsync(getExamCodes));
router.get("/selectionLesson",   catchAsync(selectLessons));
router.get("/selectionDriveContents", catchAsync(selectDriveContents));

// ── OCR / AI helpers ──────────────────────────────────────────────────────
router.post("/ocr",                requirePermission("questions", "Add"),  upload.single("image"), catchAsync(getTextfromImage));
router.post("/parallel/generate",  requirePermission("questions", "Add"),  catchAsync(sendParallelQuestionGenerate));

// ── Parallel questions ────────────────────────────────────────────────────
router.get("/parallel",                          requirePermission("questions", "View"),   catchAsync(getAllParallelQuestions));
router.get("/parallel/original/:id",             requirePermission("questions", "View"),   catchAsync(getParallelQuestionsByOriginalId));
router.get("/parallel/:id",                      requirePermission("questions", "View"),   catchAsync(getParallelQuestionbyId));
router.post("/parallel",                         requirePermission("questions", "Add"),    catchAsync(createParallelQuestion));
router.put("/parallel/:id",                      requirePermission("questions", "Edit"),   catchAsync(updateParallelQuestion));
router.delete("/parallel/:id",                   requirePermission("questions", "Delete"), catchAsync(deleteParallelQuestion));

// ── Main questions ────────────────────────────────────────────────────────
router.get("/",                                  requirePermission("questions", "View"),   catchAsync(getAllQuestions));
router.get("/course/:courseId",                  requirePermission("questions", "View"),   catchAsync(getQuestionsbyCourseId));
router.get("/lesson/:id",                        requirePermission("questions", "View"),   catchAsync(getQuestionsbyLessonId));
router.get("/section/:sectionId",                requirePermission("questions", "View"),   catchAsync(getQuestionsbySectiondId));
router.get("/:id",                               requirePermission("questions", "View"),   catchAsync(getQuestionbyId));
router.post("/",                                 requirePermission("questions", "Add"),    catchAsync(createQuestion));
router.put("/:id",                               requirePermission("questions", "Edit"),   catchAsync(updateQuestion));
router.delete("/:id",                            requirePermission("questions", "Delete"), catchAsync(deleteQuestion));

export default router;