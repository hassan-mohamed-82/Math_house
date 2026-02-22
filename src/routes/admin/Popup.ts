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

const router = Router();

// User-facing: get active popups by destination
router.get("/active", catchAsync(getActivePopups));

// Admin CRUD
router.post("/", catchAsync(createPopup));
router.get("/", catchAsync(getAllPopups));
router.get("/:id", catchAsync(getPopupById));
router.put("/:id", catchAsync(updatePopup));
router.delete("/:id", catchAsync(deletePopup));

export default router;
