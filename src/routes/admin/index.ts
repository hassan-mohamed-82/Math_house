import { Router } from "express";
// import authRouter from "./auth"
// import adminRouter from "./admin"
import rolesRouter from "./roles"
import studentRouter from "./student"
import parentRouter from "./parent"
import categoryRouter from "./category"
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";
const router = Router()


router.use("/auth", authRouter)
router.use(authenticated, authorizeRoles("admin", "teacher"))
// router.use("/", adminRouter)
router.use("/roles", rolesRouter)
router.use("/category", categoryRouter)

export default router