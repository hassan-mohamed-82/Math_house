import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizeRoles } from "../../middlewares/authorized";
import { getExams, getExamById, startExam, submitExam } from "../../controllers/user/exams";

const router = Router();

router.use(authorizeRoles("student"));

router.get("/", catchAsync(getExams));
router.get("/:examId", catchAsync(getExamById));
router.post("/:examId/start", catchAsync(startExam));
router.post("/:examId/submit", catchAsync(submitExam));

export default router;
