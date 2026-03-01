import {Router} from "express";
import studentauthRoutr  from "./studentauth";
import { authorizeRoles } from "../../middlewares/authorized";
import { authenticated } from "../../middlewares/authenticated";
const router=Router()
router.use("/auth",studentauthRoutr)
router.use(authenticated,authorizeRoles("student","parent","teacher","admin"))

export default router
