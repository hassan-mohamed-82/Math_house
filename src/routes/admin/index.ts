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
import lessonsRouter from "./lessons"
import questionsRouter from "./questions"
import examCodesRouter from "./examCodes"
import adminRouter from "./admin"
import quizRouter from "./Quiz"
import rawScoreRouter from "./rawScore"
import diagnosticExamRouter from "./diagnosticExam"
import groupsRouter from "./Groups"
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
router.use("/admin", adminRouter)
router.use("/teacher", teacherRouter)
router.use("/courses", courseRouter)
router.use("/quiz", quizRouter)
router.use("/semester", semesterRouter)
router.use("/groups", groupsRouter)
router.use("/chapters", chaptersRouter)
router.use("/lessons", lessonsRouter)
router.use("/questions", questionsRouter)
router.use("/examCodes", examCodesRouter)
router.use("/examCodes", examCodesRouter)
router.use("/rawScore", rawScoreRouter)
router.use("/diagnosticExam", diagnosticExamRouter)
export default router