import { Router } from "express";
import { createSemester, deleteSemester, getSemesterbyId, getSemesters, updateSemester, getSemestersByCourseId } from "../../controllers/admin/semester";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();
router.post("/", requirePermission("semesters", "Add"), catchAsync(createSemester));
router.get("/", requirePermission("semesters", "View"), catchAsync(getSemesters));
router.get("/course/:courseId", requirePermission("semesters", "View"), catchAsync(getSemestersByCourseId));
router.get("/:id", requirePermission("semesters", "View"), catchAsync(getSemesterbyId));
router.put("/:id", requirePermission("semesters", "Edit"), catchAsync(updateSemester));
router.delete("/:id", requirePermission("semesters", "Delete"), catchAsync(deleteSemester));

export default router;
