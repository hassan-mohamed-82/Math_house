import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
    createGrade,
    deleteGrade,
    getAllGrades,
    getGradeById,
    getGradesByCategoryId,
    updateGrade,
} from "../../controllers/admin/grade";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.post("/", requirePermission("grades", "Add"), catchAsync(createGrade));
router.get("/", requirePermission("grades", "View"), catchAsync(getAllGrades));
router.get("/category/:categoryId", requirePermission("grades", "View"), catchAsync(getGradesByCategoryId));
router.get("/:id", requirePermission("grades", "View"), catchAsync(getGradeById));
router.put("/:id", requirePermission("grades", "Edit"), catchAsync(updateGrade));
router.delete("/:id", requirePermission("grades", "Delete"), catchAsync(deleteGrade));

export default router;