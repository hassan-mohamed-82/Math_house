import { Router } from "express";
import { createRawScore, deleteRawScore, getAllRawScores, updateRawScore } from "../../controllers/admin/rawScore";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post("/", catchAsync(createRawScore));
router.get("/", catchAsync(getAllRawScores));
router.put("/:id", catchAsync(updateRawScore));
router.delete("/:id", catchAsync(deleteRawScore));

export default router;
