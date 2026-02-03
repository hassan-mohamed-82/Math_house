import { Router } from "express";
import authRouter from "./auth"

import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";
const router = Router()


router.use("/auth", authRouter)
// router.use( authenticated, authorizeRoles("admin"))
export default router