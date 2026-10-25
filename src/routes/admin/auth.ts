import { Router } from "express";
import { login, impersonateStudent, switchBack } from "../../controllers/admin/auth";
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router()

router.post("/login", login)
router.post("/impersonate/:studentId", authenticated, authorizeRoles("superadmin", "admin"), requirePermission("students", "Edit"), impersonateStudent)
router.post("/switch-back", authenticated, switchBack)

export default router