import { Router } from "express";
import studentauthRoutr from "./studentauth";
import profileRouter from "./profile";
import walletRouter from "./wallet";
import paymentRouter from "./payment";
import attendsRouter from "./Attends";
import packagesRouter from "./packages";
import examsRouter from "./exams";
import dashboardRouter from "./dashboard";
import diagnosticExamRouter from "./diagnosticExams";
import quizzesRouters from "./Quizzes";
import coursesRouter from "./courses";
import categoryRouter from "./category";
import chaptersRouter from "./chapters";
import enrollmentRouter from "./enrollmant";
import { authorizeRoles } from "../../middlewares/authorized";
import { authenticated } from "../../middlewares/authenticated";
const router = Router()
router.use("/auth", studentauthRoutr)
router.use(authenticated, authorizeRoles("student"))
router.use("/dashboard", dashboardRouter)
router.use("/profile", profileRouter)
router.use("/wallet", walletRouter)
router.use("/payment", paymentRouter)
router.use("/sessions", attendsRouter)
router.use("/packages", packagesRouter)
router.use("/exams", examsRouter)
router.use("/diagnostic-exams", diagnosticExamRouter)
router.use("/quizzes", quizzesRouters)
router.use("/category", categoryRouter)
router.use("/courses", coursesRouter)
router.use("/enrollment", enrollmentRouter)
router.use("/chapters", chaptersRouter)
export default router
