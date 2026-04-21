import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getAllCategory, getCategoryById } from "../../controllers/user/category";
const router = Router();

router.get("/", catchAsync(getAllCategory));
router.get("/:id", catchAsync(getCategoryById));

export default router;