import { Router } from "express";
import {
    selectCategory,
    selectSubCategory,
    selectCourse,
    selectChapter,
    selectLesson,
    selectStudents,
    selectTeachers,
    selectGroups,
    getAllSessions,
    getSessionById,
    createSession,
    updateSession,
    deleteSession,
    getStudentsCourseAttendance,
} from "../../controllers/admin/Session";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.get("/select/category", catchAsync(selectCategory));
router.get("/select/sub-category", catchAsync(selectSubCategory));
router.get("/select/course/:categoryId", catchAsync(selectCourse));
router.get("/select/chapter/:courseId", catchAsync(selectChapter));
router.get("/select/lesson/:chapterId", catchAsync(selectLesson));
router.get("/select/students", catchAsync(selectStudents));
router.get("/select/teachers", catchAsync(selectTeachers));
router.get("/select/groups", catchAsync(selectGroups)); 
router.get("/students-attendance",requirePermission("sessions", "View"), catchAsync(getStudentsCourseAttendance));

router.get("/", requirePermission("sessions", "View"), catchAsync(getAllSessions));
router.post("/", requirePermission("sessions", "Add"), catchAsync(createSession));
router.get("/:id", requirePermission("sessions", "View"), catchAsync(getSessionById));
router.put("/:id", requirePermission("sessions", "Edit"), catchAsync(updateSession));
router.delete("/:id", requirePermission("sessions", "Delete"), catchAsync(deleteSession));

export default router;
