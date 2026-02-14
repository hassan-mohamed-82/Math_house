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
} from "../../controllers/admin/questions";
const router = Router();

router.post("/ocr", upload.single('image'), catchAsync(getTextfromImage));
router.post("/parallel/generate", catchAsync(sendParallelQuestionGenerate));
router.post("/parallel", catchAsync(createParallelQuestion));
router.put("/parallel/:id", catchAsync(updateParallelQuestion));
router.delete("/parallel/:id", catchAsync(deleteParallelQuestion));
router.get("/parallel/:id", catchAsync(getParallelQuestionbyId));
router.get("/parallel", catchAsync(getAllParallelQuestions));
router.post("/", catchAsync(createQuestion));
router.get("/", catchAsync(getAllQuestions));
router.get("/:id", catchAsync(getQuestionbyId));
router.put("/:id", catchAsync(updateQuestion));
router.delete("/:id", catchAsync(deleteQuestion));

export default router;