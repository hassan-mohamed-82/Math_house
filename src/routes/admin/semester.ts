import { Router } from "express";
import { createSemester, deleteSemester, getCategoriesSelection, getSemesterbyId, getSemesters, updateSemester } from "../../controllers/admin/semester";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/selection", catchAsync(getCategoriesSelection));
router.post("/", catchAsync(createSemester));
router.get("/", catchAsync(getSemesters));
router.get("/:id", catchAsync(getSemesterbyId));
router.put("/:id", catchAsync(updateSemester));
router.delete("/:id", catchAsync(deleteSemester));

export default router;
