import { Router } from "express";
import { login, impersonateStudent, switchBack } from "../../controllers/admin/auth";
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";

const router = Router()

router.post("/login", login)
router.post("/impersonate/:studentId", authenticated, authorizeRoles("superadmin", "admin"), impersonateStudent)
router.post("/switch-back", authenticated, switchBack)

export default router