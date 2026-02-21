import { Router } from "express";
import { createRawScore, deleteRawScore, getAllRawScores, updateRawScore, getRawScorebyId } from "../../controllers/admin/rawScore";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post("/", catchAsync(createRawScore));
router.get("/", catchAsync(getAllRawScores));
router.get("/:id", catchAsync(getRawScorebyId))
router.put("/:id", catchAsync(updateRawScore));
router.delete("/:id", catchAsync(deleteRawScore));

export default router;
