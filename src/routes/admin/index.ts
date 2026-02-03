import { Router } from "express";
import authRouter from "./auth"
import orderRouter from "./order"
import ExchangeRateRouter from "./ExchangeRate"
import paymentMethodsRouter from "./payment_metods"
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";
const router = Router()


router.use("/auth", authRouter)
router.use( authenticated, authorizeRoles("admin"))
router.use("/exchangerate", ExchangeRateRouter)
router.use("/order", orderRouter)
router.use("/paymentmethods", paymentMethodsRouter)
export default router