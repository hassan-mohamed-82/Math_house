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

const router = Router();

// Select options & search
router.get("/select-options", catchAsync(selectOptions));
router.get("/search/parents", catchAsync(searchParents));
router.get("/search/students", catchAsync(searchStudents));
router.get("/search/teachers", catchAsync(searchTeachers));

// CRUD
router.post("/", upload.single("materialFile"), catchAsync(createNotification));
router.get("/", catchAsync(getAllNotifications));
router.get("/:id", catchAsync(getNotificationById));
router.put("/:id", upload.single("materialFile"), catchAsync(updateNotification));
router.delete("/:id", catchAsync(deleteNotification));

export default router;