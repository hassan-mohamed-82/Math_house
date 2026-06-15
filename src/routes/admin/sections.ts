import { Router } from "express";
import {
    createSection,
    getAllSections,
    getSectionById,
    updateSection,
    deleteSection
} from "../../controllers/admin/sections";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();
// No Authorization
router.get("/selectionSections", catchAsync(getAllSections));
//---------------------------
router.post("/", requirePermission("sections", "Add"), catchAsync(createSection));
router.get("/", requirePermission("sections", "View"), catchAsync(getAllSections));
router.get("/:id", requirePermission("sections", "View"), catchAsync(getSectionById));
router.put("/:id", requirePermission("sections", "Edit"), catchAsync(updateSection));
router.delete("/:id", requirePermission("sections", "Delete"), catchAsync(deleteSection));

export default router;
