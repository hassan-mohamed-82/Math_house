import { Router } from "express";
import { createSemester, deleteSemester, getSemesterbyId, getSemesters, updateSemester, getSemestersByCourseId } from "../../controllers/admin/semester";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();
router.post("/", catchAsync(createSemester));
router.get("/", catchAsync(getSemesters));
router.get("/course/:courseId", catchAsync(getSemestersByCourseId));
router.get("/:id", catchAsync(getSemesterbyId));
router.put("/:id", catchAsync(updateSemester));
router.delete("/:id", catchAsync(deleteSemester));

export default router;
