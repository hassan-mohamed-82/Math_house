import { Router } from "express";
import {
    getAllRatingQuestions,
    getRatingQuestionById,
    createRatingQuestion,
    updateRatingQuestion,
    toggleRatingQuestionStatus,
    deleteRatingQuestion,
} from "../../controllers/admin/SessionRatingQuestions";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createRatingQuestionSchema, updateRatingQuestionSchema } from "../../validation/admin/sessionRating";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// List & Detail
router.get("/", requirePermission("session_rating_questions", "View"), catchAsync(getAllRatingQuestions));
router.get("/:id", requirePermission("session_rating_questions", "View"), catchAsync(getRatingQuestionById));

// Create
router.post("/", validate(createRatingQuestionSchema), requirePermission("session_rating_questions", "Add"), catchAsync(createRatingQuestion));

// Update & Toggle
router.put("/:id", validate(updateRatingQuestionSchema), requirePermission("session_rating_questions", "Edit"), catchAsync(updateRatingQuestion));
router.put("/:id/toggle", requirePermission("session_rating_questions", "Status"), catchAsync(toggleRatingQuestionStatus));

// Delete
router.delete("/:id", requirePermission("session_rating_questions", "Delete"), catchAsync(deleteRatingQuestion));

export default router;
