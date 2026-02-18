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
const router = Router();
// No Authorization for roles for it -------------
router.get("/selectionCourses", catchAsync(getAllCourses));
router.get("/selectionCategories", catchAsync(getCategorySelection))
router.get("/selectionTeachers", catchAsync(getAllTeachers))
// -------------------------------------------------

router.post("/", catchAsync(createTeacher));
router.get("/:id", catchAsync(getTeacherById));
router.get("/", catchAsync(getAllTeachers));
router.put("/:id", catchAsync(updateTeacher));
router.delete("/:id", catchAsync(deleteTeacher));

export default router;