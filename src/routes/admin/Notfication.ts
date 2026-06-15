import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { upload } from "../../middlewares/multer";
import {
    selectOptions,
    searchParents,
    searchStudents,
    searchTeachers,
    createNotification,
    getAllNotifications,
    getNotificationById,
    updateNotification,
    deleteNotification
} from "../../controllers/admin/Notfication";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// Select options & search
router.get("/select-options", catchAsync(selectOptions));
router.get("/search/parents", requirePermission("notifications", "View"), catchAsync(searchParents));
router.get("/search/students", requirePermission("notifications", "View"), catchAsync(searchStudents));
router.get("/search/teachers", requirePermission("notifications", "View"), catchAsync(searchTeachers));

// CRUD
router.post("/", upload.single("materialFile"), requirePermission("notifications", "Add"), catchAsync(createNotification));
router.get("/", requirePermission("notifications", "View"), catchAsync(getAllNotifications));
router.get("/:id", requirePermission("notifications", "View"), catchAsync(getNotificationById));
router.put("/:id", upload.single("materialFile"), requirePermission("notifications", "Edit"), catchAsync(updateNotification));
router.delete("/:id", requirePermission("notifications", "Delete"), catchAsync(deleteNotification));

export default router;