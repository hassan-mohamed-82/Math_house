import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
    createExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam,
    getExamsByCourseId,
    selectionOptions
} from "../../controllers/admin/exams";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.post("/", requirePermission("exams", "Add"), catchAsync(createExam));
router.get("/", requirePermission("exams", "View"), catchAsync(getAllExams));
router.get("/course/:courseId", requirePermission("exams", "View"), catchAsync(getExamsByCourseId));
router.get("/selection-options", catchAsync(selectionOptions));
router.get("/:id", requirePermission("exams", "View"), catchAsync(getExamById));
router.put("/:id", requirePermission("exams", "Edit"), catchAsync(updateExam));
router.delete("/:id", requirePermission("exams", "Delete"), catchAsync(deleteExam));

export default router;