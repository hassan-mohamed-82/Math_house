import { Router } from "express";
import {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    addTeacherToCourse,
    removeTeacherFromCourse,
    getCourseTeachers,
    getCategoriesSelection,
    getCoursesbyCategoryId,
    selectionCourses
} from "../../controllers/admin/courses";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// ── Selection helpers (open to any authenticated admin — used in dropdowns) ──
router.get("/categories", catchAsync(getCategoriesSelection));
router.get("/selection",  catchAsync(selectionCourses));

// ── List & detail ─────────────────────────────────────────────────────────
router.get("/",                         requirePermission("courses", "View"),   catchAsync(getAllCourses));
router.get("/category/:categoryId",     requirePermission("courses", "View"),   catchAsync(getCoursesbyCategoryId));
router.get("/:id",                      requirePermission("courses", "View"),   catchAsync(getCourseById));
router.get("/:id/teachers",             requirePermission("courses", "View"),   catchAsync(getCourseTeachers));

// ── Create ────────────────────────────────────────────────────────────────
router.post("/",                        requirePermission("courses", "Add"),    catchAsync(createCourse));
router.post("/:id/teachers",            requirePermission("courses", "Edit"),   catchAsync(addTeacherToCourse));

// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id",                      requirePermission("courses", "Edit"),   catchAsync(updateCourse));

// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id",                   requirePermission("courses", "Delete"), catchAsync(deleteCourse));
router.delete("/:id/teachers/:teacherId", requirePermission("courses", "Edit"),catchAsync(removeTeacherFromCourse));

export default router;