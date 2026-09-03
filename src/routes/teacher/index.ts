import { Router } from "express";
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";
import authRouter from "./auth";
import sessionsRouter from "./sessions";

const router = Router();

// Public auth routes (login)
router.use("/auth", authRouter);

// All sessions routes require authentication as teacher
router.use(authenticated, authorizeRoles("teacher", "superadmin", "admin"));
router.use("/profile", authRouter);
router.use("/sessions", sessionsRouter);

export default router;
