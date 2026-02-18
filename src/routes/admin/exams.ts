import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
    createExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam
} from "../../controllers/admin/exams";
const router = Router();

router.post("/", catchAsync(createExam));
router.get("/", catchAsync(getAllExams));
router.get("/:id", catchAsync(getExamById));
router.put("/:id", catchAsync(updateExam));
router.delete("/:id", catchAsync(deleteExam));

export default router;