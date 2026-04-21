import { Router } from "express";
import { getAllChapters, getChapterById } from "../../controllers/user/chapters";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(getAllChapters));
router.get("/:id", catchAsync(getChapterById));

export default router;