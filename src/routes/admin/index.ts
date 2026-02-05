import { Router } from "express";
// import authRouter from "./auth"
// import adminRouter from "./admin"
import rolesRouter from "./roles"
import studentRouter from "./student"
import parentRouter from "./parent"
import categoryRouter from "./category"
import teacherRouter from "./teacher"
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";
const router = Router()


// router.use("/auth", authRouter)

router.use("/category", categoryRouter)
// router.use(authenticated, authorizeRoles("admin", "teacher"))
// router.use("/", adminRouter)
router.use("/roles", rolesRouter)
router.use("/student", studentRouter)
router.use("/parent", parentRouter)
router.use("/teacher", teacherRouter)

export default router