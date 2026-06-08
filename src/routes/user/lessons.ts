import { Router } from "express";
import { getLessonById, getLessonsByChapterId, getPurchasedLessons } from "../../controllers/user/lessons";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/purchased", catchAsync(getPurchasedLessons));
router.get("/chapter/:chapterId", catchAsync(getLessonsByChapterId));
router.get("/:id", catchAsync(getLessonById));

export default router;
