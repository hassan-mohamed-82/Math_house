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
} from "../../controllers/admin/Session";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/select/category", catchAsync(selectCategory));
router.get("/select/sub-category", catchAsync(selectSubCategory));
router.get("/select/course/:categoryId", catchAsync(selectCourse));
router.get("/select/chapter/:courseId", catchAsync(selectChapter));
router.get("/select/lesson/:chapterId", catchAsync(selectLesson));
router.get("/select/students", catchAsync(selectStudents));
router.get("/select/teachers", catchAsync(selectTeachers));
router.get("/select/groups", catchAsync(selectGroups)); 

router.get("/", catchAsync(getAllSessions));
router.post("/", catchAsync(createSession));
router.get("/:id", catchAsync(getSessionById));
router.put("/:id", catchAsync(updateSession));
router.delete("/:id", catchAsync(deleteSession));

export default router;
