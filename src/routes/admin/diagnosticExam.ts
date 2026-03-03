import { Router } from "express";
import {
    createDiagnosticExam,
    getAllDiagnosticExams,
    getDiagnosticExamById,
    updateDiagnosticExam,
    deleteDiagnosticExam,
    getSelection
} from "../../controllers/admin/diagnosticExam";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.post("/", catchAsync(createDiagnosticExam));
router.get("/", catchAsync(getAllDiagnosticExams));
router.get("/selection", catchAsync(getSelection));
router.get("/:id", catchAsync(getDiagnosticExamById));
router.put("/:id", catchAsync(updateDiagnosticExam));
router.delete("/:id", catchAsync(deleteDiagnosticExam));

export default router;
