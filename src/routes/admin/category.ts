import { Router } from "express";
import { createCategory, deleteCategory, getAllCategory, getCategoryById, updateCategory } from "../../controllers/admin/category";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post("/", catchAsync(createCategory));
router.get("/", catchAsync(getAllCategory));

router.put("/:id", catchAsync(updateCategory));
router.delete("/:id", catchAsync(deleteCategory));
router.get("/:id", catchAsync(getCategoryById));

export default router;