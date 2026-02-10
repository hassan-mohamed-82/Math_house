import { Router } from "express";
// import authRouter from "./auth"
// import adminRouter from "./admin"
import rolesRouter from "./roles"
import studentRouter from "./student"
import parentRouter from "./parent"
import categoryRouter from "./category"
import teacherRouter from "./teacher"
import courseRouter from "./courses"
import semesterRouter from "./semester"
import chaptersRouter from "./chapters"
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";
import authRouter from "./auth"
import { catchAsync } from "../../utils/catchAsync";
const router = Router()

router.use("/auth", authRouter)
router.use(authenticated, authorizeRoles("admin", "teacher"))
// router.use("/", adminRouter)
router.use("/category", categoryRouter)
router.use("/roles", rolesRouter)
router.use("/student", studentRouter)
router.use("/parent", parentRouter)
router.use("/teacher", teacherRouter)
router.use("/courses", courseRouter)
router.use("/semester", semesterRouter)
router.use("/chapters", chaptersRouter)
export default router