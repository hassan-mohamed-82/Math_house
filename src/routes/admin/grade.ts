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
const router = Router();

router.post("/", catchAsync(createGrade));
router.get("/", catchAsync(getAllGrades));
router.get("/category/:categoryId", catchAsync(getGradesByCategoryId));
router.get("/:id", catchAsync(getGradeById));
router.put("/:id", catchAsync(updateGrade));
router.delete("/:id", catchAsync(deleteGrade));

export default router;