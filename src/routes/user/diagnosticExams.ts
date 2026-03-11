import { Router } from "express";
import { getDiagnosticExams, getDiagnosticExamById, getDiagnosticExamOptions } from "../../controllers/user/diagnosticExam";

const router = Router();

router.get("/", getDiagnosticExams);
router.get("/:id", getDiagnosticExamById);
router.get("/:id/questions", getDiagnosticExamOptions);

export default router;