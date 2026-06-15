import { Router } from "express";
import {
    createDiagnosticExam,
    getAllDiagnosticExams,
    getDiagnosticExamById,
    updateDiagnosticExam,
    deleteDiagnosticExam,
    getSelection,
    getAllDiagnosticExamsbyCourseId
} from "../../controllers/admin/diagnosticExam";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.post("/", requirePermission("diagnostic_exams", "Add"), catchAsync(createDiagnosticExam));
router.get("/", requirePermission("diagnostic_exams", "View"), catchAsync(getAllDiagnosticExams));
router.get("/selection", catchAsync(getSelection));
router.get("/:id", requirePermission("diagnostic_exams", "View"), catchAsync(getDiagnosticExamById));
router.put("/:id", requirePermission("diagnostic_exams", "Edit"), catchAsync(updateDiagnosticExam));
router.delete("/:id", requirePermission("diagnostic_exams", "Delete"), catchAsync(deleteDiagnosticExam));
router.get("/course/:courseId", requirePermission("diagnostic_exams", "View"), catchAsync(getAllDiagnosticExamsbyCourseId));

export default router;
