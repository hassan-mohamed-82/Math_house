import { Router } from "express";
import {
    createTeacher,
    getTeacherById,
    getAllTeachers,
    updateTeacher,
    deleteTeacher,
    getCategorySelection
} from "../../controllers/admin/teacher";
import { catchAsync } from "../../utils/catchAsync";
import { getAllCourses } from "../../controllers/admin/courses";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();
// No Authorization for roles for it -------------
router.get("/selectionCourses", catchAsync(getAllCourses));
router.get("/selectionCategories", catchAsync(getCategorySelection))
router.get("/selectionTeachers", catchAsync(getAllTeachers))
// -------------------------------------------------

router.post("/", requirePermission("teachers", "Add"), catchAsync(createTeacher));
router.get("/:id", requirePermission("teachers", "View"), catchAsync(getTeacherById));
router.get("/", requirePermission("teachers", "View"), catchAsync(getAllTeachers));
router.put("/:id", requirePermission("teachers", "Edit"), catchAsync(updateTeacher));
router.delete("/:id", requirePermission("teachers", "Delete"), catchAsync(deleteTeacher));

export default router;