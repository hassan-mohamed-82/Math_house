import { Router } from "express";
import { getAllChapters, getAllChaptersByCourseId, getChapterById, getPurchasedChapters } from "../../controllers/user/chapters";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(getAllChapters));
router.get("/purchased", catchAsync(getPurchasedChapters));
router.get("/course/:courseId", catchAsync(getAllChaptersByCourseId));
router.get("/:id", catchAsync(getChapterById));

export default router;