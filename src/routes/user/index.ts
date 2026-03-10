import {Router} from "express";
import studentauthRoutr  from "./studentauth";
import profileRouter from "./profile";
import walletRouter from "./wallet";
import paymentRouter from "./payment";
import attendsRouter from "./Attends";
import { authorizeRoles } from "../../middlewares/authorized";
import { authenticated } from "../../middlewares/authenticated";
const router=Router()
router.use("/auth",studentauthRoutr)
router.use(authenticated,authorizeRoles("student","parent","teacher","admin"))
router.use("/profile", profileRouter)
router.use("/wallet", walletRouter)
router.use("/payment", paymentRouter)
router.use("/sessions", attendsRouter)
export default router
