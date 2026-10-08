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
    getStudentsCourseAttendance,
    getAllSessions,
    getSessionById,
    regenerateMistakesSessionPdfs,
    createSession,
    updateSession,
    deleteSession,
    upsertSessionStudentPdfs,
    deleteSessionStudentPdf,
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
router.post("/students/attendance", requirePermission("sessions", "View"), catchAsync(getStudentsCourseAttendance));

router.get("/", requirePermission("sessions", "View"), catchAsync(getAllSessions));
router.post("/", requirePermission("sessions", "Add"), catchAsync(createSession));
router.get("/:id", requirePermission("sessions", "View"), catchAsync(getSessionById));
router.post("/:id/generate-mistakes", requirePermission("sessions", "Edit"), catchAsync(regenerateMistakesSessionPdfs));
router.put("/:id", requirePermission("sessions", "Edit"), catchAsync(updateSession));
router.delete("/:id", requirePermission("sessions", "Delete"), catchAsync(deleteSession));

// ── Mistakes-session PDFs ─────────────────────────────────────────────────────
// POST   /admin/sessions/:id/student-pdfs             — generate one combined PDF pair
router.post("/:id/student-pdfs", requirePermission("sessions", "Edit"), catchAsync(upsertSessionStudentPdfs));
// DELETE /admin/sessions/:id/student-pdfs/:studentId  — remove a student's PDF row
router.delete("/:id/student-pdfs/:studentId", requirePermission("sessions", "Edit"), catchAsync(deleteSessionStudentPdf));

export default router;
