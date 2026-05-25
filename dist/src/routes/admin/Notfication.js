"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const multer_1 = require("../../middlewares/multer");
const Notfication_1 = require("../../controllers/admin/Notfication");
const router = (0, express_1.Router)();
// Select options & search
router.get("/select-options", (0, catchAsync_1.catchAsync)(Notfication_1.selectOptions));
router.get("/search/parents", (0, catchAsync_1.catchAsync)(Notfication_1.searchParents));
router.get("/search/students", (0, catchAsync_1.catchAsync)(Notfication_1.searchStudents));
router.get("/search/teachers", (0, catchAsync_1.catchAsync)(Notfication_1.searchTeachers));
// CRUD
router.post("/", multer_1.upload.single("materialFile"), (0, catchAsync_1.catchAsync)(Notfication_1.createNotification));
router.get("/", (0, catchAsync_1.catchAsync)(Notfication_1.getAllNotifications));
router.get("/:id", (0, catchAsync_1.catchAsync)(Notfication_1.getNotificationById));
router.put("/:id", multer_1.upload.single("materialFile"), (0, catchAsync_1.catchAsync)(Notfication_1.updateNotification));
router.delete("/:id", (0, catchAsync_1.catchAsync)(Notfication_1.deleteNotification));
exports.default = router;
