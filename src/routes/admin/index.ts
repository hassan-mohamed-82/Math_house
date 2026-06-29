import { Router } from "express";
// import authRouter from "./auth"
// import adminRouter from "./admin"
import rolesRouter from "./roles"
import studentRouter from "./student"
import parentRouter from "./parent"
import categoryRouter from "./category"
import teacherRouter from "./teacher"
import popupRouter from "./Popup"
import courseRouter from "./courses"
import semesterRouter from "./semester"
import chaptersRouter from "./chapters"
import lessonsRouter from "./lessons"
import questionsRouter from "./questions"
import examCodesRouter from "./examCodes"
import adminRouter from "./admin"
import quizRouter from "./Quiz"
import notificationRouter from "./Notfication"
import sessionRouter from "./Session"
import rawScoreRouter from "./rawScore"
import packageRouter from "./Package"
import diagnosticExamRouter from "./diagnosticExam"
import groupsRouter from "./Groups"
import sectionsRouter from "./sections"
import examsRouter from "./exams"
import currencyRouter from "./currency"
import promoCodesRouter from "./promoCodes"
import paymentMethodRouter from "./paymentMethod"
import paymentRouter from "./payment"
import gradeRouter from "./grade"
import reportsRouter from "./reports"
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";
import authRouter from "./auth"
import selectionRouter from "./generalSelection"
import { catchAsync } from "../../utils/catchAsync";
const router = Router()

router.use("/auth", authRouter)
router.use(authenticated, authorizeRoles("admin", "teacher"))
// router.use("/", adminRouter)
router.use("/grade", gradeRouter)
router.use("/category", categoryRouter)
router.use("/roles", rolesRouter)
router.use("/session", sessionRouter)
router.use("/package", packageRouter)
router.use("/student", studentRouter)
router.use("/parent", parentRouter)
router.use("/admin", adminRouter)
router.use("/notification", notificationRouter)
router.use("/teacher", teacherRouter)
router.use("/courses", courseRouter)
router.use("/quiz", quizRouter)
router.use("/popup", popupRouter)
router.use("/semester", semesterRouter)
router.use("/groups", groupsRouter)
router.use("/chapters", chaptersRouter)
router.use("/lessons", lessonsRouter)
router.use("/questions", questionsRouter)
router.use("/examCodes", examCodesRouter)
router.use("/rawScore", rawScoreRouter)
router.use("/diagnosticExam", diagnosticExamRouter)
router.use("/sections", sectionsRouter)
router.use("/exams", examsRouter)
router.use("/currency", currencyRouter)
router.use("/promoCodes", promoCodesRouter)
router.use("/paymentMethod", paymentMethodRouter)
router.use("/payment", paymentRouter)
router.use("/reports", reportsRouter)

router.use("/selection", selectionRouter)
export default router