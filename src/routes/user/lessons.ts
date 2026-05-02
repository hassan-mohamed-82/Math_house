import { Router } from "express";
import { getLessonById, getLessonsByChapterId } from "../../controllers/user/lessons";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/chapter/:chapterId", catchAsync(getLessonsByChapterId));
router.get("/:id", catchAsync(getLessonById));

export default router;
