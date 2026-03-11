import { Router } from "express";
import studentauthRoutr from "./studentauth";
import profileRouter from "./profile";
import walletRouter from "./wallet";
import paymentRouter from "./payment";
import attendsRouter from "./Attends";
import packagesRouter from "./packages";
import diagnosticExamRouter from "./diagnosticExams";
import { authorizeRoles } from "../../middlewares/authorized";
import { authenticated } from "../../middlewares/authenticated";
const router = Router()
router.use("/auth", studentauthRoutr)
router.use(authenticated, authorizeRoles("student"))
router.use("/profile", profileRouter)
router.use("/wallet", walletRouter)
router.use("/payment", paymentRouter)
router.use("/sessions", attendsRouter)
router.use("/packages", packagesRouter)
router.use("/diagnostic-exams", diagnosticExamRouter)
export default router
