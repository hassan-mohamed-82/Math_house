import { Router } from "express";
import { getIdeasByLessonId, getIdeaById } from "../../controllers/user/ideas";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/lesson/:lessonId", catchAsync(getIdeasByLessonId));
router.get("/:id", catchAsync(getIdeaById));

export default router;
