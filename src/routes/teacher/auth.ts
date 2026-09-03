import { Router } from "express";
import { teacherLogin, getTeacherProfile } from "../../controllers/teacher/auth";
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";

const router = Router();

router.post("/login", catchAsync(teacherLogin));

// Protected
router.get("/", authenticated, authorizeRoles("teacher", "superadmin", "admin"), catchAsync(getTeacherProfile));

export default router;
