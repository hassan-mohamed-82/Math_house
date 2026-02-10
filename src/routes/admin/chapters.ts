import { Router } from "express";
import {
    createChapter,
    getAllChapters,
    getAllChaptersByCourseId,
    swapChapterOrder,
    getChapterById,
    updateChapter,
    deleteChapter
} from "../../controllers/admin/chapters";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post("/", catchAsync(createChapter));
router.get("/", catchAsync(getAllChapters));
router.patch("/swap-order", catchAsync(swapChapterOrder));
router.get("/course/:courseId", catchAsync(getAllChaptersByCourseId));
router.put("/:id", catchAsync(updateChapter));
router.delete("/:id", catchAsync(deleteChapter));
router.get("/:id", catchAsync(getChapterById));
export default router;