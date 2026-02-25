import { Router } from "express";
import {
    createSection,
    getAllSections,
    getSectionById,
    updateSection,
    deleteSection
} from "../../controllers/admin/sections";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();
// No Authorization
router.get("/selectionSections", catchAsync(getAllSections));
//---------------------------
router.post("/", catchAsync(createSection));
router.get("/", catchAsync(getAllSections));
router.get("/:id", catchAsync(getSectionById));
router.put("/:id", catchAsync(updateSection));
router.delete("/:id", catchAsync(deleteSection));

export default router;
