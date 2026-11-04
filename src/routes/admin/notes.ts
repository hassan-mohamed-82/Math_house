import { Router } from "express";
import {
    getStudentNotes,
    createStudentNote,
    updateStudentNote,
    deleteStudentNote,
} from "../../controllers/admin/notes";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// GET    /admin/notes/:studentId              — list all notes for a student
router.get("/:studentId", requirePermission("students", "View"), catchAsync(getStudentNotes));

// POST   /admin/notes/:studentId              — create a new note for a student
router.post("/:studentId", requirePermission("students", "Edit"), catchAsync(createStudentNote));

// PUT    /admin/notes/:studentId/:noteId      — update a specific note
router.put("/:studentId/:noteId", requirePermission("students", "Edit"), catchAsync(updateStudentNote));

// DELETE /admin/notes/:studentId/:noteId      — delete a specific note
router.delete("/:studentId/:noteId", requirePermission("students", "Delete"), catchAsync(deleteStudentNote));

export default router;

