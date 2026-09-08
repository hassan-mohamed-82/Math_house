import { Router } from "express";
import {
    createExtraHomework,
    getAllExtraHomework,
    getExtraHomeworkById,
    updateExtraHomework,
    deleteExtraHomework,
    assignStudentsToHomework,
    reviewStudentSubmission,
    getStudentExtraHomework,
} from "../../controllers/admin/ExtraHomework";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import {
    createExtraHomeworkSchema,
    updateExtraHomeworkSchema,
    assignStudentsSchema,
    reviewSubmissionSchema,
} from "../../validation/admin/extraHomework";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// ── List & Detail ─────────────────────────────────────────────────
router.get("/", requirePermission("extra_homework", "View"), catchAsync(getAllExtraHomework));
router.get("/student/:id", requirePermission("extra_homework", "View"), catchAsync(getStudentExtraHomework));
router.get("/:id", requirePermission("extra_homework", "View"), catchAsync(getExtraHomeworkById));

// ── Create ────────────────────────────────────────────────────────
router.post("/", validate(createExtraHomeworkSchema), requirePermission("extra_homework", "Add"), catchAsync(createExtraHomework));

// ── Update & Assign ───────────────────────────────────────────────
router.put("/:id", validate(updateExtraHomeworkSchema), requirePermission("extra_homework", "Edit"), catchAsync(updateExtraHomework));
router.post("/:id/assign", validate(assignStudentsSchema), requirePermission("extra_homework", "Edit"), catchAsync(assignStudentsToHomework));

// ── Grade / Review Submission ─────────────────────────────────────
router.put("/:id/submissions/:submissionId/review", validate(reviewSubmissionSchema), requirePermission("extra_homework", "Edit"), catchAsync(reviewStudentSubmission));

// ── Delete ────────────────────────────────────────────────────────
router.delete("/:id", requirePermission("extra_homework", "Delete"), catchAsync(deleteExtraHomework));

export default router;
