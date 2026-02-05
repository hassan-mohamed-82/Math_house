import { Router } from "express";
import {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    addTeacherToCourse,
    removeTeacherFromCourse,
    getCourseTeachers
} from "../../controllers/admin/courses";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post("/", catchAsync(createCourse));
router.get("/", catchAsync(getAllCourses));
router.get("/:id", catchAsync(getCourseById));
router.put("/:id", catchAsync(updateCourse));
router.delete("/:id", catchAsync(deleteCourse));

// Course-Teacher management endpoints
router.get("/:id/teachers", catchAsync(getCourseTeachers));
router.post("/:id/teachers", catchAsync(addTeacherToCourse));
router.delete("/:id/teachers/:teacherId", catchAsync(removeTeacherFromCourse));

export default router;