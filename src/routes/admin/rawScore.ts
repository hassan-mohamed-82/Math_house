import { Router } from "express";
import { createRawScore, deleteRawScore, getAllRawScores, updateRawScore, getRawScorebyId } from "../../controllers/admin/rawScore";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.post("/", requirePermission("raw_scores", "Add"), catchAsync(createRawScore));
router.get("/", requirePermission("raw_scores", "View"), catchAsync(getAllRawScores));
router.get("/:id", requirePermission("raw_scores", "View"), catchAsync(getRawScorebyId))
router.put("/:id", requirePermission("raw_scores", "Edit"), catchAsync(updateRawScore));
router.delete("/:id", requirePermission("raw_scores", "Delete"), catchAsync(deleteRawScore));

export default router;
