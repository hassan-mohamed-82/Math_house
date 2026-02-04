import { Router } from "express";
import authRouter from "./auth"
import adminRouter from "./admin"
import rolesRouter from "./roles"
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";
const router = Router()


router.use("/auth", authRouter)
router.use(authenticated, authorizeRoles("admin", "teacher"))
router.use("/", adminRouter)
router.use("/roles", rolesRouter)

export default router