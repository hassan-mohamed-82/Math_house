import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
    createPopup,
    getAllPopups,
    getPopupById,
    updatePopup,
    deletePopup,
    getActivePopups
} from "../../controllers/admin/Popup";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// User-facing: get active popups by destination
router.get("/active", catchAsync(getActivePopups));

// Admin CRUD
router.post("/", requirePermission("popups", "Add"), catchAsync(createPopup));
router.get("/", requirePermission("popups", "View"), catchAsync(getAllPopups));
router.get("/:id", requirePermission("popups", "View"), catchAsync(getPopupById));
router.put("/:id", requirePermission("popups", "Edit"), catchAsync(updatePopup));
router.delete("/:id", requirePermission("popups", "Delete"), catchAsync(deletePopup));

export default router;
