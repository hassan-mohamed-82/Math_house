import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { createExamCode, deleteExamCode, getExamCodes, updateExamCode } from "../../controllers/admin/examCodes";
const router = Router();

router.post("/", catchAsync(createExamCode));
router.get("/", catchAsync(getExamCodes));
router.put("/:id", catchAsync(updateExamCode));
router.delete("/:id", catchAsync(deleteExamCode));

export default router;
