"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../controllers/teacher/auth");
const catchAsync_1 = require("../../utils/catchAsync");
const authenticated_1 = require("../../middlewares/authenticated");
const authorized_1 = require("../../middlewares/authorized");
const router = (0, express_1.Router)();
router.post("/login", (0, catchAsync_1.catchAsync)(auth_1.teacherLogin));
// Protected
router.get("/", authenticated_1.authenticated, (0, authorized_1.authorizeRoles)("teacher", "superadmin", "admin"), (0, catchAsync_1.catchAsync)(auth_1.getTeacherProfile));
exports.default = router;
