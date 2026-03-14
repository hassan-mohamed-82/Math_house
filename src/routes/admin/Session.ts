import { Router } from "express";
import {
    selectCategory,
    selectCourse,
    selectChapter,
    selectLesson,
    selectStudents,
    getAllSessions,
    getSessionById,
    createSession,
    updateSession,
    deleteSession,
} from "../../controllers/admin/Session";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/select/category", catchAsync(selectCategory));
router.get("/select/course/:categoryId", catchAsync(selectCourse));
router.get("/select/chapter/:courseId", catchAsync(selectChapter));
router.get("/select/lesson/:chapterId", catchAsync(selectLesson));
router.get("/select/students", catchAsync(selectStudents));

router.get("/", catchAsync(getAllSessions));
router.get("/:id", catchAsync(getSessionById));
router.post("/", catchAsync(createSession));
router.put("/:id", catchAsync(updateSession));
router.delete("/:id", catchAsync(deleteSession));

export default router;
