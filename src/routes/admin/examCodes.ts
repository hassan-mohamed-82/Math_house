import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { createExamCode, deleteExamCode, getExamCodeById, getExamCodes, updateExamCode } from "../../controllers/admin/examCodes";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.post("/", requirePermission("exam_codes", "Add"), catchAsync(createExamCode));
router.get("/", requirePermission("exam_codes", "View"), catchAsync(getExamCodes));
router.get("/:id", requirePermission("exam_codes", "View"), catchAsync(getExamCodeById));
router.put("/:id", requirePermission("exam_codes", "Edit"), catchAsync(updateExamCode));
router.delete("/:id", requirePermission("exam_codes", "Delete"), catchAsync(deleteExamCode));

export default router;
